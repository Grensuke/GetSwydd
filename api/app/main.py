"""FastAPI application entry point for GetSwydd."""
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.db import (
    DraftConflict,
    deliver_to_test_employer,
    edit_draft,
    get_draft,
    init_db,
    list_test_submissions,
    save_draft,
)
from app.models import (
    ApplicationDraft,
    DraftCreateRequest,
    HealthResponse,
    Job,
    JobListResponse,
    SubmissionReceipt,
    SubmitDraftRequest,
    UpdateAnswersRequest,
)
from app.services import prepare_draft_for_job


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
def get_jobs() -> JobListResponse:
    """Return synthetic job opportunities validated via Pydantic."""
    return JobListResponse(
        total=len(SYNTHETIC_JOBS),
        jobs=SYNTHETIC_JOBS,
    )


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
    job = next((j for j in SYNTHETIC_JOBS if j.id == payload.job_id), None)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found with ID '{payload.job_id}'",
        )

    draft = prepare_draft_for_job(job)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
