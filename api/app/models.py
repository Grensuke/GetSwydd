"""Data models for GetSwydd API."""
from pydantic import BaseModel, Field, StrictBool
from typing import Dict, List, Literal, Optional

from app.resume_models import ProfileFact, ProfileSource


class HealthResponse(BaseModel):
    """Response model for service health check."""
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="getswydd-api", description="Service name")
    version: str = Field(default="0.1.0", description="API version")


class RequirementMatch(BaseModel):
    label: str
    status: Literal["evidence_found", "no_confirmed_evidence", "needs_confirmation"]
    evidence: list[ProfileFact] = Field(default_factory=list)


class ResumeRecommendation(ProfileSource):
    covered_requirements: list[str]


class JobMatch(BaseModel):
    has_confirmed_profile: bool
    requirements: list[RequirementMatch]
    matched_skills: int
    total_skills: int
    recommended_resume: ResumeRecommendation | None = None
    scope: Literal["listed_requirements", "description_mentions"] = "listed_requirements"


class Job(BaseModel):
    """Model representing an open job posting."""
    id: str = Field(..., description="Unique job identifier")
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Hiring company name")
    location: str = Field(..., description="Job location or Remote status")
    eligibility: str | None = Field(default=None, description="Structured eligibility criteria, when available")
    recommended_resume: str | None = Field(default=None, description="Sample resume used in the test application workflow")
    description: Optional[str] = Field(default=None, description="Brief description of the role")
    posted_date: Optional[str] = Field(default=None, description="Date posted in ISO format")
    match: JobMatch | None = None
    source: Literal["demo", "greenhouse"] = "demo"
    application_mode: Literal["demo", "assisted"] = "demo"
    apply_url: str | None = None
    source_updated_at: str | None = None
    source_fetched_at: str | None = None


class JobListResponse(BaseModel):
    """Response model for job listing endpoint."""
    total: int = Field(..., description="Total number of jobs returned")
    jobs: List[Job] = Field(..., description="List of jobs")


class AnswerEvidence(BaseModel):
    value: str
    resume: ProfileSource | None = None
    profile_field: Literal["availability", "uk_work_authorization"] | None = None


class ScreeningQuestionAnswer(BaseModel):
    """Screening question item with answer and source."""
    id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="Screening question text")
    required: bool = Field(default=True, description="Whether this question is mandatory")
    answer: Optional[str] = Field(default=None, description="Answer text, or None if unanswered")
    source: Optional[str] = Field(default=None, description="Origin of answer: 'verified_profile' or 'user_supplied'")
    evidence: list[AnswerEvidence] = Field(default_factory=list)
    choices: list[str] = Field(default_factory=list)


class DraftCreateRequest(BaseModel):
    """Request payload to initiate a new application draft."""
    job_id: str = Field(..., description="ID of the job to apply for")
    resume_id: str | None = Field(default=None, min_length=1, description="Reviewed upload for a personalized draft")


class UpdateAnswersRequest(BaseModel):
    """Request payload to update screening answers for an existing draft."""
    answers: Dict[str, str] = Field(..., description="Mapping of question id to answer text")


class SubmitDraftRequest(BaseModel):
    approved: StrictBool
    draft_updated_at: str = Field(min_length=1)


class ReportSubmissionRequest(BaseModel):
    submitted: StrictBool


class SubmissionReceipt(BaseModel):
    id: str
    draft_id: str
    job_title: str
    company: str
    selected_resume: str
    approved_updated_at: str
    submitted_at: str
    destination: Literal["local_test_employer"] = "local_test_employer"
    status: Literal["submitted"] = "submitted"


class ApplicationDraft(BaseModel):
    """Model representing an application draft in progress or ready for review."""
    id: str = Field(..., description="Unique draft identifier")
    job_id: str = Field(..., description="Target job ID")
    job_title: str = Field(..., description="Target job title")
    company: str = Field(..., description="Hiring company")
    candidate_name: str = Field(..., description="Candidate name")
    selected_resume: str = Field(..., description="Recommended resume selected for this application")
    resume_id: str | None = None
    mode: Literal["demo", "personalized", "assisted"] = "demo"
    apply_url: str | None = None
    form_status: Literal["loaded", "partial", "unavailable"] | None = None
    reported_submitted_at: str | None = None
    screening_questions: List[ScreeningQuestionAnswer] = Field(..., description="List of screening questions and answers")
    missing_required_questions: List[str] = Field(..., description="Question IDs that require user answers")
    ready_for_review: bool = Field(..., description="True if all required questions have answers")
    created_at: str = Field(..., description="Creation timestamp in ISO 8601")
    updated_at: str = Field(..., description="Last update timestamp in ISO 8601")
    submission: Optional[SubmissionReceipt] = None


class AssistedApplication(BaseModel):
    draft_id: str
    job_id: str
    job_title: str
    company: str
    selected_resume: str
    apply_url: str
    status: Literal["draft", "submitted"]
    status_source: Literal["getswydd", "user_reported"]
    reported_submitted_at: str | None
    updated_at: str
