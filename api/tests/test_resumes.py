from io import BytesIO
import sqlite3

import pytest
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.annotations import Link
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, TextStringObject

from app import main
from app.db import get_db_path, init_db
from app.greenhouse import AssistedForm
from app.main import app
from app.models import Job, ScreeningQuestionAnswer
from app.resume_parser import MAX_FILE_BYTES


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "resumes.db"))
    with TestClient(app) as session:
        yield session


def sample_pdf(with_contact=False):
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
        b"BT /F1 12 Tf 14 TL 72 720 Td "
        + (b"(LinkedIn | +91 98765 00000) Tj T* " if with_contact else b"")
        + b"(Technical Skills: Python, SQL) Tj T* "
        b"(Projects) Tj T* (Built an internship tracker) Tj ET"
    )
    page.replace_contents(stream)
    if with_contact:
        annotation = Link(rect=(72, 710, 120, 722), target_page_index=0)
        del annotation[NameObject("/Dest")]
        annotation[NameObject("/A")] = DictionaryObject({
            NameObject("/S"): NameObject("/URI"),
            NameObject("/URI"): TextStringObject("https://www.linkedin.com/in/example-candidate/?source=resume"),
        })
        writer.add_annotation(page, annotation)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def sample_docx(with_contact=False):
    document = Document()
    if with_contact:
        paragraph = document.add_paragraph()
        for label, target in [
            ("GitHub", "https://github.com/example-candidate"),
            ("Call me", "tel:+919876500000"),
            ("Email", "mailto:candidate@example.com"),
        ]:
            hyperlink = OxmlElement("w:hyperlink")
            hyperlink.set(qn("r:id"), paragraph.part.relate_to(target, RELATIONSHIP_TYPE.HYPERLINK, is_external=True))
            run = OxmlElement("w:r")
            text = OxmlElement("w:t")
            text.text = label
            run.append(text)
            hyperlink.append(run)
            paragraph._p.append(hyperlink)
    document.add_heading("Technical Skills", level=1)
    document.add_paragraph("python, Git")
    document.add_heading("Education", level=1)
    document.add_paragraph("B.Tech Computer Science")
    document.add_heading("Certifications", level=1)
    document.add_table(rows=1, cols=1).cell(0, 0).text = "Python Essentials"
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def test_existing_pdf_is_reprocessed_and_confirmed_contacts_flow_to_a_saved_draft(client, monkeypatch):
    resume = client.post("/api/v1/resumes", files={"file": ("example.pdf", sample_pdf(with_contact=True))}).json()
    resume_url = f"/api/v1/resumes/{resume['id']}"
    with sqlite3.connect(get_db_path()) as conn:
        conn.execute("ALTER TABLE resumes DROP COLUMN suggested_contact")
        conn.execute("ALTER TABLE resumes DROP COLUMN confirmed_contact")
        conn.execute("UPDATE resumes SET suggested_facts = '{}', confirmed_facts = '{\"skills\":[\"Git\"]}', revision = 1")
    init_db()
    resume = client.get(resume_url).raise_for_status().json()
    assert resume["suggested_facts"]["skills"] == ["Python", "SQL"]
    assert resume["confirmed_facts"]["skills"] == ["Git"]
    assert resume["suggested_contact"]["linkedin"] == "https://linkedin.com/in/example-candidate"
    assert resume["suggested_contact"]["phone"] == "+91 98765 00000"
    assert resume["confirmed_contact"] is None

    job = Job(id="greenhouse:example:1", title="Engineering Intern", company="Example", location="India",
              source="greenhouse", application_mode="assisted")
    monkeypatch.setattr(main, "_lookup_job", lambda _: job)
    monkeypatch.setattr(main, "fetch_assisted_form", lambda _: AssistedForm(
        status="loaded", questions=[
            ScreeningQuestionAnswer(id="phone", question="Phone number"),
            ScreeningQuestionAnswer(id="linkedin", question="LinkedIn profile URL"),
            ScreeningQuestionAnswer(id="other", question="Phone interview availability"),
        ],
    ))
    client.put("/api/v1/profile/application-details", json={"candidate_name": "Example Candidate"}).raise_for_status()
    request = {"job_id": job.id, "resume_id": resume["id"]}
    unconfirmed = client.post("/api/v1/applications/drafts", json=request).raise_for_status().json()
    assert unconfirmed["contact"] is None and all(q["answer"] is None for q in unconfirmed["screening_questions"])
    review = {"revision": resume["revision"], "facts": resume["confirmed_facts"], "contact": resume["suggested_contact"]}
    client.put(f"{resume_url}/review", json=review).raise_for_status()
    draft = client.post("/api/v1/applications/drafts", json=request).raise_for_status().json()
    assert draft["contact"] == resume["suggested_contact"]
    assert [q["answer"] for q in draft["screening_questions"]] == [
        resume["suggested_contact"]["phone"], resume["suggested_contact"]["linkedin"], None,
    ]
    assert draft["screening_questions"][1]["evidence"][0]["resume"]["resume_id"] == resume["id"]
    assert client.get(f"/api/v1/applications/drafts/{draft['id']}").json()["contact"] == draft["contact"]


