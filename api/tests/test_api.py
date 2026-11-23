"""Tests for GetSwydd FastAPI backend."""
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db(tmp_path, monkeypatch):
    """Ensure database schema is ready for tests."""
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "test.db"))
    init_db()


def test_health_endpoint():
    """Verify GET /health returns 200 with valid health payload."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "getswydd-api"
    assert data["version"] == "0.1.0"


def test_jobs_endpoint():
    """Verify GET /api/v1/jobs returns the two synthetic internship jobs."""
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert all("India" in job["location"] for job in data["jobs"])
    assert len(data["jobs"]) == 2

    titles = [job["title"] for job in data["jobs"]]
    assert "Python Developer Internship" in titles
    assert "Data Analyst Internship" in titles

    for job in data["jobs"]:
        assert "id" in job
        assert "title" in job
        assert "company" in job
        assert "location" in job
        assert "eligibility" in job
        assert "recommended_resume" in job


def test_cors_preflight():
    """Verify CORS preflight headers allow http://localhost:3000."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/jobs", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_create_draft_unknown_job_returns_404():
    """Verify that attempting to create a draft for a non-existent job ID returns 404."""
    response = client.post("/api/v1/applications/drafts", json={"job_id": "job-unknown-999"})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_draft_python_internship_missing_availability():
    """
    Verify creating a draft for Python internship:
    - Selects recommended resume 'Backend_Python_Intern_Resume.pdf'
    - Answers known questions from verified facts
    - Leaves availability unanswered (does not guess)
    - Returns missing_required_questions containing 'availability'
    - ready_for_review is False
    """
    response = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"})
    assert response.status_code == 201
    draft = response.json()

    assert draft["id"].startswith("draft-")
    assert draft["job_id"] == "job-py-001"
    assert draft["job_title"] == "Python Developer Internship"
    assert draft["company"] == "Aether Labs"
    assert draft["selected_resume"] == "Backend_Python_Intern_Resume.pdf"
    assert draft["candidate_name"] == "Alex Morgan"

    # Verify questions
    questions = {q["id"]: q for q in draft["screening_questions"]}
    assert "python_experience" in questions
    assert "work_authorization" in questions
    assert "availability" in questions

    # Verified facts were pre-populated
    assert questions["python_experience"]["answer"] is not None
    assert questions["python_experience"]["source"] == "verified_profile"
    assert questions["work_authorization"]["answer"] is not None
    assert questions["work_authorization"]["source"] == "verified_profile"

    # Availability must NOT be guessed; must be missing
    assert questions["availability"]["answer"] is None
    assert questions["availability"]["source"] is None
    assert "availability" in draft["missing_required_questions"]
    assert draft["ready_for_review"] is False


