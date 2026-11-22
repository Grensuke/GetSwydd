from io import BytesIO

import pytest
from docx import Document
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.main import app
from app.resume_parser import MAX_FILE_BYTES


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "resumes.db"))
    with TestClient(app) as session:
        yield session


def sample_pdf():
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
    })
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({NameObject("/F1"): font}),
    })
    stream = DecodedStreamObject()
    stream.set_data(
        b"BT /F1 12 Tf 14 TL 72 720 Td (Technical Skills: Python, SQL) Tj T* "
        b"(Projects) Tj T* (Built an internship tracker) Tj ET"
    )
    page.replace_contents(stream)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def sample_docx():
    document = Document()
    document.add_heading("Technical Skills", level=1)
    document.add_paragraph("python, Git")
    document.add_heading("Education", level=1)
    document.add_paragraph("B.Tech Computer Science")
    document.add_heading("Certifications", level=1)
    document.add_table(rows=1, cols=1).cell(0, 0).text = "Python Essentials"
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def test_upload_review_and_merge_confirmed_facts(client):
    pdf = client.post("/api/v1/resumes", files={"file": ("backend.pdf", sample_pdf())})
    docx = client.post("/api/v1/resumes", files={"file": ("analytics.docx", sample_docx())})
    assert [pdf.status_code, docx.status_code] == [201, 201]
    pdf, docx = pdf.json(), docx.json()
    assert pdf["suggested_facts"]["skills"] == ["Python", "SQL"]
    assert pdf["suggested_facts"]["projects"] == ["Built an internship tracker"]
    assert docx["suggested_facts"]["education"] == ["B.Tech Computer Science"]
    assert docx["suggested_facts"]["certifications"] == ["Python Essentials"]
    assert pdf["confirmed_facts"] is None
    assert client.get("/api/v1/profile").json() == {"facts": []}

    review = {"revision": pdf["revision"], "facts": {"skills": ["Python"], "projects": ["Built a job tracker"]}}
    pdf_review_url = f"/api/v1/resumes/{pdf['id']}/review"
    response = client.put(pdf_review_url, json=review)
    assert response.status_code == 200
    assert response.json()["reviewed"] is True
    assert client.put(pdf_review_url, json=review).status_code == 409
    assert client.put(
        f"/api/v1/resumes/{docx['id']}/review",
        json={"revision": docx["revision"], "facts": docx["suggested_facts"]},
    ).status_code == 200

    facts = {fact["value"]: fact for fact in client.get("/api/v1/profile").json()["facts"]}
    assert "SQL" not in facts
    assert "Built an internship tracker" not in facts
    assert facts["Built a job tracker"]["category"] == "projects"
    assert {source["resume_id"] for source in facts["Python"]["sources"]} == {pdf["id"], docx["id"]}
    assert client.get(f"/api/v1/resumes/{pdf['id']}").json()["confirmed_facts"]["skills"] == ["Python"]
    assert all(item["reviewed"] for item in client.get("/api/v1/resumes").json())

    changed = client.put(pdf_review_url, json={"revision": response.json()["revision"], "facts": {}})
    assert changed.status_code == 200
    facts = {fact["value"]: fact for fact in client.get("/api/v1/profile").json()["facts"]}
    assert "Built a job tracker" not in facts
    assert facts["python"]["sources"] == [{"resume_id": docx["id"], "filename": "analytics.docx"}]


@pytest.mark.parametrize(
    ("filename", "content", "status_code"),
    [
        ("resume.txt", b"Skills: Python", 415),
        ("broken.docx", b"This is not a DOCX", 422),
        ("oversized.pdf", b"x" * (MAX_FILE_BYTES + 1), 413),
    ],
    ids=["wrong-format", "bad-document", "too-large"],
)
def test_rejected_upload_is_not_stored(client, filename, content, status_code):
    result = client.post("/api/v1/resumes", files={"file": (filename, content)})
    assert result.status_code == status_code
    assert client.get("/api/v1/resumes").json() == []


def test_pdf_with_no_text_explains_which_files_are_supported(client):
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    data = BytesIO()
    writer.write(data)
    response = client.post("/api/v1/resumes", files={"file": ("scan.pdf", data.getvalue())})
    assert response.status_code == 422
    assert "No readable text" in response.json()["detail"]


def test_job_matches_use_confirmed_evidence_and_recommend_a_resume_for_each_role(client):
    backend = client.post("/api/v1/resumes", files={"file": ("backend.pdf", sample_pdf())}).json()
    analytics = client.post(
        "/api/v1/resumes", files={"file": ("analytics.docx", sample_docx())}
    ).json()

    def current_matches():
        response = client.get("/api/v1/jobs")
        assert response.status_code == 200
        return {job["id"]: job["match"] for job in response.json()["jobs"]}

    initial = current_matches()
    for match in initial.values():
        assert not match["has_confirmed_profile"]
        assert match["matched_skills"] == 0
        assert match["recommended_resume"] is None

    for resume, skills in [
        (backend, ["Python 3", "Flask", "Git", "NoSQL"]),
        (analytics, ["Python", "SQL", "pandas", "Power BI"]),
    ]:
        response = client.put(
            f"/api/v1/resumes/{resume['id']}/review",
            json={"revision": resume["revision"], "facts": {"skills": skills}},
        )
        assert response.status_code == 200

    matches = current_matches()
    python = matches["job-py-001"]
    data = matches["job-da-002"]
    assert (python["matched_skills"], python["total_skills"]) == (3, 3)
    assert (data["matched_skills"], data["total_skills"]) == (4, 5)
    assert python["recommended_resume"]["resume_id"] == backend["id"]
    assert data["recommended_resume"]["resume_id"] == analytics["id"]
    requirements = {item["label"]: item for item in python["requirements"]}
    assert requirements["FastAPI or Flask"]["evidence"][0]["value"] == "Flask"
    assert requirements["Current student or recent graduate"]["status"] == "needs_confirmation"
    assert requirements["UK work authorization"]["status"] == "needs_confirmation"
    data_requirements = {item["label"]: item for item in data["requirements"]}
    assert data_requirements["Communication"]["status"] == "no_confirmed_evidence"
    assert [item["value"] for item in data_requirements["SQL"]["evidence"]] == ["SQL"]

    response = client.put(
        f"/api/v1/resumes/{analytics['id']}/review",
        json={"revision": 1, "facts": {"skills": ["NoSQL"]}},
    )
    assert response.status_code == 200
    updated_data = current_matches()["job-da-002"]
    assert updated_data["matched_skills"] == 1
    sql = next(item for item in updated_data["requirements"] if item["label"] == "SQL")
    assert sql["status"] == "no_confirmed_evidence"
