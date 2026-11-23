"""Prepare and send reviewed applications to opted-in Greenhouse boards."""
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Literal

from httpx import Client, HTTPError

from app.greenhouse import BOARD_API, AssistedForm, FormField, GreenhouseForm, configured_boards
from app.models import ApplicationDraft, ScreeningQuestionAnswer
from app.resume_models import ResumeContact

STANDARD_LABELS = {
    "first_name": "Given name",
    "last_name": "Family name",
    "email": "Email address",
    "phone": "Phone number",
}
REQUIRED_FIELDS = {"first_name", "last_name", "email"}
RESUME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
SubmissionResult = Literal["submitted", "uncertain", "rejected"]


def greenhouse_api_key(job_id: str) -> str | None:
    match = re.fullmatch(r"greenhouse:([a-z0-9_-]{1,80}):[0-9]{1,24}", job_id)
    if not match:
        return None
    try:
        keys = json.loads(os.getenv("GETSWYDD_GREENHOUSE_SUBMISSION_KEYS", "{}"))
        board = match[1]
        key = keys.get(board) if isinstance(keys, dict) and board in configured_boards() else None
    except ValueError:
        return None
    return key.strip() if isinstance(key, str) and key.strip() else None


def _choice_values(field: FormField) -> dict[str, int] | None:
    choices = {choice.label.strip(): choice.value for choice in field.values if choice.value is not None}
    if not choices or "" in choices or len(choices) != len(field.values):
        return None
    return choices


def form_hash(form: GreenhouseForm) -> str:
    return hashlib.sha256(form.model_dump_json().encode()).hexdigest()


def enable_direct_submission(draft: ApplicationDraft, form: AssistedForm) -> None:
    raw = form.greenhouse_form
    if raw is None or form.status != "loaded" or not greenhouse_api_key(draft.job_id):
        return
    if raw.location_questions or raw.compliance or raw.demographic_questions or raw.data_compliance:
        return
    if Path(draft.selected_resume).suffix.lower() not in RESUME_TYPES:
        return

    standards = set(REQUIRED_FIELDS)
    required = set(REQUIRED_FIELDS)
    has_resume = False
    seen = set()
    for question in raw.questions:
        fields = question.fields
        if not fields or any(field.name in seen for field in fields):
            return
        seen.update(field.name for field in fields)
        names = {field.name for field in fields}
        if len(names) != len(fields):
            return
        if names <= {"resume", "resume_text"} and any(
            field.name == "resume" and field.type == "input_file" for field in fields
        ):
            has_resume = True
            continue
        if names & STANDARD_LABELS.keys():
            if len(fields) != 1 or fields[0].type not in {"input_text", "textarea"}:
                return
            standards.update(names)
            if question.required:
                required.update(names)
            continue
        if len(fields) == 1 and re.fullmatch(r"question_[0-9]+", fields[0].name):
            field = fields[0]
            if field.type == "multi_value_single_select" and _choice_values(field) is None:
                return
            continue
        if question.required:
            return

    if not has_resume:
        return
    names = draft.candidate_name.split(maxsplit=1)
    prefill = {
        "first_name": names[0] if names else None,
        "last_name": names[1] if len(names) == 2 else None,
        "email": draft.contact.email if draft.contact else None,
        "phone": draft.contact.phone if draft.contact else None,
    }
    identity_questions = [
        ScreeningQuestionAnswer(
            id=field, question=label, required=field in required,
            answer=prefill[field], source="verified_profile" if prefill[field] else None,
        )
        for field, label in STANDARD_LABELS.items() if field in standards
    ]
    draft.screening_questions = identity_questions + draft.screening_questions
    draft.missing_required_questions = [
        question.id for question in draft.screening_questions
        if question.required and not (question.answer or "").strip()
    ]
    draft.ready_for_review = not draft.missing_required_questions
    draft.greenhouse_form_hash = form_hash(raw)


def submission_fields(draft: ApplicationDraft, form: GreenhouseForm) -> dict[str, str]:
    choices = {
        field.name: _choice_values(field) or {}
        for question in form.questions for field in question.fields
        if field.type == "multi_value_single_select"
    }
    data = {}
    for question in draft.screening_questions:
        answer = (question.answer or "").strip()
        if question.required and not answer:
            raise ValueError("Answer all required fields before submitting.")
        if answer:
            if question.id in choices:
                value = choices[question.id].get(answer)
                if value is None:
                    raise ValueError("Select an available employer answer before submitting.")
                answer = str(value)
            data[question.id] = answer
    if not REQUIRED_FIELDS <= data.keys():
        raise ValueError("Enter your given name, family name, and email before submitting.")
    if any(len(data[field]) > 255 or re.search(r"https?://", data[field], re.I)
           for field in ("first_name", "last_name")):
        raise ValueError("Enter valid given and family names before submitting.")
    try:
        ResumeContact(email=data["email"], phone=data.get("phone"))
    except ValueError:
        raise ValueError("Enter a valid email and phone number before submitting.") from None
    return data


def post_greenhouse_application(
    job_id: str, key: str, fields: dict[str, str], filename: str, original: bytes,
) -> SubmissionResult:
    _, token, posting = job_id.split(":")
    try:
        with Client(timeout=15, follow_redirects=False) as client:
            response = client.post(
                f"{BOARD_API}/{token}/jobs/{posting}",
                auth=(key, ""),
                data=fields,
                files={"resume": (filename, original, RESUME_TYPES[Path(filename).suffix.lower()])},
            )
    except HTTPError:
        return "uncertain"
    if response.status_code in {200, 201, 204}:
        return "submitted"
    if response.status_code in {400, 401, 403, 404, 410, 413, 415, 422, 429}:
        return "rejected"
    return "uncertain"