def test_docx_extracts_hyperlink_targets(client):
    data = client.post("/api/v1/resumes", files={"file": ("example.docx", sample_docx(with_contact=True))}).raise_for_status().json()
    assert data["suggested_contact"] == {
        "email": "candidate@example.com", "phone": "+919876500000",
        "linkedin": None, "github": "https://github.com/example-candidate",
    }
    assert data["confirmed_contact"] is None


def test_remove_resume_recalculates_profile_and_matches_without_removing_drafts(client):
    first = client.post("/api/v1/resumes", files={"file": ("first.pdf", sample_pdf())}).raise_for_status().json()
    second = client.post("/api/v1/resumes", files={"file": ("second.pdf", sample_pdf())}).raise_for_status().json()
    for resume, skills in ((first, ["Python", "Flask", "Git"]), (second, ["Python", "SQL"])):
        client.put(f"/api/v1/resumes/{resume['id']}/review", json={
            "revision": resume["revision"], "facts": {"skills": skills},
        }).raise_for_status()
    client.put("/api/v1/profile/application-details", json={"candidate_name": "Example Candidate"}).raise_for_status()

    def recommendation():
        jobs = client.get("/api/v1/jobs").raise_for_status().json()["jobs"]
        return next(job["match"]["recommended_resume"]["resume_id"] for job in jobs if job["id"] == "job-py-001")

    draft_request = {"job_id": "job-py-001", "resume_id": first["id"]}
    draft = client.post("/api/v1/applications/drafts", json=draft_request).raise_for_status().json()
    assert recommendation() == first["id"]

    resume_url = f"/api/v1/resumes/{first['id']}"
    assert client.delete(resume_url).status_code == 204
    assert client.delete(resume_url).status_code == 204
    assert client.get(resume_url).status_code == 404
    assert [resume["id"] for resume in client.get("/api/v1/resumes").json()] == [second["id"]]
    profile = {fact["value"]: fact["sources"] for fact in client.get("/api/v1/profile").json()["facts"]}
    assert set(profile) == {"Python", "SQL"}
    assert profile["Python"] == [{"resume_id": second["id"], "filename": "second.pdf"}]
    assert recommendation() == second["id"]
    assert client.post("/api/v1/applications/drafts", json=draft_request).status_code == 404
    assert client.get(f"/api/v1/applications/drafts/{draft['id']}").json() == draft


def test_draft_creation_handles_resume_removed_while_reading_the_employer_form(client, monkeypatch):
    resume = client.post("/api/v1/resumes", files={"file": ("example.pdf", sample_pdf())}).raise_for_status().json()
    resume_url = f"/api/v1/resumes/{resume['id']}"
    client.put(f"{resume_url}/review", json={"revision": 0, "facts": {"skills": ["Python"]}}).raise_for_status()
    client.put("/api/v1/profile/application-details", json={"candidate_name": "Example Candidate"}).raise_for_status()
    job = Job(id="greenhouse:example:1", title="Engineering Intern", company="Example", location="India",
              source="greenhouse", application_mode="assisted")
    monkeypatch.setattr(main, "_lookup_job", lambda _: job)

    def fetch_form(_):
        assert client.delete(resume_url).status_code == 204
        return AssistedForm(status="loaded", questions=[])

    monkeypatch.setattr(main, "fetch_assisted_form", fetch_form)
    response = client.post("/api/v1/applications/drafts", json={"job_id": job.id, "resume_id": resume["id"]})
    assert response.status_code == 409
    assert "resume was removed" in response.json()["detail"]

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


