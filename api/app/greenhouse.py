"""Read and cache postings from configured public Greenhouse boards."""
import json
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from html import unescape
from html.parser import HTMLParser
from threading import Lock
from typing import Literal
from urllib.parse import urlsplit

from httpx import Client, HTTPError, HTTPStatusError
from pydantic import BaseModel, Field, TypeAdapter

from app.db import get_db_path
from app.models import Job, ScreeningQuestionAnswer

BOARD_API = "https://boards-api.greenhouse.io/v1/boards"
REFRESH_INTERVAL = timedelta(minutes=5)
MAX_RESPONSE_BYTES = 8 * 1024 * 1024
REFRESH_LOCK = Lock()
JOB_LIST = TypeAdapter(list[Job])


class BoardConfigError(ValueError):
    """The server allowlist contains an invalid board configuration."""


def configured_boards() -> dict[str, str]:
    try:
        boards = json.loads(os.getenv("GETSWYDD_GREENHOUSE_BOARDS", "{}"))
    except ValueError as error:
        raise BoardConfigError("GETSWYDD_GREENHOUSE_BOARDS must be a JSON object.") from error

    if not isinstance(boards, dict) or len(boards) > 5:
        raise BoardConfigError("Configure up to five Greenhouse board tokens and company names.")
    for token, company in boards.items():
        if not re.fullmatch(r"[a-z0-9_-]{1,80}", token) or not isinstance(company, str) or not company.strip():
            raise BoardConfigError("Each Greenhouse board needs a valid token and company name.")
    return {token: company.strip() for token, company in boards.items()}


