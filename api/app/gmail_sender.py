"""Authorize a local candidate's Gmail account for sending application emails."""
import base64
import hashlib
import os
import secrets
from dataclasses import dataclass, field
from email.message import EmailMessage
from pathlib import Path
from threading import Lock
from time import monotonic
from urllib.parse import urlencode

from httpx import Client, HTTPError

from app.models import ApplicationEmail
from app.resume_models import ResumeContact

AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
REDIRECT_URI = "http://127.0.0.1:8000/api/v1/gmail/callback"
RESUME_SUBTYPES = {
    ".pdf": "pdf",
    ".docx": "vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class GmailUnavailable(ValueError):
    """Gmail setup or authorization is missing or invalid."""


def client_config() -> tuple[str, str] | None:
    client_id = os.getenv("GETSWYDD_GOOGLE_OAUTH_CLIENT_ID", "").strip()
    secret = os.getenv("GETSWYDD_GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    return (client_id, secret) if client_id and secret else None


@dataclass(frozen=True)
class GmailAccount:
    email: str
    token: str = field(repr=False)
    expires_at: float


@dataclass(frozen=True)
class PendingAuthorization:
    state: str
    verifier: str = field(repr=False)
    return_url: str
    expires_at: float


class GmailSession:
    def __init__(self) -> None:
        self._lock = Lock()
        self._pending: PendingAuthorization | None = None
        self._account: GmailAccount | None = None

    def account(self) -> GmailAccount | None:
        with self._lock:
            if self._account and self._account.expires_at <= monotonic() + 30:
                self._account = None
            return self._account

    def disconnect(self) -> None:
        with self._lock:
            self._account = self._pending = None

    def begin(self, return_url: str) -> str:
        config = client_config()
        if config is None:
            raise GmailUnavailable("Configure your Google OAuth client in the local API first.")
        state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        with self._lock:
            self._pending = PendingAuthorization(state, verifier, return_url, monotonic() + 600)
        return AUTHORIZATION_URL + "?" + urlencode({
            "client_id": config[0], "redirect_uri": REDIRECT_URI, "response_type": "code",
            "state": state, "scope": f"openid email {SEND_SCOPE}", "access_type": "online",
            "prompt": "select_account", "code_challenge": challenge, "code_challenge_method": "S256",
        })

    def complete(self, state: str, code: str | None) -> tuple[str, bool]:
        with self._lock:
            pending = self._pending
            if not pending or not secrets.compare_digest(state.encode(), pending.state.encode()) or monotonic() >= pending.expires_at:
                raise GmailUnavailable("Gmail connection expired. Open the draft and connect again.")
            self._pending = None
            config = client_config()
            if not code or config is None:
                return pending.return_url, False
            try:
                self._account = _exchange(code, pending.verifier, config)
            except (HTTPError, ValueError, KeyError, AttributeError, TypeError):
                return pending.return_url, False
            return pending.return_url, True


def _exchange(code: str, verifier: str, config: tuple[str, str]) -> GmailAccount:
    with Client(timeout=10, follow_redirects=False) as client:
        token_response = client.post(TOKEN_URL, data={
            "grant_type": "authorization_code", "code": code, "client_id": config[0],
            "client_secret": config[1], "redirect_uri": REDIRECT_URI, "code_verifier": verifier,
        })
        token_response.raise_for_status()
        token = token_response.json()
        if SEND_SCOPE not in token["scope"].split():
            raise GmailUnavailable("Gmail send permission is required.")
        authorization = {"Authorization": f"Bearer {token['access_token']}"}
        profile_response = client.get(USERINFO_URL, headers=authorization)
        profile_response.raise_for_status()
        profile = profile_response.json()
        if profile["email_verified"] is not True:
            raise GmailUnavailable("Confirm your email address with Google first.")
        address = ResumeContact(email=profile["email"]).email
        if address is None:
            raise GmailUnavailable("Google did not return a verified email address.")
        return GmailAccount(address, token["access_token"], monotonic() + int(token["expires_in"]))


def send_application(
    account: GmailAccount, application: ApplicationEmail, name: str, attachment: bytes,
) -> tuple[str, str | None]:
    message = EmailMessage()
    message["To"] = application.recipient
    message["From"] = account.email
    message["Subject"] = application.subject
    message.set_content(application.body)
    message.add_attachment(attachment, maintype="application", subtype=RESUME_SUBTYPES[Path(name).suffix.lower()], filename=name)
    try:
        with Client(timeout=20, follow_redirects=False) as client:
            response = client.post(
                SEND_URL,
                headers={"Authorization": f"Bearer {account.token}"},
                json={"raw": base64.urlsafe_b64encode(message.as_bytes()).decode()},
            )
    except HTTPError:
        return "uncertain", None
    if response.is_success:
        try:
            message_id = response.json()["id"]
        except (ValueError, KeyError, TypeError):
            return "uncertain", None
        if isinstance(message_id, str) and message_id:
            return "submitted", message_id
    if response.status_code in {400, 401, 403, 413, 429}:
        return "rejected", None
    return "uncertain", None
