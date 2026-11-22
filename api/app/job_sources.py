"""Public Lever and Ashby listing adapters and the shared live catalog."""
import json
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from hashlib import sha256
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from httpx import Client, HTTPError
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

from app import greenhouse
from app.db import get_db_path
from app.models import CompensationRange, Job

ExternalSource = Literal["greenhouse", "lever", "ashby"]
PUBLIC_SOURCES = ("greenhouse", "lever", "ashby")
BOARD_URLS = {
    "lever": ("https://api.lever.co/v0/postings/", {"mode": "json"}),
    "ashby": ("https://api.ashbyhq.com/posting-api/job-board/", {"includeCompensation": "true"}),
}
WORKPLACE = {"remote": "remote", "hybrid": "hybrid", "onsite": "onsite"}
EMPLOYMENT = {
    "intern": "internship", "internship": "internship", "fulltime": "full_time",
    "parttime": "part_time", "contract": "contract", "temporary": "temporary",
}
PERIODS = {
    "hour": "hour", "hourly": "hour", "week": "week", "weekly": "week",
    "month": "month", "monthly": "month", "year": "year", "yearly": "year",
    "annual": "year", "annually": "year", "onetime": "one_time",
}
JOB_LIST = TypeAdapter(list[Job])


class SourceRefresh(greenhouse.BoardRefresh):
    source: ExternalSource


def configured_boards(source: ExternalSource) -> dict[str, str]:
    if source == "greenhouse":
        return greenhouse.configured_boards()
    variable = f"GETSWYDD_{source.upper()}_BOARDS"
    try:
        config = json.loads(os.getenv(variable, "{}"))
    except ValueError as error:
        raise greenhouse.BoardConfigError(f"{variable} must be a JSON object.") from error
    if not isinstance(config, dict) or len(config) > 5 or any(
        not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", token)
        or not isinstance(company, str) or not company.strip()
        for token, company in config.items()
    ):
        raise greenhouse.BoardConfigError(f"{variable} accepts up to five board tokens and employer names.")
    return {token: company.strip() for token, company in config.items()}


def _compact(value: str | None) -> str:
    return re.sub(r"[^a-z]", "", (value or "").casefold())


def _pay(minimum, maximum, currency, interval) -> CompensationRange | None:
    period = PERIODS.get(_compact(interval).removeprefix("per"))
    if not period or not currency:
        return None
    try:
        return CompensationRange(minimum=minimum, maximum=maximum, currency=currency.upper(), period=period)
    except ValidationError:
        return None


class LeverCategories(BaseModel):
    location: str | None = None
    allLocations: list[str] = Field(default_factory=list)
    commitment: str | None = None


class LeverSection(BaseModel):
    text: str
    content: str


class LeverSalary(BaseModel):
    min: float | None = None
    max: float | None = None
    currency: str | None = None
    interval: str | None = None


class LeverPosting(BaseModel):
    id: str
    text: str
    applyUrl: str
    categories: LeverCategories = Field(default_factory=LeverCategories)
    descriptionPlain: str | None = None
    additionalPlain: str | None = None
    lists: list[LeverSection] = Field(default_factory=list)
    workplaceType: str | None = None
    salaryRange: LeverSalary | None = None


class AshbyLocation(BaseModel):
    location: str


class AshbySalary(BaseModel):
    compensationType: str
    minValue: float | None = None
    maxValue: float | None = None
    currencyCode: str | None = None
    interval: str | None = None


class AshbyCompensation(BaseModel):
    summaryComponents: list[AshbySalary] = Field(default_factory=list)


class AshbyPosting(BaseModel):
    title: str
    applyUrl: str
    isListed: bool
    location: str | None = None
    secondaryLocations: list[AshbyLocation] = Field(default_factory=list)
    descriptionPlain: str | None = None
    workplaceType: str | None = None
    employmentType: str | None = None
    publishedAt: str | None = None
    compensation: AshbyCompensation | None = None


class AshbyFeed(BaseModel):
    jobs: list[AshbyPosting]


LEVER_FEED = TypeAdapter(list[LeverPosting])


def job_key(job: Job) -> str:
    if not job.apply_url:
        return job.id
    url = urlsplit(job.apply_url)
    query = sorted((key, value) for key, value in parse_qsl(url.query, keep_blank_values=True)
                   if not key.casefold().startswith("utm_") and key.casefold() not in {"gh_src", "lever-source"})
    return urlunsplit((url.scheme, url.netloc.casefold(), url.path.rstrip("/"), urlencode(query), ""))