class DescriptionText(HTMLParser):
    breaks = {"p", "br", "li", "ul", "ol", "div", "h1", "h2", "h3", "h4", "tr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden = tag
        if tag in self.breaks and not self.hidden:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == self.hidden:
            self.hidden = None
        if tag in self.breaks and not self.hidden:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

    def text(self) -> str:
        return "\n".join(" ".join(line.split()) for line in "".join(self.parts).splitlines() if line.strip())


class Location(BaseModel):
    name: str


class GreenhousePosting(BaseModel):
    id: int
    title: str
    absolute_url: str
    location: Location
    content: str | None = None
    updated_at: str | None = None


class GreenhouseFeed(BaseModel):
    jobs: list[GreenhousePosting]


def official_apply_url(value: str) -> str:
    url = urlsplit(value)
    if (
        url.scheme != "https" or not url.hostname or url.username is not None
        or url.port not in (None, 443) or "\\" in value
        or any(character.isspace() or ord(character) < 32 for character in value)
    ):
        raise ValueError("The provider returned an invalid application URL.")
    return value


class FeedTooLarge(ValueError):
    """Greenhouse returned more data than this import can store."""


def _download_json(client: Client, path: str, params: dict[str, str]) -> bytearray:
    data = bytearray()
    with client.stream("GET", f"{BOARD_API}/{path}", params=params) as response:
        response.raise_for_status()
        length = response.headers.get("Content-Length", "")
        if length.isdecimal() and int(length) > MAX_RESPONSE_BYTES:
            raise FeedTooLarge("The job feed exceeds the supported response size.")
        for chunk in response.iter_bytes():
            data.extend(chunk)
            if len(data) > MAX_RESPONSE_BYTES:
                raise FeedTooLarge("The job feed exceeds the supported response size.")
    return data


def fetch_board(client: Client, token: str, company: str) -> list[Job]:
    try:
        data = _download_json(client, f"{token}/jobs", {"content": "true"})
    except FeedTooLarge:
        data = _download_json(client, f"{token}/jobs", {})
    feed = GreenhouseFeed.model_validate_json(data)
    jobs: dict[str, Job] = {}
    for posting in feed.jobs:
        parser = DescriptionText()
        parser.feed(unescape(posting.content or ""))
        parser.close()
        job = Job(
            id=f"greenhouse:{token}:{posting.id}",
            title=posting.title.strip(),
            company=company,
            location=posting.location.name.strip() or "Location not listed",
            description=parser.text()[:30_000] or None,
            source="greenhouse",
            application_mode="assisted",
            apply_url=official_apply_url(posting.absolute_url),
            source_updated_at=posting.updated_at,
        )
        jobs[job.id] = job
    return list(jobs.values())


class BoardRefresh(BaseModel):
    board: str
    status: Literal["refreshed", "cached", "failed"]
    count: int


def _read_cache(conn: sqlite3.Connection, token: str) -> tuple[datetime | None, list[Job]]:
    row = conn.execute(
        "SELECT fetched_at, jobs_json FROM greenhouse_boards WHERE token = ?", (token,)
    ).fetchone()
    if row is None:
        return None, []
    timestamp, data = row
    return datetime.fromisoformat(timestamp), JOB_LIST.validate_json(data)


def imported_jobs(boards: dict[str, str]) -> list[Job]:
    jobs = []
    with closing(sqlite3.connect(get_db_path())) as conn:
        for token, company in boards.items():
            fetched_at, cached = _read_cache(conn, token)
            if fetched_at:
                jobs.extend(job.model_copy(update={
                    "company": company, "source_fetched_at": fetched_at.isoformat(),
                }) for job in cached)
    return jobs


def find_imported_job(job_id: str, boards: dict[str, str]) -> Job | None:
    parts = job_id.split(":")
    if len(parts) != 3 or parts[0] != "greenhouse" or parts[1] not in boards:
        return None
    _, token, _ = parts
    with closing(sqlite3.connect(get_db_path())) as conn:
        _, jobs = _read_cache(conn, token)
        for job in jobs:
            if job.id == job_id:
                return job.model_copy(update={"company": boards[token]})
    return None


class FormChoice(BaseModel):
    label: str


class FormField(BaseModel):
    name: str
    type: str
    values: list[FormChoice] = Field(default_factory=list)


class FormQuestion(BaseModel):
    label: str
    required: bool
    fields: list[FormField]


class GreenhouseForm(BaseModel):
    id: int
    questions: list[FormQuestion]


class AssistedForm(BaseModel):
    status: Literal["loaded", "partial", "unavailable"]
    questions: list[ScreeningQuestionAnswer] = Field(default_factory=list)


class PostingClosed(ValueError):
    """The job provider no longer lists the selected job."""


def fetch_assisted_form(job: Job) -> AssistedForm:
    _, token, posting_id = job.id.split(":")
    try:
        with Client(timeout=8, follow_redirects=False) as client:
            data = _download_json(client, f"{token}/jobs/{int(posting_id)}", {"questions": "true"})
        form = GreenhouseForm.model_validate_json(data)
    except HTTPStatusError as error:
        if error.response.status_code in {404, 410}:
            raise PostingClosed("This employer posting is no longer available. Refresh the job listings.") from error
        return AssistedForm(status="unavailable")
    except (HTTPError, ValueError):
        return AssistedForm(status="unavailable")
    if form.id != int(posting_id):
        return AssistedForm(status="unavailable")

    questions: dict[str, ScreeningQuestionAnswer] = {}
    skipped = False
    for question in form.questions:
        custom_fields = [field for field in question.fields if re.fullmatch(r"question_[0-9]+", field.name)]
        if not custom_fields:
            continue
        if len(question.fields) != 1 or not question.label.strip():
            skipped = True
            continue
        field = custom_fields[0]
        choices = []
        if field.type == "multi_value_single_select":
            choices = [choice.label.strip() for choice in field.values]
            if not choices or not all(choices) or len(choices) != len(set(choices)):
                skipped = True
                continue
        elif field.type not in {"input_text", "textarea"}:
            skipped = True
            continue
        questions.setdefault(field.name, ScreeningQuestionAnswer(
            id=field.name, question=question.label.strip(), required=question.required, choices=choices,
        ))
    return AssistedForm(status="partial" if skipped else "loaded", questions=list(questions.values()))


def refresh_boards(boards: dict[str, str]) -> list[BoardRefresh]:
    results = []
    with (
        closing(sqlite3.connect(get_db_path())) as conn,
        Client(timeout=8, follow_redirects=False) as client,
    ):
        for token, company in boards.items():
            fetched_at, cached = _read_cache(conn, token)
            if fetched_at and datetime.now(timezone.utc) - fetched_at < REFRESH_INTERVAL:
                results.append(BoardRefresh(board=token, status="cached", count=len(cached)))
                continue
            try:
                jobs = fetch_board(client, token, company)
            except (HTTPError, ValueError):
                results.append(BoardRefresh(board=token, status="failed", count=len(cached)))
                continue
            with conn:
                conn.execute(
                    """
                    INSERT INTO greenhouse_boards (token, fetched_at, jobs_json) VALUES (?, ?, ?)
                    ON CONFLICT(token) DO UPDATE SET fetched_at = excluded.fetched_at, jobs_json = excluded.jobs_json
                    """,
                    (token, datetime.now(timezone.utc).isoformat(), JOB_LIST.dump_json(jobs).decode()),
                )
            results.append(BoardRefresh(board=token, status="refreshed", count=len(jobs)))
    return results
