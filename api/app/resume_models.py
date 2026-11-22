from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

FactCategory = Literal["skills", "education", "experience", "projects", "certifications"]
FactText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=350)]
FactList = Annotated[list[FactText], Field(max_length=80)]


class ResumeFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skills: FactList = Field(default_factory=list)
    education: FactList = Field(default_factory=list)
    experience: FactList = Field(default_factory=list)
    projects: FactList = Field(default_factory=list)
    certifications: FactList = Field(default_factory=list)


class ResumeSummary(BaseModel):
    id: str
    filename: str
    uploaded_at: str
    reviewed: bool


class ResumeDetail(ResumeSummary):
    extracted_text: str
    suggested_facts: ResumeFacts
    confirmed_facts: ResumeFacts | None
    revision: int


class ResumeReview(BaseModel):
    facts: ResumeFacts
    revision: int = Field(ge=0)


class ProfileSource(BaseModel):
    resume_id: str
    filename: str


class ProfileFact(BaseModel):
    category: FactCategory
    value: str
    sources: list[ProfileSource]


class ConfirmedProfile(BaseModel):
    facts: list[ProfileFact]
