import json
from base64 import urlsafe_b64decode
from email import policy
from email.parser import BytesParser
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from fastapi.testclient import TestClient

from app import gmail_sender, main
from app.matching import match_jobs
from app.models import Job
from app.resume_models import ApplicationDetails, ConfirmedProfile, ResumeFacts, ResumeReview
from app.resume_store import confirm_resume, save_application_details, store_resume

OFFER = "How to apply\n\nEmail your résumé to hiring@example.test."
SENDER = "candidate@gmail.test"
DRAFTS = "/api/v1/applications/drafts"


@pytest.fixture
def integration(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "applications.db"))
    monkeypatch.setenv("GETSWYDD_GOOGLE_OAUTH_CLIENT_ID", "test-client")
    monkeypatch.setenv("GETSWYDD_GOOGLE_OAUTH_CLIENT_SECRET", "test-secret")
    job = Job(
        id="ashby:example:1234", title="Software Intern", company="Example",
        location="Bengaluru", description=OFFER, application_mode="assisted", source="ashby",
        apply_url="https://jobs.ashbyhq.com/example/1234",
    )
    monkeypatch.setattr(main, "_lookup_job", lambda job_id: job if job_id == job.id else None)
    network = []
    reply = {}

    def mock(request):
        network.append(request)
        if str(request.url) == gmail_sender.TOKEN_URL:
            return httpx.Response(200, json={
                "scope": gmail_sender.SEND_SCOPE, "access_token": "test-token", "expires_in": 3600,
            })
        if str(request.url) == gmail_sender.USERINFO_URL:
            assert request.headers["Authorization"] == "Bearer test-token"
            return httpx.Response(200, json={"email": SENDER, "email_verified": True})
        assert str(request.url) == gmail_sender.SEND_URL
        if reply.get("timeout"):
            raise httpx.ReadTimeout("timeout", request=request)
        return httpx.Response(200, json={"id": "gmail-receipt"})

    monkeypatch.setattr(gmail_sender, "Client", lambda **opts: httpx.Client(
        transport=httpx.MockTransport(mock), **opts,
    ))
    with TestClient(main.app, base_url="http://127.0.0.1:8000", client=("127.0.0.1", 50000)) as client:
        facts = ResumeFacts(skills=["Python"])
        resume = store_resume("Candidate.pdf", b"exact reviewed attachment", "Python", facts)
        confirm_resume(resume.id, ResumeReview(revision=0, facts=facts))
        save_application_details(ApplicationDetails(candidate_name="Alex Example"))
        yield client, job, resume.id, network, reply


def draft(client, job, resume_id):
    response = client.post(DRAFTS, json={"job_id": job.id, "resume_id": resume_id})
    assert response.status_code == 201, response.text
    return response.json()


def connect(client, app_draft):
    response = client.post(f"{DRAFTS}/{app_draft['id']}/gmail-authorization")
    assert response.status_code == 200, response.text
    params = parse_qs(urlsplit(response.json()["authorization_url"]).query)
    assert params["code_challenge_method"] == ["S256"]
    assert params["redirect_uri"] == [gmail_sender.REDIRECT_URI]
    assert params["scope"] == [f"openid email {gmail_sender.SEND_SCOPE}"]
    return params["state"][0]


def approve(client, app_draft, **overrides):
    payload = {"approved": True, "draft_updated_at": app_draft["updated_at"], "sender": SENDER}
    return client.post(
        f"{DRAFTS}/{app_draft['id']}/email-submission",
        json={**payload, **overrides},
    )


def complete(client, state):
    return client.get("/api/v1/gmail/callback", params={"state": state, "code": "fixture-code"}, follow_redirects=False)


def test_approved_email_sends_exact_preview_and_attachment_once(integration):
    client, job, resume_id, network, _ = integration
    first = draft(client, job, resume_id)
    preview = first["application_email"]
    assert preview["recipient"] == "hiring@example.test"
    assert network == []
    assert approve(client, first).status_code == 409
    state = connect(client, first)
    assert complete(client, "bad").status_code == 400
    assert complete(client, state).headers["location"].endswith("?gmail=connected")
    assert complete(client, state).status_code == 400
    assert client.get("/api/v1/gmail").json() == {"configured": True, "email": SENDER}
    assert approve(client, first, approved=False).status_code == 422
    assert approve(client, first, sender="other@example.test").status_code == 409
    assert approve(client, first, draft_updated_at="old version").status_code == 409
    result = approve(client, first)
    assert result.status_code == 200, result.text
    updated = result.json()
    assert updated["employer_submission_status"] == "submitted"
    assert updated["employer_receipt_id"] == "gmail-receipt"
    assert updated["employer_submission_source"] == "gmail"
    assert approve(client, first).json() == updated
    assert approve(client, draft(client, job, resume_id)).status_code == 409
    token, profile, sent = network
    assert "code_verifier=" in token.content.decode()
    message = BytesParser(policy=policy.default).parsebytes(urlsafe_b64decode(json.loads(sent.content)["raw"]))
    assert str(message["To"]) == preview["recipient"]
    assert str(message["From"]) == SENDER
    assert str(message["Subject"]) == preview["subject"]
    assert message.get_body(preferencelist=("plain",)).get_content().rstrip() == preview["body"]
    attachment, = message.iter_attachments()
    assert attachment.get_filename() == "Candidate.pdf"
    assert attachment.get_payload(decode=True) == b"exact reviewed attachment"
    assert any(row["status_source"] == "gmail" for row in client.get("/api/v1/applications/assisted").json())


def test_unrelated_address_and_changed_offer_cannot_send(integration):
    client, job, resume_id, network, _ = integration
    profile = ConfirmedProfile(facts=[])
    assert match_jobs([job], profile)[0].email_application_available
    job.description = "For help or accessibility contact support@example.test."
    assert not match_jobs([job], profile)[0].email_application_available
    assert draft(client, job, resume_id)["application_email"] is None
    job.description = OFFER
    first = draft(client, job, resume_id)
    assert complete(client, connect(client, first)).status_code == 303
    job.description = OFFER.replace("hiring@", "new@")
    assert approve(client, first).status_code == 409
    assert len(network) == 2


def test_timeout_keeps_email_unconfirmed_and_blocks_duplicate(integration):
    client, job, resume_id, network, reply = integration
    first = draft(client, job, resume_id)
    assert complete(client, connect(client, first)).status_code == 303
    reply["timeout"] = True
    result = approve(client, first).json()
    assert result["employer_submission_status"] == "uncertain"
    assert approve(client, first).json() == result
    assert approve(client, draft(client, job, resume_id)).status_code == 409
    assert len(network) == 3
    assert any(row["status"] == "unconfirmed" and row["status_source"] == "gmail"
               for row in client.get("/api/v1/applications/assisted").json())
