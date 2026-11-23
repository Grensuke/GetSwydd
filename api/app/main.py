"""FastAPI application entry point for GetSwydd."""
import asyncio
import os
from contextlib import asynccontextmanager, suppress
from typing import List, Literal
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.discovery_routes import router as discovery_router
from app.db import (
    DraftConflict,
    deliver_to_test_employer,
    edit_draft,
    get_draft,
    get_job_preferences,
    init_db,
    list_assisted_applications,
    list_test_submissions,
    report_assisted_submission,
    save_draft,
    save_job_preferences,
)
from app.greenhouse import (
    BoardConfigError,
    BoardRefresh,
    PostingClosed,
    configured_boards,
    fetch_assisted_form,
    find_imported_job,
)
from app.job_alerts import RefreshBusy, list_alerts, read_alert, refresh_catalog, scheduled_refresh
from app.job_analysis import analyze_job
from app.job_search import filter_jobs, match_sort_key
from app.job_sources import PUBLIC_SOURCES, SourceRefresh, live_jobs
from app.matching import match_jobs
from app.models import (
    AnalyzeJobRequest,
    ApplicationDraft,
    AssistedApplication,
    DraftCreateRequest,
    Employment,
    ExperienceLevel,
    HealthResponse,
    Job,
    JobAlert,
    JobAnalysis,
    JobListResponse,
    JobSearchPreferences,
    ReportSubmissionRequest,
    SubmissionReceipt,
    SubmitDraftRequest,
    UpdateAnswersRequest,
    Workplace,
)
from app.services import prepare_draft_for_job
from app.resume_routes import router as resume_router
from app.resume_store import get_application_details, get_confirmed_profile, get_resume


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on application startup."""
    init_db()
    interval = int(os.getenv("GETSWYDD_SEARCH_INTERVAL_MINUTES", "0"))
    if interval != 0 and not 5 <= interval <= 1440:
        raise ValueError("Set GETSWYDD_SEARCH_INTERVAL_MINUTES to 0 or a value from 5 to 1440.")
    worker = asyncio.create_task(scheduled_refresh(interval)) if interval else None
    try:
        yield
    finally:
        if worker:
            worker.cancel()
            with suppress(asyncio.CancelledError):
                await worker


app = FastAPI(
    title="GetSwydd API",
    description="Full-stack job search and application assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow local frontend origin
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(resume_router)
app.include_router(discovery_router)

# Synthetic job catalog
SYNTHETIC_JOBS: List[Job] = [
    Job(
        id="job-py-001",
        title="Python Developer Internship",
        company="Aether Labs",
        location="Cardiff, UK (Hybrid)",
        eligibility="Students or recent grads proficient in Python 3, FastAPI or Flask, and basic Git workflow",
        recommended_resume="Backend_Python_Intern_Resume.pdf",
        description="Build scalable API microservices and automated job ingestion pipelines with Python and FastAPI.",
        posted_date="2026-11-20",
    ),
    Job(
        id="job-da-002",
        title="Data Analyst Internship",
        company="Cymru Insights",
        location="Remote",
        eligibility="Proficiency in SQL, Python (pandas), and data visualization with strong communication skills",
        recommended_resume="Data_Analytics_Resume.pdf",
        description="Analyze labor market trends, extract job market insights, and assist in matching algorithms.",
        posted_date="2026-11-21",
    ),
]


@app.get("/health", response_model=HealthResponse, tags=["System"])
def get_health() -> HealthResponse:
    """Return system health status."""
    return HealthResponse(status="healthy", service="getswydd-api", version="0.1.0")


@app.get("/api/v1/jobs", response_model=JobListResponse, tags=["Jobs"])
def get_jobs(
    source: Literal["demo", "greenhouse", "lever", "ashby", "live", "all"] = "demo",
    q: str = Query(default="", max_length=120),
    location: str = Query(default="", max_length=120),
    market: Literal["all", "india"] = "all",
    internships_only: bool | None = None,
    workplace: Workplace | None = None,
    employment: Employment | None = None,
    experience_level: ExperienceLevel | None = None,
    closing_within_days: int | None = Query(default=None, ge=0, le=90),
    use_preferences: bool = False,
    sort: Literal["default", "match"] = "default",
    offset: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=100),
) -> JobListResponse:
    """Return sample jobs, imported jobs, or both using the locally confirmed profile."""
    jobs = list(SYNTHETIC_JOBS) if source in {"demo", "all"} else []
    if source != "demo":
        try:
            jobs.extend(live_jobs(PUBLIC_SOURCES if source in {"live", "all"} else (source,)))
        except BoardConfigError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    preferences = get_job_preferences() if use_preferences else JobSearchPreferences()
    if workplace:
        preferences.workplace_modes = [workplace]
    if employment:
        preferences.employment_types = [employment]
    if experience_level:
        preferences.experience_levels = [experience_level]
    filtered = filter_jobs(
        jobs, preferences, query=q, location=location,
        internships_only=internships_only, closing_within_days=closing_within_days, market=market,
    )
    profile = get_confirmed_profile()
    details = get_application_details()
    end = None if limit is None else offset + limit
    if sort == "match":
        ordered = sorted(match_jobs(filtered, profile, details), key=match_sort_key)
        page = ordered[offset:end]
    else:
        page = match_jobs(filtered[offset:end], profile, details)
    return JobListResponse(total=len(filtered), jobs=page)


@app.get("/api/v1/jobs/preferences", response_model=JobSearchPreferences, tags=["Jobs"])
def job_preferences() -> JobSearchPreferences:
    return get_job_preferences()


@app.put("/api/v1/jobs/preferences", response_model=JobSearchPreferences, tags=["Jobs"])
def update_job_preferences(preferences: JobSearchPreferences) -> JobSearchPreferences:
    return save_job_preferences(preferences)


@app.post("/api/v1/jobs/greenhouse/refresh", response_model=list[BoardRefresh], tags=["Jobs"])
def refresh_greenhouse_jobs() -> list[BoardRefresh]:
    """Refresh configured public job feeds and return their individual results."""
    try:
        sources, _ = refresh_catalog(("greenhouse",))
    except BoardConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except RefreshBusy as error:
        raise HTTPException(status_code=409, detail="A job refresh is already running.") from error
    return [BoardRefresh.model_validate(item.model_dump()) for item in sources]


class JobRefreshResult(BaseModel):
    sources: list[SourceRefresh]
    new_alerts: int


@app.post("/api/v1/jobs/refresh", response_model=JobRefreshResult, tags=["Jobs"])
def refresh_live_jobs() -> JobRefreshResult:
    try:
        sources, alerts = refresh_catalog()
    except BoardConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except RefreshBusy as error:
        raise HTTPException(status_code=409, detail="A job refresh is already running.") from error
    return JobRefreshResult(sources=sources, new_alerts=alerts)


@app.get("/api/v1/jobs/alerts", response_model=list[JobAlert], tags=["Jobs"])
def job_alerts(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[JobAlert]:
    return list_alerts(unread_only, limit, offset)


@app.put("/api/v1/jobs/alerts/{alert_id}/read", response_model=JobAlert, tags=["Jobs"])
def mark_job_alert_read(alert_id: str) -> JobAlert:
    alert = read_alert(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Job alert not found.")
    return alert


def _lookup_job(job_id: str) -> Job | None:
    provider, _, _ = job_id.partition(":")
    try:
        if provider == "greenhouse":
            return find_imported_job(job_id, configured_boards())
        if provider in {"lever", "ashby"}:
            return next((job for job in live_jobs((provider,)) if job.id == job_id), None)
    except BoardConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return next((job for job in SYNTHETIC_JOBS if job.id == job_id), None)


@app.post("/api/v1/jobs/{job_id}/analysis", response_model=JobAnalysis, tags=["Jobs"])
def job_analysis(job_id: str, payload: AnalyzeJobRequest) -> JobAnalysis:
    job = _lookup_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return analyze_job(job, get_confirmed_profile(), payload.use_semantic, get_application_details())


@app.post(
    "/api/v1/applications/drafts",
    response_model=ApplicationDraft,
    status_code=status.HTTP_201_CREATED,
    tags=["Applications"],
)
def create_draft(payload: DraftCreateRequest) -> ApplicationDraft:
    """
    Create a new application draft for a given job ID.
    Pre-populates answers only from verified facts; missing required questions
    are flagged for user input without guessing.
    """
    job = _lookup_job(payload.job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found with ID '{payload.job_id}'",
        )

    assisted = job.application_mode == "assisted"
    if assisted and payload.resume_id is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Select a reviewed resume first.")

    resume = None
    details = None
    if payload.resume_id is not None:
        resume = get_resume(payload.resume_id)
        if resume is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
        if resume.confirmed_facts is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review the selected resume first.")
        details = get_application_details()
        if details.candidate_name is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Confirm your candidate name first.")

    form = None
    if job.source == "greenhouse":
        try:
            form = fetch_assisted_form(job)
        except PostingClosed as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    draft = prepare_draft_for_job(
        job, resume=resume, details=details,
        assisted_questions=form.questions if form else None,
        form_status=form.status if form else "unavailable" if assisted else None,
    )
    save_draft(draft)
    return draft


@app.get(
    "/api/v1/applications/drafts/{draft_id}",
    response_model=ApplicationDraft,
    tags=["Applications"],
)
def retrieve_draft(draft_id: str) -> ApplicationDraft:
    """Retrieve an application draft by ID from persistent storage."""
    draft = get_draft(draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application draft not found with ID '{draft_id}'",
        )
    return draft


@app.patch(
    "/api/v1/applications/drafts/{draft_id}/answers",
    response_model=ApplicationDraft,
    tags=["Applications"],
)
@app.put(
    "/api/v1/applications/drafts/{draft_id}/answers",
    response_model=ApplicationDraft,
    tags=["Applications"],
)
def update_screening_answers(draft_id: str, payload: UpdateAnswersRequest) -> ApplicationDraft:
    """
    Update screening question answers for an application draft.
    Marks updated answers with source 'user_supplied' and updates review readiness.
    """
    try:
        updated = edit_draft(draft_id, payload.answers)
    except DraftConflict as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application draft not found with ID '{draft_id}'",
        )
    return updated


@app.post(
    "/api/v1/applications/drafts/{draft_id}/submit",
    response_model=SubmissionReceipt,
    tags=["Applications"],
)
def submit_draft(draft_id: str, payload: SubmitDraftRequest) -> SubmissionReceipt:
    """Deliver the exact approved draft to the local test employer."""
    if not payload.approved:
        raise HTTPException(
            status_code=422,
            detail="Explicit approval is required.",
        )
    try:
        receipt = deliver_to_test_employer(draft_id, payload.draft_updated_at)
    except DraftConflict as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err)) from err
    if receipt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application draft not found with ID '{draft_id}'",
        )
    return receipt


@app.get("/api/v1/applications", response_model=list[SubmissionReceipt], tags=["Applications"])
def list_submissions() -> list[SubmissionReceipt]:
    """List confirmed local test submissions for the tracker."""
    return list_test_submissions()


@app.get("/api/v1/applications/assisted", response_model=list[AssistedApplication], tags=["Applications"])
def list_assisted_drafts() -> list[AssistedApplication]:
    """List real assisted drafts and user-reported submissions."""
    return list_assisted_applications()


@app.put(
    "/api/v1/applications/drafts/{draft_id}/reported-submission",
    response_model=AssistedApplication,
    tags=["Applications"],
)
def record_reported_submission(draft_id: str, payload: ReportSubmissionRequest) -> AssistedApplication:
    """Record the user's report of submission on the employer's site."""
    if not payload.submitted:
        raise HTTPException(status_code=422, detail="Confirm that you submitted on the employer's site.")
    try:
        result = report_assisted_submission(draft_id)
    except DraftConflict as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application draft not found.")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
