from datetime import timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app import greenhouse
from app.main import app
from app.resume_models import ResumeFacts, ResumeReview
from app.resume_store import confirm_resume, store_resume

REFRESH = "/api/v1/jobs/greenhouse/refresh"
JOBS = "/api/v1/jobs"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "greenhouse.db"))
    monkeypatch.delenv("GETSWYDD_GREENHOUSE_BOARDS", raising=False)
    with TestClient(app) as session:
        yield session


def posting(**updates):
    return {
        "id": 123,
        "title": "Backend Internship",
        "location": {"name": "Remote"},
        "absolute_url": "https://job-boards.greenhouse.io/example/jobs/123",
        "updated_at": "2026-11-22T09:30:00Z",
        "content": "&lt;p&gt;Python and SQL are used on this team.&lt;/p&gt;"
                   "&lt;script&gt;Docker&lt;/script&gt;&lt;p&gt;JavaScript helps.&lt;/p&gt;",
        **updates,
    }


def test_board_import_matches_confirmed_skills_and_uses_assisted_mode(client, monkeypatch):
    assert client.get(JOBS, params={"source": "greenhouse"}).json() == {"total": 0, "jobs": []}
    assert client.post(REFRESH).json() == []
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"example":"Example Employer"}')
    resume = store_resume("Backend.pdf", b"example", "Python", ResumeFacts(skills=["Python"]))
    confirm_resume(resume.id, ResumeReview(revision=0, facts=ResumeFacts(skills=["Python", "NoSQL"])))
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={"jobs": [posting(), posting()]})

    monkeypatch.setattr(greenhouse, "Client", lambda **opts: httpx.Client(
        transport=httpx.MockTransport(respond), **opts
    ))

    assert client.post(REFRESH).json() == [{"board": "example", "status": "refreshed", "count": 1}]
    assert client.post(REFRESH).json() == [{"board": "example", "status": "cached", "count": 1}]
    assert len(requests) == 1
    assert requests[0].method == "GET"
    assert str(requests[0].url) == "https://boards-api.greenhouse.io/v1/boards/example/jobs?content=true"
    assert client.get(JOBS).json()["total"] == 2
    assert client.get(JOBS, params={"source": "all"}).json()["total"] == 3

    job = client.get(JOBS, params={"source": "greenhouse"}).json()["jobs"][0]
    assert job["id"] == "greenhouse:example:123"
    assert job["company"] == "Example Employer"
    assert job["application_mode"] == "assisted"
    assert job["apply_url"] == posting()["absolute_url"]
    assert job["source_updated_at"] == posting()["updated_at"]
    assert job["source_fetched_at"]
    assert job["eligibility"] is None
    assert job["description"] == "Python and SQL are used on this team.\nJavaScript helps."
    assert job["match"]["scope"] == "description_mentions"
    assert job["match"]["recommended_resume"]["filename"] == "Backend.pdf"
    evidence = {check["label"]: check["status"] for check in job["match"]["requirements"]}
    assert evidence == {"Python": "evidence_found", "SQL": "no_confirmed_evidence", "JavaScript": "no_confirmed_evidence"}
    assert client.post("/api/v1/applications/drafts", json={"job_id": job["id"]}).status_code == 409


def test_refresh_keeps_cache_on_failure_and_removes_closed_jobs_on_success(client, monkeypatch):
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"example":"Example Employer"}')
    monkeypatch.setattr(greenhouse, "REFRESH_INTERVAL", timedelta(0))
    responses = iter([
        httpx.Response(200, json={"jobs": [posting()]}),
        httpx.Response(429),
        httpx.Response(200, json={"jobs": [posting(absolute_url="javascript:alert(1)")]}),
        httpx.Response(200, json={"jobs": []}),
    ])
    monkeypatch.setattr(greenhouse, "Client", lambda **opts: httpx.Client(
        transport=httpx.MockTransport(lambda _: next(responses)), **opts
    ))
    assert client.post(REFRESH).json()[0]["count"] == 1
    for _ in range(2):
        assert client.post(REFRESH).json() == [{"board": "example", "status": "failed", "count": 1}]
        assert client.get(JOBS, params={"source": "greenhouse"}).json()["total"] == 1
    assert client.post(REFRESH).json() == [{"board": "example", "status": "refreshed", "count": 0}]
    assert client.get(JOBS, params={"source": "greenhouse"}).json()["total"] == 0


def test_invalid_board_config_is_rejected_without_affecting_demo(client, monkeypatch):
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"../other":"Invalid Board"}')
    assert client.post(REFRESH).status_code == 503
    assert client.get(JOBS, params={"source": "all"}).status_code == 503
    assert client.get(JOBS).json()["total"] == 2


def test_oversized_description_feed_falls_back_to_listing_metadata(client, monkeypatch):
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"example":"Example Employer"}')
    monkeypatch.setattr(greenhouse, "MAX_RESPONSE_BYTES", 1000)
    requests = []

    def respond(request):
        requests.append(dict(request.url.params))
        content = "x" * 2000 if "content" in request.url.params else None
        return httpx.Response(200, json={"jobs": [posting(content=content)]})

    monkeypatch.setattr(greenhouse, "Client", lambda **opts: httpx.Client(
        transport=httpx.MockTransport(respond), **opts
    ))
    assert client.post(REFRESH).json() == [{"board": "example", "status": "refreshed", "count": 1}]
    assert requests == [{"content": "true"}, {}]
    jobs = client.get(JOBS, params={"source": "greenhouse"}).json()["jobs"]
    assert jobs[0]["description"] is None
    assert jobs[0]["match"] is None
    assert jobs[0]["apply_url"] == posting()["absolute_url"]


