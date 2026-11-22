"""Data models for GetSwydd API."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class HealthResponse(BaseModel):
    """Response model for service health check."""
    status: str = Field(default="healthy", description="Current service health status")
    service: str = Field(default="getswydd-api", description="Service name")
    version: str = Field(default="0.1.0", description="API version")


class Job(BaseModel):
    """Model representing an open job posting."""
    id: str = Field(..., description="Unique job identifier")
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Hiring company name")
    location: str = Field(..., description="Job location or Remote status")
    eligibility: str = Field(..., description="Eligibility criteria or required background")
    recommended_resume: str = Field(..., description="Recommended resume profile or file to use")
    description: Optional[str] = Field(default=None, description="Brief description of the role")
    posted_date: Optional[str] = Field(default=None, description="Date posted in ISO format")


class JobListResponse(BaseModel):
    """Response model for job listing endpoint."""
    total: int = Field(..., description="Total number of jobs returned")
    jobs: List[Job] = Field(..., description="List of jobs")


class ScreeningQuestionAnswer(BaseModel):
    """Screening question item with answer and source."""
    id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="Screening question text")
    required: bool = Field(default=True, description="Whether this question is mandatory")
    answer: Optional[str] = Field(default=None, description="Answer text, or None if unanswered")
    source: Optional[str] = Field(default=None, description="Origin of answer: 'verified_profile' or 'user_supplied'")


class DraftCreateRequest(BaseModel):
    """Request payload to initiate a new application draft."""
    job_id: str = Field(..., description="ID of the job to apply for")


class UpdateAnswersRequest(BaseModel):
    """Request payload to update screening answers for an existing draft."""
    answers: Dict[str, str] = Field(..., description="Mapping of question id to answer text")


class ApplicationDraft(BaseModel):
    """Model representing an application draft in progress or ready for review."""
    id: str = Field(..., description="Unique draft identifier")
    job_id: str = Field(..., description="Target job ID")
    job_title: str = Field(..., description="Target job title")
    company: str = Field(..., description="Hiring company")
    candidate_name: str = Field(..., description="Candidate name")
    selected_resume: str = Field(..., description="Recommended resume selected for this application")
    screening_questions: List[ScreeningQuestionAnswer] = Field(..., description="List of screening questions and answers")
    missing_required_questions: List[str] = Field(..., description="Question IDs that require user answers")
    ready_for_review: bool = Field(..., description="True if all required questions have answers")
    created_at: str = Field(..., description="Creation timestamp in ISO 8601")
    updated_at: str = Field(..., description="Last update timestamp in ISO 8601")
