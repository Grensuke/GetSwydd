"""Extract candidate review suggestions from locally uploaded resumes."""
import re
from io import BytesIO
from zipfile import ZipFile

from docx import Document
from docx.text.paragraph import Paragraph
from pypdf import PdfReader

from app.resume_models import ResumeFacts

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_TEXT_CHARS = 60_000
HEADINGS = {
    "skills": "skills",
    "technical skills": "skills",
    "core competencies": "skills",
    "technologies": "skills",
    "education": "education",
    "academic background": "education",
    "experience": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "internships": "experience",
    "projects": "projects",
    "personal projects": "projects",
    "academic projects": "projects",
    "certifications": "certifications",
    "licenses and certifications": "certifications",
    "certificates": "certifications",
    "summary": None,
    "professional summary": None,
    "objective": None,
    "achievements": None,
    "awards": None,
    "languages": None,
    "interests": None,
    "volunteering": None,
    "references": None,
}


class ResumeParseError(ValueError):
    """A resume could not be read within the supported document limits."""


def parse_resume(content: bytes, extension: str) -> tuple[str, ResumeFacts]:
    try:
        if extension == ".pdf":
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise ResumeParseError("Upload an unlocked PDF.")
            if len(reader.pages) > 25:
                raise ResumeParseError("Upload a PDF with 25 pages or fewer.")
            sections = [page.extract_text() or "" for page in reader.pages]
        else:
            with ZipFile(BytesIO(content)) as archive:
                entries = archive.infolist()
                if len(entries) > 1000 or sum(entry.file_size for entry in entries) > 30 * 1024 * 1024:
                    raise ResumeParseError("This DOCX expands beyond the supported size.")
            document = Document(BytesIO(content))
            sections = []
            for block in document.iter_inner_content():
                if isinstance(block, Paragraph):
                    sections.append(block.text)
                else:
                    for row in block.rows:
                        sections.extend(cell.text for cell in row.cells)
    except ResumeParseError:
        raise
    except Exception as error:
        raise ResumeParseError("Could not read this document. Try exporting it again as PDF or DOCX.") from error

    text = "\n".join(line.strip() for section in sections for line in section.splitlines()).strip()
    if not text:
        raise ResumeParseError("No readable text found. Upload a text-based PDF or DOCX.")
    if len(text) > MAX_TEXT_CHARS:
        raise ResumeParseError("The extracted text is too long. Upload a shorter resume.")
    return text, suggest_facts(text)


def suggest_facts(text: str) -> ResumeFacts:
    groups: dict[str, list[str]] = {name: [] for name in ResumeFacts.model_fields}
    seen: dict[str, set[str]] = {name: set() for name in groups}
    category = None
    for line in text.splitlines():
        line = line.strip()
        heading, _, remainder = line.partition(":")
        normalized = " ".join(heading.casefold().split())
        if normalized in HEADINGS:
            category = HEADINGS[normalized]
            line = remainder.strip()
        if not category or not line:
            continue

        line = re.sub(r"^[-•·▪]\s+", "", line)
        items = re.split(r"[,;|]", line) if category == "skills" else [line]
        for item in items:
            value = item.strip()
            key = value.casefold()
            if value and len(value) <= 350 and len(groups[category]) < 80 and key not in seen[category]:
                groups[category].append(value)
                seen[category].add(key)
    return ResumeFacts.model_validate(groups)