def prepare_assisted_fixture(client, monkeypatch, form_response):
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"example":"Example Employer"}')
    source = store_resume("Backend.pdf", b"example", "Python", ResumeFacts(skills=["Python"]))
    confirm_resume(source.id, ResumeReview(revision=0, facts=ResumeFacts(skills=["Python"])))
    profile = client.put("/api/v1/profile/application-details", json={
        "candidate_name": "Casey Doe",
        "availability": "June, 20 hours per week",
        "uk_work_authorization": "not_authorized",
    })
    assert profile.status_code == 200
    requests = []

    def respond(request):
        requests.append(request)
        assert request.method == "GET" and request.content == b""
        if request.url.path.endswith("/jobs"):
            return httpx.Response(200, json={"jobs": [posting()]})
        assert str(request.url) == "https://boards-api.greenhouse.io/v1/boards/example/jobs/123?questions=true"
        return form_response

    monkeypatch.setattr(greenhouse, "Client", lambda **opts: httpx.Client(
        transport=httpx.MockTransport(respond), **opts
    ))
    assert client.post(REFRESH).json()[0]["status"] == "refreshed"
    return {"job_id": "greenhouse:example:123", "resume_id": source.id}, requests


def test_assisted_draft_and_reported_submission(client, monkeypatch):
    yes_no = [{"value": 1, "label": "Yes"}, {"value": 0, "label": "No"}]
    form = {"id": 123, "questions": [
        {"label": "First Name", "required": True, "fields": [{"name": "first_name", "type": "input_text"}]},
        {"label": "What is your availability?", "required": True, "fields": [{"name": "question_1", "type": "input_text"}]},
        {"label": "Are you legally authorized to work in the UK?", "required": True, "fields": [
            {"name": "question_2", "type": "multi_value_single_select", "values": yes_no},
        ]},
        {"label": "Are you authorized to work in the US?", "required": True, "fields": [
            {"name": "question_3", "type": "multi_value_single_select", "values": yes_no},
        ]},
        {"label": "Portfolio attachment", "required": True, "fields": [{"name": "question_4", "type": "input_file"}]},
    ], "demographic_questions": {"questions": [{"label": "Not part of the assisted draft"}]}}
    payload, requests = prepare_assisted_fixture(client, monkeypatch, httpx.Response(200, json=form))
    created = client.post("/api/v1/applications/drafts", json=payload)
    assert created.status_code == 201
    assert len(requests) == 2
    draft = created.json()
    draft_url = f"/api/v1/applications/drafts/{draft['id']}"
    list_url = "/api/v1/applications/assisted"
    report_url = f"{draft_url}/reported-submission"

    assert draft["mode"] == "assisted"
    assert draft["form_status"] == "partial"
    assert draft["candidate_name"] == "Casey Doe"
    assert draft["resume_id"] == payload["resume_id"]
    assert draft["apply_url"] == posting()["absolute_url"]
    assert draft["missing_required_questions"] == ["question_3"]
    questions = {q["id"]: q for q in draft["screening_questions"]}
    assert questions["question_1"]["answer"] == "June, 20 hours per week"
    assert questions["question_2"]["answer"] == "No"
    assert questions["question_2"]["evidence"][0]["profile_field"] == "uk_work_authorization"
    assert questions["question_3"]["answer"] is None
    assert questions["question_3"]["choices"] == ["Yes", "No"]
    assert client.get(list_url).json()[0]["status"] == "draft"
    assert client.patch(f"{draft_url}/answers", json={"answers": {"question_3": "Maybe"}}).status_code == 400
    updated = client.patch(f"{draft_url}/answers", json={"answers": {"question_3": "No"}}).json()
    assert updated["ready_for_review"]
    assert client.post(
        f"{draft_url}/submit", json={"approved": True, "draft_updated_at": updated["updated_at"]}
    ).status_code == 409
    assert client.put(report_url, json={"submitted": False}).status_code == 422
    reported = client.put(report_url, json={"submitted": True}).json()
    assert reported["status"] == "submitted"
    assert reported["status_source"] == "user_reported"
    assert reported["reported_submitted_at"]
    assert client.put(report_url, json={"submitted": True}).json() == reported
    assert client.get(list_url).json() == [reported]
    assert client.get(draft_url).json()["reported_submitted_at"] == reported["reported_submitted_at"]
    assert client.patch(f"{draft_url}/answers", json={"answers": {"question_3": "Yes"}}).status_code == 409
    assert client.get("/api/v1/applications").json() == []
    assert len(requests) == 2


@pytest.mark.parametrize("provider_status", [404, 503])
def test_assisted_draft_handles_closed_or_unavailable_form(client, monkeypatch, provider_status):
    payload, _ = prepare_assisted_fixture(client, monkeypatch, httpx.Response(provider_status))
    result = client.post("/api/v1/applications/drafts", json=payload)
    if provider_status == 404:
        assert result.status_code == 409
        assert client.get("/api/v1/applications/assisted").json() == []
    else:
        assert result.status_code == 201
        draft = result.json()
        assert draft["apply_url"]
        assert draft["form_status"] == "unavailable"
        assert draft["screening_questions"] == []
        assert not draft["ready_for_review"]
        reported = client.put(
            f"/api/v1/applications/drafts/{draft['id']}/reported-submission", json={"submitted": True}
        ).json()
        assert reported["status_source"] == "user_reported"


def test_reported_submission_endpoint_rejects_demo_drafts(client):
    demo = client.post("/api/v1/applications/drafts", json={"job_id": "job-da-002"}).json()
    response = client.put(
        f"/api/v1/applications/drafts/{demo['id']}/reported-submission", json={"submitted": True}
    )
    assert response.status_code == 409
