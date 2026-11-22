"""SQLite persistence layer for GetSwydd application drafts."""
import os
import sqlite3
from pathlib import Path
from typing import Optional

from app.models import ApplicationDraft

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
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM application_drafts WHERE id = ?", (draft_id,))
        row = cur.fetchone()
        if not row:
            return None
        return ApplicationDraft.model_validate_json(row["data_json"])
    finally:
        conn.close()


def update_draft(draft: ApplicationDraft, db_path: Optional[str] = None) -> None:
    """Update an existing application draft in SQLite."""
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(target_path)
    try:
        with conn:
            conn.execute(
                """
                UPDATE application_drafts
                SET ready_for_review = ?,
                    data_json = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    1 if draft.ready_for_review else 0,
                    draft.model_dump_json(),
                    draft.updated_at,
                    draft.id,
                ),
            )
    finally:
        conn.close()
