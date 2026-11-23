"""Store uploaded resumes and derive the master profile from confirmed facts."""
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import PurePath
from uuid import uuid4

from app.db import get_db_path
from app.resume_models import (
    ApplicationDetails,
    ConfirmedProfile,
    GeneralApplicationDetails,
    ProfileFact,
    ProfileSource,
    ResumeContact,
    ResumeDetail,
    ResumeFacts,
    ResumeReview,
    ResumeSummary,
)
from app.resume_parser import ResumeParseError, parse_resume

SUMMARY_COLUMNS = "id, filename, uploaded_at, confirmed_facts IS NOT NULL AS reviewed"
DETAIL_COLUMNS = f"{SUMMARY_COLUMNS}, extracted_text, suggested_facts, confirmed_facts, suggested_contact, confirmed_contact, revision"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def _detail(row: sqlite3.Row) -> ResumeDetail:
    record = dict(row)
    record["suggested_facts"] = ResumeFacts.model_validate_json(row["suggested_facts"])
    if row["confirmed_facts"] is not None:
        record["confirmed_facts"] = ResumeFacts.model_validate_json(row["confirmed_facts"])
    for key in ("suggested_contact", "confirmed_contact"):
        if row[key] is not None:
            record[key] = ResumeContact.model_validate_json(row[key])
    if row["suggested_contact"] is None:
        del record["suggested_contact"]
    return ResumeDetail.model_validate(record)


def store_resume(
    filename: str, content: bytes, text: str, facts: ResumeFacts, contact: ResumeContact | None = None
) -> ResumeDetail:
    record = ResumeDetail(
        id=f"resume-{uuid4().hex}",
        filename=filename,
        uploaded_at=datetime.now(timezone.utc).isoformat(),
        reviewed=False,
        extracted_text=text,
        suggested_facts=facts,
        confirmed_facts=None,
        suggested_contact=contact or ResumeContact(),
        revision=0,
    )
    with closing(_connect()) as conn, conn:
        conn.execute(
            """
            INSERT INTO resumes (id, filename, uploaded_at, original_file, extracted_text, suggested_facts, suggested_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (record.id, filename, record.uploaded_at, content, text, facts.model_dump_json(),
             record.suggested_contact.model_dump_json()),
        )
    return record


def list_resumes() -> list[ResumeSummary]:
    with closing(_connect()) as conn:
        rows = conn.execute(f"SELECT {SUMMARY_COLUMNS} FROM resumes ORDER BY uploaded_at DESC, id")
        return [ResumeSummary.model_validate(dict(row)) for row in rows]


def get_resume(resume_id: str) -> ResumeDetail | None:
    with closing(_connect()) as conn, conn:
        row = conn.execute(f"SELECT {DETAIL_COLUMNS} FROM resumes WHERE id = ?", (resume_id,)).fetchone()
        if row is None:
            return None
        if row["suggested_contact"] is None:
            original = conn.execute("SELECT original_file FROM resumes WHERE id = ?", (resume_id,)).fetchone()
            if original is None:
                return None
            try:
                text, facts, contact = parse_resume(original[0], PurePath(row["filename"]).suffix.lower())
            except ResumeParseError:
                text, facts, contact = row["extracted_text"], ResumeFacts.model_validate_json(row["suggested_facts"]), ResumeContact()
            conn.execute(
                "UPDATE resumes SET extracted_text = ?, suggested_facts = ?, suggested_contact = ? "
                "WHERE id = ? AND suggested_contact IS NULL",
                (text, facts.model_dump_json(), contact.model_dump_json(), resume_id),
            )
            row = conn.execute(f"SELECT {DETAIL_COLUMNS} FROM resumes WHERE id = ?", (resume_id,)).fetchone()
        return _detail(row)


def delete_resume(resume_id: str) -> None:
    with closing(_connect()) as conn, conn:
        conn.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))


class StaleResumeReview(ValueError):
    """The resume has a newer saved review."""


def confirm_resume(resume_id: str, review: ResumeReview) -> ResumeDetail | None:
    with closing(_connect()) as conn, conn:
        row = conn.execute(
            f"""
            UPDATE resumes SET confirmed_facts = ?, confirmed_contact = COALESCE(?, confirmed_contact),
                revision = revision + 1
            WHERE id = ? AND revision = ?
            RETURNING {DETAIL_COLUMNS}
            """,
            (review.facts.model_dump_json(), review.contact.model_dump_json() if review.contact is not None else None,
             resume_id, review.revision),
        ).fetchone()
        if row:
            return _detail(row)
        if conn.execute("SELECT 1 FROM resumes WHERE id = ?", (resume_id,)).fetchone():
            raise StaleResumeReview("This resume was reviewed elsewhere. Reopen it before saving.")
        return None


def get_confirmed_profile() -> ConfirmedProfile:
    facts: dict[tuple[str, str], ProfileFact] = {}
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT id, filename, confirmed_facts FROM resumes WHERE confirmed_facts IS NOT NULL ORDER BY uploaded_at, id"
        )
        for row in rows:
            source = ProfileSource(resume_id=row["id"], filename=row["filename"])
            confirmed = ResumeFacts.model_validate_json(row["confirmed_facts"])
            for category, values in confirmed.model_dump().items():
                for value in values:
                    key = (category, " ".join(value.casefold().split()))
                    if key not in facts:
                        facts[key] = ProfileFact(category=category, value=value, sources=[])
                    if source not in facts[key].sources:
                        facts[key].sources.append(source)
    return ConfirmedProfile(facts=list(facts.values()))


def get_application_details() -> ApplicationDetails:
    with closing(_connect()) as conn:
        row = conn.execute("SELECT data_json FROM application_details WHERE id = 1").fetchone()
    return ApplicationDetails.model_validate_json(row["data_json"]) if row else ApplicationDetails()


def save_application_details(details: GeneralApplicationDetails, *, partial: bool = False) -> ApplicationDetails:
    with closing(_connect()) as conn, conn:
        row = conn.execute(
            """
            INSERT INTO application_details (id, data_json) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET data_json =
                CASE WHEN ? THEN json_patch(application_details.data_json, excluded.data_json)
                ELSE excluded.data_json END
            RETURNING data_json
            """,
            (details.model_dump_json(exclude_unset=partial), partial),
        ).fetchone()
    return ApplicationDetails.model_validate_json(row["data_json"])