def _listing(source, token, company, title, url, location, *, external_id=None, description=None,
             workplace=None, employment=None, locations=(), compensation=(), posted_date=None) -> Job:
    apply_url = greenhouse.official_apply_url(url)
    path = urlsplit(apply_url).path.rstrip("/")
    identifier = sha256((external_id or path).encode()).hexdigest()[:24]
    return Job(
        id=f"{source}:{token}:{identifier}", title=title, company=company,
        location=location or "Location not listed", description=(description or "")[:30_000] or None,
        source=source, application_mode="assisted", apply_url=apply_url,
        workplace=WORKPLACE.get(_compact(workplace)), employment=EMPLOYMENT.get(_compact(employment)),
        additional_locations=list(dict.fromkeys(item for item in locations if item and item != location)),
        compensation=[item for item in compensation if item is not None],
        posted_date=posted_date,
    )


def fetch_other_board(client: Client, source: ExternalSource, token: str, company: str) -> list[Job]:
    url, params = BOARD_URLS[source]
    data = greenhouse.download_public_json(client, url + token, params)
    jobs = []
    if source == "lever":
        for post in LEVER_FEED.validate_json(data):
            sections = [post.descriptionPlain or ""]
            for section in post.lists:
                parser = greenhouse.DescriptionText()
                parser.feed(section.content)
                parser.close()
                sections.append(f"{section.text}\n{parser.text()}")
            sections.append(post.additionalPlain or "")
            pay = post.salaryRange
            jobs.append(_listing(
                source, token, company, post.text, post.applyUrl, post.categories.location,
                external_id=post.id,
                description="\n\n".join(part for part in sections if part),
                workplace=post.workplaceType, employment=post.categories.commitment,
                locations=post.categories.allLocations,
                compensation=[_pay(pay.min, pay.max, pay.currency, pay.interval)] if pay else [],
            ))
    else:
        for post in AshbyFeed.model_validate_json(data).jobs:
            if not post.isListed:
                continue
            components = post.compensation.summaryComponents if post.compensation else []
            jobs.append(_listing(
                source, token, company, post.title, post.applyUrl, post.location,
                description=post.descriptionPlain, workplace=post.workplaceType,
                employment=post.employmentType, locations=[place.location for place in post.secondaryLocations],
                posted_date=post.publishedAt,
                compensation=[_pay(pay.minValue, pay.maxValue, pay.currencyCode, pay.interval)
                              for pay in components if pay.compensationType.casefold() in {"salary", "stipend", "hourly"}],
            ))
    return list({job.id: job for job in jobs}.values())


def _snapshot(conn: sqlite3.Connection, source: ExternalSource, token: str) -> tuple[str | None, list[Job]]:
    row = conn.execute(
        "SELECT fetched_at, jobs_json FROM public_job_feeds WHERE source = ? AND token = ?", (source, token)
    ).fetchone()
    return (row[0], JOB_LIST.validate_json(row[1])) if row else (None, [])


def live_jobs(sources=PUBLIC_SOURCES) -> list[Job]:
    catalog: dict[str, Job] = {}
    with closing(sqlite3.connect(get_db_path())) as conn:
        for source in sources:
            boards = configured_boards(source)
            if source == "greenhouse":
                for job in greenhouse.imported_jobs(boards):
                    catalog.setdefault(job_key(job), job)
                continue
            for token, company in boards.items():
                fetched_at, jobs = _snapshot(conn, source, token)
                for job in jobs:
                    catalog.setdefault(job_key(job), job.model_copy(
                        update={"source_fetched_at": fetched_at, "company": company}
                    ))
    return list(catalog.values())


def refresh_source(source: ExternalSource, boards: dict[str, str]) -> list[SourceRefresh]:
    if source == "greenhouse":
        return [SourceRefresh(source=source, **item.model_dump()) for item in greenhouse.refresh_boards(boards)]
    results = []
    with closing(sqlite3.connect(get_db_path())) as conn, Client(timeout=8, follow_redirects=False) as client:
        for token, company in boards.items():
            stamp, cached = _snapshot(conn, source, token)
            if stamp and datetime.now(timezone.utc) - datetime.fromisoformat(stamp) < greenhouse.REFRESH_INTERVAL:
                results.append(SourceRefresh(source=source, board=token, status="cached", count=len(cached)))
                continue
            try:
                jobs = fetch_other_board(client, source, token, company)
            except (HTTPError, ValueError):
                results.append(SourceRefresh(source=source, board=token, status="failed", count=len(cached)))
                continue
            with conn:
                conn.execute(
                    """
                    INSERT INTO public_job_feeds (source, token, fetched_at, jobs_json) VALUES (?, ?, ?, ?)
                    ON CONFLICT(source, token) DO UPDATE SET fetched_at=excluded.fetched_at, jobs_json=excluded.jobs_json
                    """,
                    (source, token, datetime.now(timezone.utc).isoformat(), JOB_LIST.dump_json(jobs).decode()),
                )
            results.append(SourceRefresh(source=source, board=token, status="refreshed", count=len(jobs)))
    return results
