"""Business logic and synthetic data for GetSwydd application draft flow."""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.models import ApplicationDraft, Job, ScreeningQuestionAnswer

# Synthetic Candidate Profile with verified facts
SYNTHETIC_CANDIDATE = {
    "id": "cand-001",
    "name": "Alex Morgan",
    "email": "alex.morgan@example.com",
    "location": "Cardiff, UK",
    "verified_facts": {
        "python_experience": "Proficient in Python 3, FastAPI, and Flask with 2 years of project and coursework experience.",
        "git_workflow": "Comfortable with Git branching, pull requests, code reviews, and GitHub Actions.",
        "sql_experience": "Hands-on experience writing complex SQL queries, relational joins, and database normalization.",
        "data_analysis": "Skilled in pandas, NumPy, and exploratory data visualization with Matplotlib and Seaborn.",
        "work_authorization": "Authorized to work in the UK without visa sponsorship required.",
        # NOTE: 'availability' is deliberately omitted from verified profile facts!
        # This enforces Rule 1: We never hallucinate or guess missing facts.
    },
}

# Screening question templates per job
JOB_SCREENING_TEMPLATES: Dict[str, List[Dict]] = {
    "job-py-001": [
        {
            "id": "python_experience",
            "question": "What experience do you have with Python, FastAPI, and backend development?",
            "required": True,
            "fact_key": "python_experience",
        },
        {
            "id": "work_authorization",
            "question": "Are you legally authorized to work in the UK for this role?",
            "required": True,
            "fact_key": "work_authorization",
        },
        {
            "id": "availability",
            "question": "What is your earliest start date and weekly availability (e.g. 40 hours/week)?",
            "required": True,
            "fact_key": "availability",  # Does NOT exist in verified facts
        },
    ],
    "job-da-002": [
        {
            "id": "sql_experience",
            "question": "Describe your proficiency with SQL and querying relational databases.",
            "required": True,
            "fact_key": "sql_experience",
        },
        {
            "id": "data_analysis",
            "question": "What experience do you have with data analysis and visualization tools?",
            "required": True,
            "fact_key": "data_analysis",
        },
        {
            "id": "work_authorization",
            "question": "Are you legally authorized to work in the UK for this role?",
            "required": True,
            "fact_key": "work_authorization",
        },
    ],
}


def prepare_draft_for_job(job: Job, candidate: Optional[dict] = None) -> ApplicationDraft:
    """
    Create a new application draft for a target job.
    Uses recommended resume and populates answers only from verified facts.
    """
    cand = candidate or SYNTHETIC_CANDIDATE
    verified_facts = cand.get("verified_facts", {})

    templates = JOB_SCREENING_TEMPLATES.get(job.id, [])
    screening_questions: List[ScreeningQuestionAnswer] = []

    for tmpl in templates:
        fact_key = tmpl["fact_key"]
        has_fact = fact_key in verified_facts and bool(verified_facts[fact_key].strip())

        if has_fact:
            answer = verified_facts[fact_key]
            source = "verified_profile"
        else:
            # Fact missing in verified profile: do not guess! Leave blank for user.
            answer = None
            source = None

        screening_questions.append(
            ScreeningQuestionAnswer(
                id=tmpl["id"],
                question=tmpl["question"],
                required=tmpl["required"],
                answer=answer,
                source=source,
            )
        )

    missing = [
        q.id
        for q in screening_questions
        if q.required and not (q.answer and q.answer.strip())
    ]
    ready = len(missing) == 0
    now_iso = datetime.now(timezone.utc).isoformat()

    return ApplicationDraft(
        id=f"draft-{uuid.uuid4().hex[:10]}",
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        candidate_name=cand["name"],
        selected_resume=job.recommended_resume,
        screening_questions=screening_questions,
        missing_required_questions=missing,
        ready_for_review=ready,
        created_at=now_iso,
        updated_at=now_iso,
    )


def apply_screening_answers(draft: ApplicationDraft, answers: Dict[str, str]) -> ApplicationDraft:
    """
    Update screening answers with user-supplied answers.
    Raises ValueError if an answer key does not match a question ID.
    """
    valid_ids = {q.id for q in draft.screening_questions}
    for q_id in answers.keys():
        if q_id not in valid_ids:
            raise ValueError(f"Question '{q_id}' is not a valid screening question for this draft.")

    for question in draft.screening_questions:
        if question.id in answers:
            raw_val = answers[question.id]
            cleaned = raw_val.strip() if raw_val else ""
            if cleaned:
                question.answer = cleaned
                question.source = "user_supplied"
            else:
                question.answer = None
                question.source = None

    # Re-evaluate missing required questions and review readiness
    draft.missing_required_questions = [
        q.id
        for q in draft.screening_questions
        if q.required and not (q.answer and q.answer.strip())
    ]
    draft.ready_for_review = len(draft.missing_required_questions) == 0
    draft.updated_at = datetime.now(timezone.utc).isoformat()

    return draft
