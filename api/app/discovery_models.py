"""Request, model plan, and evidence returned by the discovery agent."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints

from app.job_sources import ExternalSource, SourceRefresh
from app.models import Employment, ExperienceLevel, JobMatch, JobSearchPreferences, PayPeriod, Workplace
from app.resume_models import ProfileSource


class DiscoveryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1500)]
    resume_id: str | None = Field(default=None, min_length=1, max_length=120)
    limit: int | None = Field(default=None, ge=1, le=10)
    refresh: StrictBool = False


class DiscoveryPay(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: float
    currency: str
    period: PayPeriod


class DiscoveryPlan(BaseModel):
    """The model specifies what to search. The server decides how tools run."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["search", "clarify", "out_of_scope"]
    role_keywords: list[str]
    skill_groups: list[list[str]]
    company_keywords: list[str]
    location_keywords: list[str]
    workplace_modes: list[Workplace]
    employment_types: list[Employment]
    experience_levels: list[ExperienceLevel]
    minimum_pay: DiscoveryPay | None
    sources: list[ExternalSource]
    applicant_location: str | None
    require_listed_applicant_location: bool
    resume_hint: str | None
    closing_within_days: int | None
    result_limit: int | None
    ignore_saved_preferences: bool
    clarification: str | None


class DiscoveryFilters(BaseModel):
    preferences: JobSearchPreferences
    company_keywords: list[str]
    skill_groups: list[list[str]]
    sources: list[ExternalSource]
    applicant_location: str | None
    require_listed_applicant_location: bool
    closing_within_days: int | None
    limit: int


class LocationCheck(BaseModel):
    status: Literal["not_requested", "listed_location", "needs_confirmation"]
    evidence: str | None = None


class DiscoveryJob(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    source: ExternalSource
    apply_url: str
    application_deadline: str | None
    match: JobMatch | None
    applicant_location_check: LocationCheck


class DiscoveryResponse(BaseModel):
    status: Literal["results", "no_results", "needs_clarification", "out_of_scope"]
    message: str
    filters: DiscoveryFilters | None = None
    selected_resume: ProfileSource | None = None
    resume_options: list[ProfileSource] = Field(default_factory=list)
    jobs: list[DiscoveryJob] = Field(default_factory=list)
    total_matches: int = 0
    refresh_sources: list[SourceRefresh] = Field(default_factory=list)
    refresh_in_progress: bool = False
