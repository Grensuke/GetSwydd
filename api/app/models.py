"""Data models for GetSwydd API."""
from typing import Annotated, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, model_validator

from app.resume_models import ProfileFact, ProfileSource, ResumeContact


class HealthResponse(BaseModel):
    """Response model for service health check."""
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="getswydd-api", description="Service name")
    version: str = Field(default="0.1.0", description="API version")


class RequirementMatch(BaseModel):
    label: str
    status: Literal["evidence_found", "no_confirmed_evidence", "needs_confirmation", "not_met"]
    evidence: list[ProfileFact] = Field(default_factory=list)
    kind: Literal["required_skill", "mentioned_skill", "manual_check"] = "mentioned_skill"
    confirmation_source: Literal["profile.uk_work_authorization"] | None = None


class ResumeRecommendation(ProfileSource):
    covered_requirements: list[str]


class JobMatch(BaseModel):
    has_confirmed_profile: bool
    requirements: list[RequirementMatch]
    matched_skills: int
    total_skills: int
    recommended_resume: ResumeRecommendation | None = None
    scope: Literal["listed_requirements", "description_mentions"] = "listed_requirements"
    eligibility_status: Literal[
        "not_established", "needs_confirmation", "missing_evidence", "listed_requirements_supported", "not_met"
    ] = "not_established"


JobSource = Literal["demo", "greenhouse", "lever", "ashby"]
Workplace = Literal["remote", "hybrid", "onsite"]
Employment = Literal["internship", "full_time", "part_time", "contract", "temporary"]
ExperienceLevel = Literal["intern", "entry", "mid", "senior"]
PayPeriod = Literal["hour", "week", "month", "year", "one_time"]
Currency = Annotated[str, StringConstraints(to_upper=True, pattern=r"^[A-Z]{3}$")]


class PayFloor(BaseModel):
    amount: float = Field(gt=0, allow_inf_nan=False)
    currency: Currency
    period: PayPeriod


class CompensationRange(BaseModel):
    minimum: float = Field(ge=0, allow_inf_nan=False)
    maximum: float = Field(ge=0, allow_inf_nan=False)
    currency: Currency
    period: PayPeriod

    @model_validator(mode="after")
    def range_is_ordered(self) -> "CompensationRange":
        if self.minimum > self.maximum:
            raise ValueError("Compensation minimum cannot exceed maximum.")
        return self


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
    source: JobSource = "demo"
    application_mode: Literal["demo", "assisted"] = "demo"
    email_application_available: bool = False
    apply_url: str | None = None
    source_updated_at: str | None = None
    source_fetched_at: str | None = None
    workplace: Workplace | None = None
    employment: Employment | None = None
    experience_level: ExperienceLevel | None = None
    additional_locations: list[str] = Field(default_factory=list)
    compensation: list[CompensationRange] = Field(default_factory=list)
    application_deadline: str | None = None


class JobListResponse(BaseModel):
    """Response model for job listing endpoint."""
    total: int = Field(..., description="Total number of jobs returned")
    jobs: List[Job] = Field(..., description="List of jobs")


SearchTerm = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120, pattern=r"\w")]
SearchTerms = Annotated[list[SearchTerm], Field(max_length=10)]


class JobSearchPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role_keywords: SearchTerms = Field(default_factory=list)
    location_keywords: SearchTerms = Field(default_factory=list)
    internships_only: StrictBool = False
    workplace_modes: list[Workplace] = Field(default_factory=list)
    employment_types: list[Employment] = Field(default_factory=list)
    experience_levels: list[ExperienceLevel] = Field(default_factory=list)
    minimum_pay: PayFloor | None = None
    include_unknown: StrictBool = False


class JobAlert(BaseModel):
    id: str
    job_id: str
    job_title: str
    company: str
    location: str
    apply_url: str | None
    application_deadline: str | None
    created_at: str
    read_at: str | None = None


class AnalyzeJobRequest(BaseModel):
    use_semantic: StrictBool = False


class SemanticResumeMatch(ProfileSource):
    similarity: float


class JobAnalysis(BaseModel):
    job: Job
    summary: str
    semantic_status: Literal["disabled", "not_configured", "insufficient_data", "available", "unavailable"]
    semantic_resume_matches: list[SemanticResumeMatch] = Field(default_factory=list)


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


class ApplicationEmail(BaseModel):
    recipient: str
    instruction: str
    subject: str
    body: str


class ApplicationDraft(BaseModel):
    """Model representing an application draft in progress or ready for review."""
    id: str = Field(..., description="Unique draft identifier")
    job_id: str = Field(..., description="Target job ID")
    job_title: str = Field(..., description="Target job title")
    company: str = Field(..., description="Hiring company")
    candidate_name: str = Field(..., description="Candidate name")
    selected_resume: str = Field(..., description="Recommended resume selected for this application")
    resume_id: str | None = None
    contact: ResumeContact | None = None
    mode: Literal["demo", "personalized", "assisted"] = "demo"
    apply_url: str | None = None
    form_status: Literal["loaded", "partial", "unavailable"] | None = None
    reported_submitted_at: str | None = None
    greenhouse_form_hash: str | None = None
    application_email: ApplicationEmail | None = None
    employer_submission_status: Literal["sending", "uncertain", "submitted"] | None = None
    employer_submission_source: Literal["greenhouse", "gmail"] | None = None
    employer_receipt_id: str | None = None
    employer_submitted_at: str | None = None
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
    status: Literal["draft", "submitted", "unconfirmed"]
    status_source: Literal["getswydd", "user_reported", "greenhouse", "gmail"]
    reported_submitted_at: str | None
    employer_submitted_at: str | None = None
    updated_at: str
