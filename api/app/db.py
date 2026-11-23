"""SQLite persistence layer for GetSwydd application drafts."""
import os
import sqlite3
from collections.abc import Callable
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from app.models import ApplicationDraft, AssistedApplication, JobSearchPreferences, SubmissionReceipt
from app.services import apply_screening_answers

DEFAULT_DB_PATH = str(Path(__file__).resolve().parent.parent / "getswydd.db")


def get_db_path() -> str:
    """Return configured database path from environment or default."""
    return os.getenv("GETSWYDD_DB_PATH", DEFAULT_DB_PATH)


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize the SQLite schema if not already present."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    try:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS application_drafts (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    job_title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    candidate_name TEXT NOT NULL,
                    selected_resume TEXT NOT NULL,
                    ready_for_review INTEGER NOT NULL,
                    data_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS test_employer_inbox (
                    draft_id TEXT PRIMARY KEY,
                    approved_draft_json TEXT NOT NULL,
                    receipt_json TEXT NOT NULL,
                    submitted_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS resumes (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL,
                    original_file BLOB NOT NULL,
                    extracted_text TEXT NOT NULL,
                    suggested_facts TEXT NOT NULL,
                    confirmed_facts TEXT,
                    suggested_contact TEXT,
                    confirmed_contact TEXT,
                    revision INTEGER NOT NULL DEFAULT 0
                )
            """)
            resume_columns = {row[1] for row in conn.execute("PRAGMA table_info(resumes)")}
            for column in ("suggested_contact", "confirmed_contact"):
                if column not in resume_columns:
                    conn.execute(f"ALTER TABLE resumes ADD COLUMN {column} TEXT")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS application_details (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    data_json TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS greenhouse_boards (
                    token TEXT PRIMARY KEY,
                    fetched_at TEXT NOT NULL,
                    jobs_json TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS job_search_preferences (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    data_json TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS public_job_feeds (
                    source TEXT NOT NULL, token TEXT NOT NULL, fetched_at TEXT NOT NULL,
                    jobs_json TEXT NOT NULL, PRIMARY KEY (source, token)
                )
            """)
            conn.execute("CREATE TABLE IF NOT EXISTS discovered_job_keys (key TEXT PRIMARY KEY)")
            conn.execute("CREATE TABLE IF NOT EXISTS initialized_discovery_sources (source TEXT PRIMARY KEY)")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS job_alerts (
                    id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data_json TEXT NOT NULL, read_at TEXT
                )
            """)
    finally:
        conn.close()


def get_job_preferences() -> JobSearchPreferences:
    with closing(sqlite3.connect(get_db_path())) as conn:
        row = conn.execute("SELECT data_json FROM job_search_preferences WHERE id = 1").fetchone()
    return JobSearchPreferences.model_validate_json(row[0]) if row else JobSearchPreferences()


def save_job_preferences(preferences: JobSearchPreferences) -> JobSearchPreferences:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute(
            """
            INSERT INTO job_search_preferences (id, data_json) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json
            """,
            (preferences.model_dump_json(),),
        )
    return preferences


def save_draft(draft: ApplicationDraft, db_path: Optional[str] = None) -> None:
    """Save a newly created application draft."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    try:
        with conn:
            saved = conn.execute(
                """
                INSERT INTO application_drafts (
                    id, job_id, job_title, company, candidate_name,
                    selected_resume, ready_for_review, data_json, created_at, updated_at
                )
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                WHERE ? IS NULL OR EXISTS (SELECT 1 FROM resumes WHERE id = ?)
                """,
                (
                    draft.id,
                    draft.job_id,
                    draft.job_title,
                    draft.company,
                    draft.candidate_name,
                    draft.selected_resume,
                    1 if draft.ready_for_review else 0,
                    draft.model_dump_json(),
                    draft.created_at,
                    draft.updated_at,
                    draft.resume_id,
                    draft.resume_id,
                ),
            )
            if saved.rowcount == 0:
                raise DraftConflict("The selected resume was removed. Choose another resume.")
    finally:
        conn.close()


def get_draft(draft_id: str, db_path: Optional[str] = None) -> Optional[ApplicationDraft]:
    """Retrieve an application draft by ID from SQLite."""
    with closing(sqlite3.connect(db_path or get_db_path())) as conn:
        return _read_draft(conn, draft_id)


def _read_draft(conn: sqlite3.Connection, draft_id: str) -> Optional[ApplicationDraft]:
    row = conn.execute(
        """
        SELECT application_drafts.data_json, test_employer_inbox.receipt_json
        FROM application_drafts
        LEFT JOIN test_employer_inbox ON application_drafts.id = test_employer_inbox.draft_id
        WHERE application_drafts.id = ?
        """,
        (draft_id,),
    ).fetchone()
    if row is None:
        return None
    draft = ApplicationDraft.model_validate_json(row[0])
    if row[1] is not None:
        draft.submission = SubmissionReceipt.model_validate_json(row[1])
    return draft


class DraftConflict(ValueError):
    """The draft state prevents the requested action."""


def edit_draft(draft_id: str, answers: dict[str, str]) -> Optional[ApplicationDraft]:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None:
            return None
        if draft.submission or draft.reported_submitted_at or draft.employer_submission_status:
            raise DraftConflict("This draft is locked for submission.")
        draft = apply_screening_answers(draft, answers)
        _update_draft(conn, draft)
        return draft


def _update_draft(conn: sqlite3.Connection, draft: ApplicationDraft) -> None:
    conn.execute(
        """
        UPDATE application_drafts
        SET ready_for_review = ?, data_json = ?, updated_at = ?
        WHERE id = ?
        """,
        (draft.ready_for_review, draft.model_dump_json(), draft.updated_at, draft.id),
    )


