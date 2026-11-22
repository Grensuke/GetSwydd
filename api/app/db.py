"""SQLite persistence layer for GetSwydd application drafts."""
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from app.models import ApplicationDraft, SubmissionReceipt
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
                    revision INTEGER NOT NULL DEFAULT 0
                )
            """)
    finally:
        conn.close()


def save_draft(draft: ApplicationDraft, db_path: Optional[str] = None) -> None:
    """Save a newly created application draft."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO application_drafts (
                    id, job_id, job_title, company, candidate_name,
                    selected_resume, ready_for_review, data_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                ),
            )
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
        if draft.submission:
            raise DraftConflict("This draft has already been submitted.")
        draft = apply_screening_answers(draft, answers)
        conn.execute(
            """
            UPDATE application_drafts
            SET ready_for_review = ?, data_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (draft.ready_for_review, draft.model_dump_json(), draft.updated_at, draft.id),
        )
        return draft


def deliver_to_test_employer(draft_id: str, approved_version: str) -> Optional[SubmissionReceipt]:
    """Record the approved payload in the local test inbox and return its receipt."""
    with closing(sqlite3.connect(get_db_path())) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        draft = _read_draft(conn, draft_id)
        if draft is None:
            return None
        if draft.updated_at != approved_version:
            raise DraftConflict("This draft changed. Reload it and review the saved answers again.")
        if draft.submission:
            return draft.submission
        if not draft.ready_for_review:
            raise DraftConflict("Answer the required questions before submitting.")

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
