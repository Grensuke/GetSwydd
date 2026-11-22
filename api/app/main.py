"""FastAPI application entry point for GetSwydd."""
from contextlib import asynccontextmanager
from typing import List, Literal
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

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
    REFRESH_LOCK,
    BoardConfigError,
    BoardRefresh,
    PostingClosed,
    configured_boards,
    fetch_assisted_form,
    find_imported_job,
    imported_jobs,
    refresh_boards,
)
from app.job_search import filter_jobs, match_sort_key
from app.matching import match_jobs
from app.models import (
    ApplicationDraft,
    AssistedApplication,
    DraftCreateRequest,
    HealthResponse,
    Job,
    JobListResponse,
    JobSearchPreferences,
    ReportSubmissionRequest,
    SubmissionReceipt,
    SubmitDraftRequest,
    UpdateAnswersRequest,
)
from app.services import prepare_draft_for_job
from app.resume_routes import router as resume_router
from app.resume_store import get_application_details, get_confirmed_profile, get_resume


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on application startup."""
    init_db()
    yield


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
    source: Literal["demo", "greenhouse", "all"] = "demo",
    q: str = Query(default="", max_length=120),
    location: str = Query(default="", max_length=120),
    internships_only: bool | None = None,
    use_preferences: bool = False,
    sort: Literal["default", "match"] = "default",
    offset: int = Query(default=0, ge=0),
    limit: int | None = Query(default=None, ge=1, le=100),
) -> JobListResponse:
    """Return sample jobs, imported jobs, or both using the locally confirmed profile."""
    jobs = list(SYNTHETIC_JOBS) if source in {"demo", "all"} else []
    if source in {"greenhouse", "all"}:
        try:
            jobs.extend(imported_jobs(configured_boards()))
        except BoardConfigError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

    preferences = get_job_preferences() if use_preferences else JobSearchPreferences()
    filtered = filter_jobs(jobs, preferences, query=q, location=location, internships_only=internships_only)
    profile = get_confirmed_profile()
    end = None if limit is None else offset + limit
    if sort == "match":
        ordered = sorted(match_jobs(filtered, profile), key=match_sort_key)
        page = ordered[offset:end]
    else:
        page = match_jobs(filtered[offset:end], profile)
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
        boards = configured_boards()
    except BoardConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    if not boards:
        return []
    if not REFRESH_LOCK.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A Greenhouse refresh is already running.")
    try:
        return refresh_boards(boards)
    finally:
        REFRESH_LOCK.release()


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
    if payload.job_id.startswith("greenhouse:"):
        try:
            job = find_imported_job(payload.job_id, configured_boards())
        except BoardConfigError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
    else:
        job = next((j for j in SYNTHETIC_JOBS if j.id == payload.job_id), None)
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
    if assisted:
        try:
            form = fetch_assisted_form(job)
        except PostingClosed as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    draft = prepare_draft_for_job(
        job, resume=resume, details=details,
        assisted_questions=form.questions if form else None,
        form_status=form.status if form else None,
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