def deliver_to_test_employer(
    draft_id: str,
    approved_version: str,
    *,
    confirm_browser: Callable[[ApplicationDraft], None] | None = None,
) -> Optional[SubmissionReceipt]:
    """Record the approved payload in the local test inbox and return its receipt."""
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None:
            return None
        if draft.mode != "demo" or draft.resume_id is not None:
            raise DraftConflict("The test inbox accepts demo drafts.")
        if draft.updated_at != approved_version:
            raise DraftConflict("This draft changed. Reload it and review the saved answers again.")
        if draft.submission:
            return draft.submission
        if not draft.ready_for_review:
            raise DraftConflict("Answer the required questions before submitting.")
        if confirm_browser:
            confirm_browser(draft)

        receipt = SubmissionReceipt(
            id=f"test-{uuid4().hex}",
            draft_id=draft.id,
            job_title=draft.job_title,
            company=draft.company,
            selected_resume=draft.selected_resume,
            approved_updated_at=draft.updated_at,
            submitted_at=datetime.now(timezone.utc).isoformat(),
        )
        conn.execute(
            """
            INSERT INTO test_employer_inbox (draft_id, approved_draft_json, receipt_json, submitted_at)
            VALUES (?, ?, ?, ?)
            """,
            (draft.id, draft.model_dump_json(), receipt.model_dump_json(), receipt.submitted_at),
        )
        return receipt


def list_test_submissions() -> list[SubmissionReceipt]:
    with closing(sqlite3.connect(get_db_path())) as conn:
        rows = conn.execute(
            "SELECT receipt_json FROM test_employer_inbox ORDER BY submitted_at DESC, draft_id"
        )
        return [SubmissionReceipt.model_validate_json(row[0]) for row in rows]


def _assisted_summary(draft: ApplicationDraft) -> AssistedApplication:
    if draft.mode != "assisted" or draft.apply_url is None:
        raise DraftConflict("Only assisted drafts can be marked as submitted by the user.")
    outcome = draft.employer_submission_status
    return AssistedApplication(
        draft_id=draft.id,
        job_id=draft.job_id,
        job_title=draft.job_title,
        company=draft.company,
        selected_resume=draft.selected_resume,
        apply_url=draft.apply_url,
        status="submitted" if draft.reported_submitted_at or outcome == "submitted"
        else "unconfirmed" if outcome else "draft",
        status_source=(draft.employer_submission_source or "greenhouse") if outcome
        else "user_reported" if draft.reported_submitted_at else "getswydd",
        reported_submitted_at=draft.reported_submitted_at,
        employer_submitted_at=draft.employer_submitted_at,
        updated_at=draft.updated_at,
    )


def report_assisted_submission(draft_id: str) -> AssistedApplication | None:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None:
            return None
        current = _assisted_summary(draft)
        if draft.reported_submitted_at:
            return current
        if _job_has_delivery(conn, draft.job_id, include_reported=False):
            raise DraftConflict("This job already has an employer submission on record or awaiting confirmation.")
        now = datetime.now(timezone.utc).isoformat()
        draft.reported_submitted_at = now
        draft.updated_at = now
        _update_draft(conn, draft)
        return _assisted_summary(draft)


def _job_has_delivery(conn: sqlite3.Connection, job_id: str, *, include_reported: bool) -> bool:
    return conn.execute(
        """
        SELECT 1 FROM application_drafts
        WHERE job_id = ? AND (
            json_extract(data_json, '$.employer_submission_status') IS NOT NULL
            OR (? AND json_extract(data_json, '$.reported_submitted_at') IS NOT NULL)
        ) LIMIT 1
        """,
        (job_id, include_reported),
    ).fetchone() is not None


def claim_employer_submission(
    draft_id: str, approved_version: str, source: Literal["greenhouse", "gmail"] = "greenhouse",
) -> bytes:
    """Persist the claim before sending, including across processes."""
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None or draft.updated_at != approved_version:
            raise DraftConflict("This draft changed. Reload it and review the saved answers again.")
        if _job_has_delivery(conn, draft.job_id, include_reported=True):
            raise DraftConflict("This job already has a submission on record or awaiting confirmation.")
        row = conn.execute(
            "SELECT original_file FROM resumes WHERE id = ? AND confirmed_facts IS NOT NULL", (draft.resume_id,),
        ).fetchone()
        if row is None or not row[0]:
            raise DraftConflict("The reviewed resume is unavailable. Prepare a new draft with a reviewed resume.")
        draft.employer_submission_status = "sending"
        draft.employer_submission_source = source
        _update_draft(conn, draft)
        return row[0]


def finish_employer_submission(draft_id: str, outcome: str, receipt_id: str | None = None) -> ApplicationDraft:
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None or draft.employer_submission_status != "sending":
            raise DraftConflict("Reload this draft to see its submission status.")
        now = datetime.now(timezone.utc).isoformat()
        draft.updated_at = now
        draft.employer_submission_status = None if outcome == "rejected" else outcome
        if outcome == "rejected":
            draft.employer_submission_source = None
        if outcome == "submitted":
            draft.employer_submitted_at = now
            draft.employer_receipt_id = receipt_id
        _update_draft(conn, draft)
        return draft


def list_assisted_applications() -> list[AssistedApplication]:
    with closing(sqlite3.connect(get_db_path())) as conn:
        rows = conn.execute(
            """
            SELECT data_json FROM application_drafts
            WHERE json_extract(data_json, '$.mode') = 'assisted'
            ORDER BY updated_at DESC, id
            """
        )
        return [_assisted_summary(ApplicationDraft.model_validate_json(row[0])) for row in rows]
