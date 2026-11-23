"""Prepare demo and personalized application drafts from confirmed facts."""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from app.matching import DATA_VISUALIZATION, PANDAS, PYTHON, SQL, WEB_FRAMEWORK, normalize_skill
from app.models import AnswerEvidence, ApplicationDraft, Job, ScreeningQuestionAnswer
from app.resume_models import ApplicationDetails, ProfileSource, ResumeDetail

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


def prepare_draft_for_job(
    job: Job,
    candidate: Optional[dict] = None,
    *,
    resume: ResumeDetail | None = None,
    details: ApplicationDetails | None = None,
    assisted_questions: list[ScreeningQuestionAnswer] | None = None,
    form_status: Literal["loaded", "partial", "unavailable"] | None = None,
) -> ApplicationDraft:
    """
    Create a new application draft for a target job.
    Uses recommended resume and populates answers only from verified facts.
    """
    if resume is not None:
        if resume.confirmed_facts is None or details is None or details.candidate_name is None:
            raise ValueError("Confirm a resume and candidate name before creating a personalized draft.")
        candidate_name = details.candidate_name
        selected_resume = resume.filename
        verified_facts, evidence_by_key = _personalized_answers(resume, details)
    else:
        if job.recommended_resume is None:
            raise ValueError("A demo draft requires a sample resume.")
        selected_resume = job.recommended_resume
        cand = candidate or SYNTHETIC_CANDIDATE
        candidate_name = cand["name"]
        verified_facts = cand.get("verified_facts", {})
        evidence_by_key = {}

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
                evidence=evidence_by_key.get(fact_key, []),
            )
        )

    if assisted_questions is not None:
        screening_questions = [
            _prefill_assisted_question(question, verified_facts, evidence_by_key)
            for question in assisted_questions
        ]
    missing = [
        q.id
        for q in screening_questions
        if q.required and not (q.answer and q.answer.strip())
    ]
    ready = not missing and form_status != "unavailable"
    now_iso = datetime.now(timezone.utc).isoformat()

    return ApplicationDraft(
        id=f"draft-{uuid.uuid4().hex[:10]}",
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        candidate_name=candidate_name,
        selected_resume=selected_resume,
        resume_id=resume.id if resume is not None else None,
        contact=resume.confirmed_contact if resume is not None else None,
        mode="assisted" if job.application_mode == "assisted" else "personalized" if resume is not None else "demo",
        apply_url=job.apply_url,
        form_status=form_status,
        screening_questions=screening_questions,
        missing_required_questions=missing,
        ready_for_review=ready,
        created_at=now_iso,
        updated_at=now_iso,
    )


QUESTION_SKILLS = {
    "python_experience": (PYTHON, WEB_FRAMEWORK),
    "sql_experience": (SQL,),
    "data_analysis": (PANDAS, DATA_VISUALIZATION),
}

ASSISTED_FACT_LABELS = {
    "email": "email",
    "email address": "email",
    "phone": "phone",
    "phone number": "phone",
    "mobile number": "phone",
    "linkedin": "linkedin",
    "linkedin url": "linkedin",
    "linkedin profile": "linkedin",
    "linkedin profile url": "linkedin",
    "github": "github",
    "github url": "github",
    "github profile": "github",
    "github profile url": "github",
    "availability": "availability",
    "what is your availability": "availability",
    "what is your earliest start date and weekly availability": "availability",
    "are you legally authorized to work in the uk": "work_authorization",
    "are you legally authorised to work in the uk": "work_authorization",
    "are you legally authorized to work in the united kingdom": "work_authorization",
    "are you legally authorized to work in the uk for this role": "work_authorization",
}


def _prefill_assisted_question(
    question: ScreeningQuestionAnswer,
    facts: dict[str, str],
    evidence: dict[str, list[AnswerEvidence]],
) -> ScreeningQuestionAnswer:
    key = ASSISTED_FACT_LABELS.get(normalize_skill(question.question.rstrip("?")))
    if key is None or key not in facts:
        return question
    answer = facts[key]
    if question.choices:
        choices = {choice.casefold(): choice for choice in question.choices}
        if key != "work_authorization" or set(choices) != {"yes", "no"}:
            return question
        answer = choices["yes" if evidence[key][0].value == "authorized" else "no"]
    return question.model_copy(update={"answer": answer, "source": "verified_profile", "evidence": evidence[key]})


def _personalized_answers(
    resume: ResumeDetail, details: ApplicationDetails
) -> tuple[dict[str, str], dict[str, list[AnswerEvidence]]]:
    answers: dict[str, str] = {}
    evidence: dict[str, list[AnswerEvidence]] = {}
    source = ProfileSource(resume_id=resume.id, filename=resume.filename)
    if resume.confirmed_contact:
        for field, value in resume.confirmed_contact.model_dump(exclude_none=True).items():
            answers[field] = value
            evidence[field] = [AnswerEvidence(value=value, resume=source)]
    skills = resume.confirmed_facts.skills if resume.confirmed_facts else []
    for question, requirements in QUESTION_SKILLS.items():
        accepted = {name for requirement in requirements for name in requirement.accepted_names}
        matches = list(dict.fromkeys(skill for skill in skills if normalize_skill(skill) in accepted))
        if matches:
            answers[question] = "Confirmed skills: " + ", ".join(matches) + "."
            evidence[question] = [AnswerEvidence(value=skill, resume=source) for skill in matches]

    if details.availability is not None:
        answers["availability"] = details.availability
        evidence["availability"] = [AnswerEvidence(value=details.availability, profile_field="availability")]
    if details.uk_work_authorization is not None:
        authorization = {
            "authorized": "Yes, I am legally authorized to work in the UK.",
            "not_authorized": "No, I am not legally authorized to work in the UK.",
        }[details.uk_work_authorization]
        answers["work_authorization"] = authorization
        evidence["work_authorization"] = [
            AnswerEvidence(value=details.uk_work_authorization, profile_field="uk_work_authorization")
        ]
    return answers, evidence


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
                if question.choices and cleaned not in question.choices:
                    raise ValueError(f"Choose an available option for question '{question.id}'.")
                question.answer = cleaned
                question.source = "user_supplied"
            else:
                question.answer = None
                question.source = None
            question.evidence = []

    # Re-evaluate missing required questions and review readiness
    draft.missing_required_questions = [
        q.id
        for q in draft.screening_questions
        if q.required and not (q.answer and q.answer.strip())
    ]
    draft.ready_for_review = not draft.missing_required_questions and draft.form_status != "unavailable"
    draft.updated_at = datetime.now(timezone.utc).isoformat()

    return draft
