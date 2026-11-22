from pathlib import PurePosixPath

from fastapi import APIRouter, HTTPException, UploadFile

from app.resume_models import ConfirmedProfile, ResumeDetail, ResumeReview, ResumeSummary
from app.resume_parser import MAX_FILE_BYTES, ResumeParseError, parse_resume
from app.resume_store import (
    StaleResumeReview,
    confirm_resume,
    get_confirmed_profile,
    get_resume,
    list_resumes,
    store_resume,
)

router = APIRouter(prefix="/api/v1", tags=["Resumes and profile"])


@router.post("/resumes", response_model=ResumeDetail, status_code=201)
def upload_resume(file: UploadFile) -> ResumeDetail:
    filename = PurePosixPath((file.filename or "").replace("\\", "/")).name
    extension = PurePosixPath(filename).suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise HTTPException(status_code=415, detail="Choose a PDF or DOCX resume.")
    content = file.file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Choose a resume that is 5 MB or smaller.")
    try:
        text, facts = parse_resume(content, extension)
    except ResumeParseError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return store_resume(filename, content, text, facts)


@router.get("/resumes", response_model=list[ResumeSummary])
def get_resume_list() -> list[ResumeSummary]:
    return list_resumes()


@router.get("/resumes/{resume_id}", response_model=ResumeDetail)
def get_resume_detail(resume_id: str) -> ResumeDetail:
    result = get_resume(resume_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return result


@router.put("/resumes/{resume_id}/review", response_model=ResumeDetail)
def save_resume_review(resume_id: str, review: ResumeReview) -> ResumeDetail:
    try:
        result = confirm_resume(resume_id, review)
    except StaleResumeReview as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if result is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return result


@router.get("/profile", response_model=ConfirmedProfile)
def get_profile() -> ConfirmedProfile:
    return get_confirmed_profile()
