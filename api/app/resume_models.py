import re
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

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


class ResumeContact(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=40)
    linkedin: str | None = Field(default=None, max_length=350)
    github: str | None = Field(default=None, max_length=350)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value is not None and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if value is not None and (
            not re.fullmatch(r"\+?[\d ().-]+", value) or not 7 <= len(re.sub(r"\D", "", value)) <= 15
        ):
            raise ValueError("Enter a phone number with 7 to 15 digits.")
        return value

    @field_validator("linkedin", "github")
    @classmethod
    def validate_profile_url(cls, value, info):
        if value is None:
            return None
        url = urlsplit(value)
        host = url.hostname or ""
        path = url.path.strip("/").split("/")
        linkedin = (host == "linkedin.com" or host.endswith(".linkedin.com")) and len(path) == 2 and path[0] == "in" and bool(path[1])
        github = host in {"github.com", "www.github.com"} and len(path) == 1 and bool(path[0])
        if (url.scheme not in {"http", "https"} or url.username is not None or url.port is not None
                or re.search(r"[\s\\]", value) or not (linkedin if info.field_name == "linkedin" else github)):
            raise ValueError(f"Enter a valid {info.field_name} profile URL.")
        return url._replace(scheme="https", netloc=host.removeprefix("www."), path=url.path.rstrip("/"),
                            query="", fragment="").geturl()


class ResumeSummary(BaseModel):
    id: str
    filename: str
    uploaded_at: str
    reviewed: bool


class ResumeDetail(ResumeSummary):
    extracted_text: str
    suggested_facts: ResumeFacts
    confirmed_facts: ResumeFacts | None
    suggested_contact: ResumeContact = Field(default_factory=ResumeContact)
    confirmed_contact: ResumeContact | None = None
    revision: int


class ResumeReview(BaseModel):
    facts: ResumeFacts
    revision: int = Field(ge=0)
    contact: ResumeContact | None = None


class ProfileSource(BaseModel):
    resume_id: str
    filename: str


class ProfileFact(BaseModel):
    category: FactCategory
    value: str
    sources: list[ProfileSource]


class ConfirmedProfile(BaseModel):
    facts: list[ProfileFact]


class GeneralApplicationDetails(BaseModel):
    """Profile details used across applications."""

    model_config = ConfigDict(extra="forbid")

    candidate_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] | None = None
    availability: FactText | None = None


class ApplicationDetails(GeneralApplicationDetails):
    """Application details, including legacy job-specific evidence."""

    uk_work_authorization: Literal["authorized", "not_authorized"] | None = None