def test_retrieve_draft_by_id():
    """Verify that a created draft can be retrieved by its draft ID."""
    create_res = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"})
    draft_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/applications/drafts/{draft_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()

    assert retrieved["id"] == draft_id
    assert retrieved["job_id"] == "job-py-001"
    assert retrieved["selected_resume"] == "Backend_Python_Intern_Resume.pdf"


def test_retrieve_draft_unknown_id_returns_404():
    """Verify retrieving a non-existent draft ID returns 404."""
    response = client.get("/api/v1/applications/drafts/draft-nonexistent-123")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_screening_answers_makes_draft_ready_for_review():
    """
    Verify that supplying the missing availability answer:
    - Updates the question with source 'user_supplied'
    - Clears missing_required_questions
    - Transitions ready_for_review to True
    """
    create_res = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"})
    draft_id = create_res.json()["id"]
    assert create_res.json()["ready_for_review"] is False

    update_res = client.patch(
        f"/api/v1/applications/drafts/{draft_id}/answers",
        json={"answers": {"availability": "Available immediately, 40 hours per week"}},
    )
    assert update_res.status_code == 200
    updated = update_res.json()

    assert updated["id"] == draft_id
    assert updated["missing_required_questions"] == []
    assert updated["ready_for_review"] is True

    questions = {q["id"]: q for q in updated["screening_questions"]}
    assert questions["availability"]["answer"] == "Available immediately, 40 hours per week"
    assert questions["availability"]["source"] == "user_supplied"


def test_update_screening_answers_unknown_draft_returns_404():
    """Verify updating answers on a non-existent draft ID returns 404."""
    response = client.patch(
        "/api/v1/applications/drafts/draft-fake-999/answers",
        json={"answers": {"availability": "Tomorrow"}},
    )
    assert response.status_code == 404


def test_update_screening_answers_invalid_question_id_returns_400():
    """Verify submitting an answer for a non-existent question ID returns 400 Bad Request."""
    create_res = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"})
    draft_id = create_res.json()["id"]

    response = client.patch(
        f"/api/v1/applications/drafts/{draft_id}/answers",
        json={"answers": {"unrelated_field": "Some text"}},
    )
    assert response.status_code == 400
    assert "not a valid screening question" in response.json()["detail"]


def test_create_draft_data_analyst_has_all_facts():
    """Verify that Data Analyst draft has all required facts from profile and is ready for review."""
    create_res = client.post("/api/v1/applications/drafts", json={"job_id": "job-da-002"})
    assert create_res.status_code == 201
    draft = create_res.json()

    assert draft["selected_resume"] == "Data_Analytics_Resume.pdf"
    assert draft["missing_required_questions"] == []
    assert draft["ready_for_review"] is True


def test_sqlite_persistence():
    """Verify drafts are saved to SQLite and survive retrieval across connections."""
    create_res = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"})
    draft_id = create_res.json()["id"]

    # Re-retrieve with a fresh request
    fetch_res = client.get(f"/api/v1/applications/drafts/{draft_id}")
    assert fetch_res.status_code == 200
    assert fetch_res.json()["id"] == draft_id


def test_cannot_submit_without_explicit_approval_or_required_answers():
    draft = client.post("/api/v1/applications/drafts", json={"job_id": "job-py-001"}).json()
    submit_url = f"/api/v1/applications/drafts/{draft['id']}/submit"
    approval = {"approved": True, "draft_updated_at": draft["updated_at"]}

    assert client.post(submit_url, json={"draft_updated_at": draft["updated_at"]}).status_code == 422
    assert client.post(submit_url, json={**approval, "approved": False}).status_code == 422
    assert client.post(submit_url, json=approval).status_code == 409
    assert client.get("/api/v1/applications").json() == []


def test_edit_invalidates_approval_for_previous_version():
    draft = client.post("/api/v1/applications/drafts", json={"job_id": "job-da-002"}).json()
    draft_url = f"/api/v1/applications/drafts/{draft['id']}"
    edited = client.patch(
        f"{draft_url}/answers", json={"answers": {"sql_experience": "SQL coursework"}}
    )
    assert edited.status_code == 200
    assert edited.json()["updated_at"] != draft["updated_at"]
    response = client.post(
        f"{draft_url}/submit", json={"approved": True, "draft_updated_at": draft["updated_at"]}
    )
    assert response.status_code == 409
    assert client.get("/api/v1/applications").json() == []


def test_concurrent_submissions_return_one_receipt_and_freeze_the_draft():
    draft = client.post("/api/v1/applications/drafts", json={"job_id": "job-da-002"}).json()
    draft_url = f"/api/v1/applications/drafts/{draft['id']}"
    payload = {"approved": True, "draft_updated_at": draft["updated_at"]}
    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(client.post, f"{draft_url}/submit", json=payload)
        second = executor.submit(client.post, f"{draft_url}/submit", json=payload)
        responses = [first.result(), second.result()]

    assert [response.status_code for response in responses] == [200, 200]
    receipt = responses[0].json()
    assert responses[1].json() == receipt
    assert receipt["destination"] == "local_test_employer"
    assert receipt["approved_updated_at"] == draft["updated_at"]
    assert client.get(draft_url).json()["submission"] == receipt
    assert client.get("/api/v1/applications").json() == [receipt]
    assert client.patch(
        f"{draft_url}/answers", json={"answers": {"sql_experience": "Edited after submission"}}
    ).status_code == 409