def test_suggest_facts_segregates_categories_properly():
    from app.resume_parser import suggest_facts

    sample_resume = """
    Jane Doe
    jane@example.com | +91 9876543210

    Summary
    Software engineer with interest in web applications.

    Education
    ABC University, 2020-2024
    Bachelor of Technology in Computer Science

    MAJOR projects
    Campus Portal System | MERN Stack
    Developed a student portal with complaint tracking and notifications.

    MINOR projects
    Smart Shopping Cart | Java, MySQL
    Developed an e-commerce desktop application with auth and order processing.

    Skills and Interests
    Programming Languages\t: C++, Java, Python, SQL
    Technical Knowledge
    Web Development\t: HTML, CSS, JavaScript, React, Node.js
    Database\t: MongoDB, MySQL
    Non-Technical\t: Leadership, Teamwork, Problem Solving

    Course work
    Data Structures, Operating Systems, Database Management

    Certifications & Licenses
    AWS Certified Cloud Practitioner
    """

    facts = suggest_facts(sample_resume).model_dump()
    assert "Python" in facts["skills"]
    assert "C++" in facts["skills"]
    assert "React" in facts["skills"]
    assert "MongoDB" in facts["skills"]
    assert "Leadership" in facts["skills"]
    assert "Bachelor of Technology in Computer Science" in facts["education"][1]
    assert any("Data Structures" in item for item in facts["education"])
    assert any("Campus Portal System" in item for item in facts["projects"])
    assert any("Smart Shopping Cart" in item for item in facts["projects"])
    assert "AWS Certified Cloud Practitioner" in facts["certifications"]
    # Ensure projects and skills were not dumped into education
    for item in facts["education"]:
        assert "MAJOR projects" not in item
        assert "Campus Portal System" not in item
        assert "Programming Languages" not in item
    # Ensure education is not in projects or skills
    assert not any("Bachelor of Technology" in item for item in facts["projects"])
    assert not any("Bachelor of Technology" in item for item in facts["skills"])



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
    assert requirements["India work authorization"]["status"] == "needs_confirmation"
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


def test_personalized_draft_requires_a_reviewed_resume_and_confirmed_name(client):
    resume = client.post("/api/v1/resumes", files={"file": ("backend.pdf", sample_pdf())}).json()
    url = "/api/v1/applications/drafts"
    payload = {"job_id": "job-py-001", "resume_id": resume["id"]}
    assert client.post(url, json={**payload, "resume_id": "missing"}).status_code == 404
    assert client.post(url, json=payload).status_code == 409
    assert client.put(
        f"/api/v1/resumes/{resume['id']}/review",
        json={"revision": 0, "facts": resume["suggested_facts"]},
    ).status_code == 200
    assert client.post(url, json=payload).status_code == 409

    demo = client.post(url, json={"job_id": "job-py-001"}).json()
    assert demo["mode"] == "demo"
    assert demo["candidate_name"] == "Alex Morgan"


def test_draft_uses_the_selected_resume_and_preserves_the_confirmed_snapshot(client):
    selected = client.post("/api/v1/resumes", files={"file": ("resume.pdf", sample_pdf())}).json()
    other = client.post("/api/v1/resumes", files={"file": ("resume.pdf", sample_pdf())}).json()
    for resume, skills in [(selected, ["Python 3"]), (other, ["Flask"])]:
        assert client.put(
            f"/api/v1/resumes/{resume['id']}/review",
            json={"revision": 0, "facts": {"skills": skills}},
        ).status_code == 200

    profile_url = "/api/v1/profile/application-details"
    saved = client.put(
        profile_url,
        json={
            "candidate_name": " Casey Doe ", "availability": "June, 20 hours per week",
            "uk_work_authorization": "authorized",
        },
    )
    assert saved.status_code == 200
    assert client.get(profile_url).json() == saved.json()
    response = client.post(
        "/api/v1/applications/drafts", json={"job_id": "job-py-001", "resume_id": selected["id"]}
    )
    assert response.status_code == 201
    draft = response.json()
    assert draft["mode"] == "personalized"
    assert draft["candidate_name"] == "Casey Doe"
    assert draft["selected_resume"] == "resume.pdf"
    assert draft["resume_id"] == selected["id"]
    assert draft["missing_required_questions"] == ["work_authorization"]
    questions = {question["id"]: question for question in draft["screening_questions"]}
    assert questions["python_experience"]["answer"] == "Confirmed skills: Python 3."
    assert questions["python_experience"]["evidence"][0]["resume"]["resume_id"] == selected["id"]
    assert questions["availability"]["evidence"][0]["profile_field"] == "availability"
    assert "India" in questions["work_authorization"]["question"]
    assert questions["work_authorization"]["answer"] is None

    response = client.patch(profile_url, json={"candidate_name": "New name", "availability": None})
    assert response.status_code == 200
    assert response.json() == {
        "candidate_name": "New name", "availability": None, "uk_work_authorization": "authorized",
    }
    assert client.get(profile_url).json() == response.json()
    draft_url = f"/api/v1/applications/drafts/{draft['id']}"
    assert client.get(draft_url).json() == draft

    updated = client.patch(
        f"{draft_url}/answers",
        json={"answers": {"work_authorization": "No", "availability": "July"}},
    ).json()
    assert updated["ready_for_review"]
    availability = next(q for q in updated["screening_questions"] if q["id"] == "availability")
    assert availability["source"] == "user_supplied"
    assert availability["evidence"] == []
    assert client.post(
        f"{draft_url}/submit",
        json={"approved": True, "draft_updated_at": updated["updated_at"]},
    ).status_code == 409
    assert client.get("/api/v1/applications").json() == []
