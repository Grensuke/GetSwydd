"""Persist alerts for newly discovered jobs that match the saved search."""
import asyncio
import logging
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from hashlib import sha256

from app.db import get_db_path, get_job_preferences
from app.greenhouse import REFRESH_LOCK, BoardConfigError
from app.job_search import filter_jobs
from app.job_sources import PUBLIC_SOURCES, ExternalSource, configured_boards, job_key, live_jobs, refresh_source
from app.models import Job, JobAlert


class RefreshBusy(RuntimeError):
    """A refresh already owns the local source cache."""


def refresh_catalog(sources: tuple[ExternalSource, ...] = PUBLIC_SOURCES):
    if not REFRESH_LOCK.acquire(blocking=False):
        raise RefreshBusy
    try:
        boards = {source: configured_boards(source) for source in sources}
        _seed_discoveries(sources, live_jobs(sources))
        results = [result for source, config in boards.items() if config for result in refresh_source(source, config)]
        after = live_jobs(sources)
        return results, _record_discoveries(after)
    finally:
        REFRESH_LOCK.release()


def _seed_discoveries(sources: tuple[ExternalSource, ...], before: list[Job]) -> None:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        for source in sources:
            inserted = conn.execute("INSERT OR IGNORE INTO initialized_discovery_sources VALUES (?)", (source,))
            if inserted.rowcount:
                conn.executemany(
                    "INSERT OR IGNORE INTO discovered_job_keys VALUES (?)",
                    ((job_key(job),) for job in before if job.source == source),
                )


def _record_discoveries(after: list[Job]) -> int:
    preferences = get_job_preferences()
    has_filters = any((preferences.role_keywords, preferences.location_keywords, preferences.internships_only,
                       preferences.workplace_modes, preferences.employment_types, preferences.experience_levels,
                       preferences.minimum_pay))
    matching = {job_key(job): job for job in filter_jobs(after, preferences)} if has_filters else {}
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        count = 0
        for job in after:
            key = job_key(job)
            insertion = conn.execute("INSERT OR IGNORE INTO discovered_job_keys VALUES (?)", (key,))
            if not insertion.rowcount or key not in matching:
                continue
            job = matching[key]
            alert = JobAlert(
                id=sha256(key.encode()).hexdigest(), job_id=job.id, job_title=job.title,
                company=job.company, location=job.location, apply_url=job.apply_url,
                application_deadline=job.application_deadline, created_at=datetime.now(timezone.utc).isoformat(),
            )
            conn.execute(
                "INSERT INTO job_alerts (id, created_at, data_json) VALUES (?, ?, ?)",
                (alert.id, alert.created_at, alert.model_dump_json()),
            )
            count += 1
        return count


def _alert(row) -> JobAlert:
    return JobAlert.model_validate_json(row[0]).model_copy(update={"read_at": row[1]})


def list_alerts(unread_only: bool, limit: int, offset: int) -> list[JobAlert]:
    condition = "WHERE read_at IS NULL" if unread_only else ""
    with closing(sqlite3.connect(get_db_path())) as conn:
        rows = conn.execute(
            f"SELECT data_json, read_at FROM job_alerts {condition} ORDER BY created_at DESC, id LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [_alert(row) for row in rows]


def read_alert(alert_id: str) -> JobAlert | None:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        row = conn.execute(
            """
            UPDATE job_alerts SET read_at = COALESCE(read_at, ?)
            WHERE id = ? RETURNING data_json, read_at
            """,
            (datetime.now(timezone.utc).isoformat(), alert_id),
        ).fetchone()
        return _alert(row) if row else None


async def scheduled_refresh(interval: int) -> None:
    while True:
        try:
            await asyncio.to_thread(refresh_catalog)
        except RefreshBusy:
            pass
        except (BoardConfigError, sqlite3.Error):
            logging.getLogger(__name__).exception("Scheduled job refresh failed")
        await asyncio.sleep(interval * 60)
