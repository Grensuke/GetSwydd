"""Extract candidate review suggestions from locally uploaded resumes."""
import re
from io import BytesIO
from unicodedata import normalize
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile

from docx import Document
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from pypdf.generic import DictionaryObject
from pydantic import ValidationError

from app.resume_models import ResumeContact, ResumeFacts

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
    "achievements & certifications": "mixed_certifications",
    "achievements and certifications": "mixed_certifications",
    "competitive programming": None,
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
CONTACT_URL = re.compile(r"(?:https?://)?(?:[\w.-]+\.)?linkedin\.com/in/[^\s|<>]+|(?:https?://)?(?:www\.)?github\.com/[^\s|<>]+", re.I)
EMAIL = re.compile(r"[\w.+%-]+@[\w.-]+\.[a-z]{2,}", re.I)
PHONE = re.compile(r"(?<![\w+])(?:\+\d{1,3}[ .-]?)?\(?\d{2,5}\)?(?:[ .-]?\d{2,5}){1,4}(?!\w)")
BULLET = re.compile(r"^[-•●·▪]\s+")
SKILL_SPLIT = re.compile(r"[,;|](?![^()]*\))")
CERTIFICATION = re.compile(r"\b(?:certifi\w*|credential|oracle cloud infrastructure)\b", re.I)


class ResumeParseError(ValueError):
    """A resume could not be read within the supported document limits."""


def parse_resume(content: bytes, extension: str) -> tuple[str, ResumeFacts, ResumeContact]:
    targets = []
    try:
        if extension == ".pdf":
            reader = PdfReader(BytesIO(content))
            if reader.is_encrypted:
                raise ResumeParseError("Upload an unlocked PDF.")
            if len(reader.pages) > 25:
                raise ResumeParseError("Upload a PDF with 25 pages or fewer.")
            sections = []
            for page in reader.pages:
                layout = page.extract_text(extraction_mode="layout", layout_mode_space_vertically=False)
                sections.append(layout or page.extract_text() or "")
                for annotation in page.get("/Annots", []) or []:
                    annotation = annotation.get_object()
                    if not isinstance(annotation, DictionaryObject) or annotation.get("/Subtype") != "/Link":
                        continue
                    action = annotation.get("/A")
                    action = action.get_object() if action is not None else None
                    if isinstance(action, DictionaryObject) and action.get("/S") == "/URI":
                        uri = action.get("/URI")
                        if isinstance(uri, str):
                            targets.append(uri)
        else:
            with ZipFile(BytesIO(content)) as archive:
                entries = archive.infolist()
                if len(entries) > 1000 or sum(entry.file_size for entry in entries) > 30 * 1024 * 1024:
                    raise ResumeParseError("This DOCX expands beyond the supported size.")
            document = Document(BytesIO(content))
            sections = []
            for block in document.iter_inner_content():
                if isinstance(block, Paragraph):
                    paragraphs = [block]
                else:
                    paragraphs = [paragraph for row in block.rows for cell in row.cells for paragraph in cell.paragraphs]
                for paragraph in paragraphs:
                    sections.append(paragraph.text)
                    targets.extend(link.url for link in paragraph.hyperlinks if link.url)
    except ResumeParseError:
        raise
    except Exception as error:
        raise ResumeParseError("Could not read this document. Try exporting it again as PDF or DOCX.") from error

    text = "\n".join(re.sub(r" {3,}", "  ", line).strip()
                     for section in sections for line in section.splitlines()).strip()
    if not text:
        raise ResumeParseError("No readable text found. Upload a text-based PDF or DOCX.")
    if len(text) > MAX_TEXT_CHARS:
        raise ResumeParseError("The extracted text is too long. Upload a shorter resume.")
    text = normalize("NFKC", text)
    return text, suggest_facts(text), _suggest_contact(text, targets)


def _suggest_contact(text: str, targets: list[str]) -> ResumeContact:
    header = []
    for line in text.splitlines()[:14]:
        if line.split(":", 1)[0].casefold().strip() in HEADINGS:
            break
        header.append(line)
    header_text = "\n".join(header)
    candidates = {"email": [], "phone": [], "linkedin": [], "github": []}
    for target in targets + CONTACT_URL.findall(header_text):
        try:
            url = urlsplit(target if ":" in target else f"https://{target}")
        except ValueError:
            continue
        if url.scheme == "mailto":
            candidates["email"].append(unquote(url.path))
        elif url.scheme == "tel":
            candidates["phone"].append(unquote(url.path))
        elif url.scheme in {"http", "https"}:
            candidates["linkedin"].append(url.geturl().rstrip(".,;)"))
            candidates["github"].append(url.geturl().rstrip(".,;)"))
    candidates["email"].extend(EMAIL.findall(header_text))
    candidates["phone"].extend(
        phone.strip() for phone in PHONE.findall(header_text) if 10 <= len(re.sub(r"\D", "", phone)) <= 15
    )
    found = {}
    for field, values in candidates.items():
        valid = set()
        for value in values:
            try:
                valid.add(ResumeContact.model_validate({field: value}).model_dump()[field])
            except ValidationError:
                continue
        if field == "phone":
            # Link and visible text can present the same number with different spacing.
            numbers = {re.sub(r"\D", "", value) for value in valid}
            if len(numbers) == 1 or (len(numbers) == 2 and any(
                len(shorter) == 10 and "91" + shorter in numbers for shorter in numbers
            )):
                found[field] = max(valid, key=lambda value: (len(re.sub(r"\D", "", value)), value.startswith("+"), value))
        elif len(valid) == 1:
            found[field] = valid.pop()
    return ResumeContact.model_validate(found)


def suggest_facts(text: str) -> ResumeFacts:
    groups: dict[str, list[str]] = {name: [] for name in ResumeFacts.model_fields}
    seen: dict[str, set[str]] = {name: set() for name in groups}
    category = None
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        index += 1
        line = line.strip()
        heading, _, remainder = line.partition(":")
        normalized = " ".join(heading.casefold().split())
        if normalized in HEADINGS:
            category = HEADINGS[normalized]
            line = remainder.strip()
        if not category or not line:
            continue

        is_bullet = bool(BULLET.match(line))
        line = BULLET.sub("", line)
        if is_bullet and category != "skills":
            while index < len(lines):
                continuation = lines[index].strip()
                if (not continuation or BULLET.match(continuation) or "|" in continuation
                        or continuation.split(":", 1)[0].casefold().strip() in HEADINGS
                        or line.endswith((".", "!", "?")) or len(line) + len(continuation) + 1 > 350):
                    break
                line += " " + continuation
                index += 1
        target = category
        if category == "mixed_certifications":
            if not CERTIFICATION.search(line):
                continue
            target = "certifications"
        if category == "skills":
            prefix, separator, content = line.partition(":")
            if separator and re.fullmatch(r"[\w /&+-]{1,40}", prefix):
                line = content
        items = SKILL_SPLIT.split(line) if category == "skills" else [line]
        for item in items:
            value = item.strip()
            key = value.casefold()
            if value and len(value) <= 350 and len(groups[target]) < 80 and key not in seen[target]:
                groups[target].append(value)
                seen[target].add(key)
    return ResumeFacts.model_validate(groups)
