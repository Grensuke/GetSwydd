import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import discovery_agent
from app.discovery_models import DiscoveryPlan
from app.job_sources import SourceRefresh
from app.main import app
from app.models import Job
from app.resume_models import ResumeFacts, ResumeReview
from app.resume_store import confirm_resume, store_resume

AGENT_URL = "/api/v1/agents/job-discovery"


def plan(**values) -> DiscoveryPlan:
    return DiscoveryPlan.model_validate({
        "action": "search", "role_keywords": [], "skill_groups": [], "company_keywords": [],
        "location_keywords": [], "workplace_modes": [], "employment_types": [],
        "experience_levels": [], "sources": [], "minimum_pay": None, "applicant_location": None,
        "require_listed_applicant_location": False, "resume_hint": None, "closing_within_days": None,
        "result_limit": None, "ignore_saved_preferences": False, "clarification": None, **values,
    })


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "discovery-agent.db"))
    monkeypatch.setenv("GETSWYDD_SEARCH_INTERVAL_MINUTES", "0")
    monkeypatch.delenv("GETSWYDD_DISCOVERY_PROVIDER", raising=False)
    monkeypatch.delenv("GETSWYDD_DISCOVERY_MODEL", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GETSWYDD_AGENT_OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GETSWYDD_OPENAI_API_KEY", raising=False)
    with TestClient(app) as session:
        yield session


def listing(job_id, title, location, description, **values):
    return Job(
        id=f"greenhouse:example:{job_id}", title=title, company="Example Employer",
        location=location, description=description, source="greenhouse", application_mode="assisted",
        apply_url=f"https://job-boards.greenhouse.io/example/jobs/{job_id}", **values,
    )


def reviewed_resume(filename: str, *skills: str):
    facts = ResumeFacts(skills=list(skills))
    resume = store_resume(filename, b"local-upload", "private resume text", facts)
    return confirm_resume(resume.id, ResumeReview(revision=0, facts=facts))


def test_india_market_filters_listings_before_pagination(client, monkeypatch):
    from app import main

    postings = [
        listing(1, "Engineer", "London, UK", "We have a team in India."),
        listing(2, "Graduate Trainee", "Bangalore", ""),
        listing(3, "Engineer", "Remote", ""),
        listing(4, "Engineer", "Remote Globally", ""),
        listing(5, "Engineer", "Remote Worldwide", "Eligible locations: Worldwide excluding India"),
        listing(6, "Engineer", "New York", "", additional_locations=["Hyderabad"]),
        listing(7, "Engineer", "Indianapolis, IN", ""),
        listing(8, "Support Intern", "Remote", "Open to applicants from: India"),
        listing(9, "Engineer", "Kochi, Japan", ""),
    ]
    monkeypatch.setattr(main, "live_jobs", lambda _: postings)

    response = client.get("/api/v1/jobs", params={"source": "live", "market": "india", "limit": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert [job["id"] for job in data["jobs"]] == [postings[1].id, postings[3].id]
    assert data["jobs"][0]["experience_level"] == "entry"
    second_page = client.get("/api/v1/jobs?source=live&market=india&offset=2").json()
    assert [job["id"] for job in second_page["jobs"]] == [postings[5].id, postings[7].id]
    assert client.get("/api/v1/jobs?source=live&market=all").json()["total"] == len(postings)
    assert client.get("/api/v1/jobs?source=live&location=India").json()["total"] == 2
    assert client.get("/api/v1/jobs?source=live&location=Bengaluru").json()["total"] == 1
    assert client.put("/api/v1/jobs/preferences", json={"location_keywords": ["India"]}).status_code == 200
    assert client.get("/api/v1/jobs?source=live&use_preferences=true").json()["total"] == 2


def test_agent_prioritizes_india_and_respects_explicit_location(client, monkeypatch):
    postings = [
        listing(1, "Junior Engineer", "London, UK", ""),
        listing(2, "Junior Engineer", "Pune", ""),
    ]
    monkeypatch.setattr(discovery_agent, "live_jobs", lambda _: postings)
    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan())
    response = client.post(AGENT_URL, json={"message": "Find junior engineering jobs", "limit": 1}).json()
    assert response["total_matches"] == 2 and response["jobs"][0]["job_id"] == postings[1].id

    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(location_keywords=["London"]))
    response = client.post(AGENT_URL, json={"message": "Find engineering jobs in London"}).json()
    assert [job["job_id"] for job in response["jobs"]] == [postings[0].id]

    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(
        applicant_location="India", require_listed_applicant_location=True,
    ))
    response = client.post(AGENT_URL, json={"message": "Find jobs where applicants from India can work"}).json()
    assert response["jobs"][0]["applicant_location_check"] == {"status": "listed_location", "evidence": "Pune"}


def test_search_uses_live_catalog_and_selected_resume_without_guessing_location(client, monkeypatch):
    backend = reviewed_resume("Backend Resume.pdf", "Python")
    reviewed_resume("Database Resume.pdf", "SQL")
    client.put("/api/v1/jobs/preferences", json={
        "location_keywords": ["UK"], "employment_types": ["full_time"],
    }).raise_for_status()
    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(
        employment_types=["internship"], workplace_modes=["remote"], applicant_location="India",
        skill_groups=[["Python", "Java"]], resume_hint="backend resume", result_limit=2,
    ))
    listings = [
        listing(1, "Backend Internship", "Remote", "Python, SQL"),
        listing(2, "Backend Internship", "Remote, India", "Requirements\nPython"),
        listing(3, "Backend Internship", "Remote, Worldwide excluding India", "Python"),
        listing(4, "Frontend Internship", "Remote, India", "JavaScript"),
        listing(5, "Backend Developer", "Remote, India", "Python", employment="full_time"),
        Job(id="demo-1", title="Python internship", company="Demo", location="Remote, India"),
    ]
    def read_jobs(sources):
        assert sources == ("greenhouse", "lever", "ashby")
        return listings
    monkeypatch.setattr(discovery_agent, "live_jobs", read_jobs)
    result = client.post(AGENT_URL, json={"message": "Find remote Python or Java internships from India using my backend resume"})
    assert result.status_code == 200
    data = result.json()
    assert data["status"] == "results" and data["total_matches"] == 3
    assert data["selected_resume"]["resume_id"] == backend.id
    first, second = data["jobs"]
    assert first["job_id"] == "greenhouse:example:2"
    assert first["applicant_location_check"] == {"status": "listed_location", "evidence": "Remote, India"}
    assert first["apply_url"] == listings[1].apply_url
    assert second["applicant_location_check"]["status"] == "needs_confirmation"
    assert second["match"]["matched_skills"] == 1
    assert second["match"]["recommended_resume"]["resume_id"] == backend.id
    assert data["filters"]["preferences"]["location_keywords"] == []
    assert client.get("/api/v1/jobs/preferences").json()["location_keywords"] == ["UK"]
    assert client.get("/api/v1/applications/assisted").json() == []


def test_clarification_and_out_of_scope_do_not_search(client, monkeypatch):
    first = reviewed_resume("Backend 2025.pdf", "Python")
    second = reviewed_resume("Backend 2026.pdf", "Python")
    def unexpected(*args):
        pytest.fail("Search tools must stay idle until intent and resume are resolved.")
    monkeypatch.setattr(discovery_agent, "live_jobs", unexpected)
    monkeypatch.setattr(discovery_agent, "refresh_catalog", unexpected)
    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(resume_hint="Backend"))
    response = client.post(AGENT_URL, json={"message": "Find jobs using my backend resume", "refresh": True}).json()
    assert response["status"] == "needs_clarification"
    assert {item["resume_id"] for item in response["resume_options"]} == {first.id, second.id}

    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(
        action="clarify", clarification="Which currency and pay period should I use?"
    ))
    response = client.post(AGENT_URL, json={"message": "Find jobs paying 20k"}).json()
    assert response["message"] == "Which currency and pay period should I use?"

    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(action="out_of_scope"))
    assert client.post(AGENT_URL, json={"message": "Submit applications", "refresh": True}).json()["status"] == "out_of_scope"


def test_refresh_is_explicit_and_country_filter_conservative(client, monkeypatch):
    monkeypatch.setattr(discovery_agent, "interpret_message", lambda _: plan(
        applicant_location="India", require_listed_applicant_location=True, sources=["greenhouse"],
    ))
    calls = []

    def refresh(sources):
        calls.append(sources)
        return [SourceRefresh(source="greenhouse", board="example", status="refreshed", count=3)], 0

    monkeypatch.setattr(discovery_agent, "refresh_catalog", refresh)
    monkeypatch.setattr(discovery_agent, "live_jobs", lambda _: [
        listing(1, "Developer", "Remote", "Software"),
        listing(2, "Developer", "Remote, worldwide excluding India", "Software"),
        listing(3, "Developer", "Remote", "Open to applicants from: India"),
    ])
    payload = {"message": "Find roles that explicitly list India"}
    result = client.post(AGENT_URL, json=payload).json()
    assert [job["job_id"] for job in result["jobs"]] == ["greenhouse:example:3"]
    assert calls == []
    refreshed = client.post(AGENT_URL, json={**payload, "refresh": True}).json()
    assert calls == [("greenhouse",)]
    assert refreshed["refresh_sources"][0]["count"] == 3


def test_agent_without_provider_key_leaves_existing_api_usable(client):
    unavailable = client.post(AGENT_URL, json={"message": "Find Python jobs"})
    assert unavailable.status_code == 503
    assert "GETSWYDD_AGENT_OPENAI_API_KEY" in unavailable.json()["detail"]
    assert client.get("/api/v1/jobs").json()["total"] == 2


def test_groq_requires_its_own_key(client, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DISCOVERY_PROVIDER", "groq")
    monkeypatch.setenv("GETSWYDD_AGENT_OPENAI_API_KEY", "openai-test-key")
    unavailable = client.post(AGENT_URL, json={"message": "Find Python jobs"})
    assert unavailable.status_code == 503
    assert "GROQ_API_KEY" in unavailable.json()["detail"]


@pytest.mark.parametrize(("provider", "host", "path", "expected_model"), [
    ("openai", "api.openai.com", "/v1/chat/completions", "gpt-4.1-mini"),
    ("groq", "api.groq.com", "/openai/v1/chat/completions", "openai/gpt-oss-20b"),
])
def test_structured_plan_receives_only_search_text(client, monkeypatch, provider, host, path, expected_model):
    reviewed_resume("Private filename.pdf", "SQL")
    if provider == "groq":
        monkeypatch.setenv("GETSWYDD_DISCOVERY_PROVIDER", "groq")
    monkeypatch.setenv("GETSWYDD_AGENT_OPENAI_API_KEY", "openai-test-key")
    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")
    requests = []
    model_class = discovery_agent.ChatOpenAI

    def complete(request):
        assert request.url.host == host and request.url.path == path
        assert request.headers["authorization"] == f"Bearer {provider}-test-key"
        body = json.loads(request.content)
        requests.append(body)
        return httpx.Response(200, json={
            "id": "chatcmpl-test", "object": "chat.completion", "created": 1, "model": expected_model,
            "choices": [{"index": 0, "finish_reason": "stop", "logprobs": None, "message": {
                "role": "assistant", "content": plan(skill_groups=[["Python"]]).model_dump_json(),
            }}],
        })

    with httpx.Client(transport=httpx.MockTransport(complete)) as transport:
        monkeypatch.setattr(discovery_agent, "ChatOpenAI", lambda **options: model_class(http_client=transport, **options))
        monkeypatch.setattr(discovery_agent, "live_jobs", lambda _: [])
        result = client.post(AGENT_URL, json={"message": "Find Python jobs"})
    assert result.status_code == 200 and result.json()["status"] == "no_results"
    assert len(requests) == 1
    assert requests[0]["model"] == expected_model
    if provider == "openai":
        assert requests[0]["store"] is False
    else:
        assert "store" not in requests[0]
    schema = requests[0]["response_format"]["json_schema"]
    assert schema["strict"] is True
    assert schema["schema"]["additionalProperties"] is False
    assert requests[0]["messages"][-1]["content"] == "Find Python jobs"
    assert "Private" not in str(requests) and "SQL" not in str(requests)


@pytest.mark.parametrize(("provider_failure", "error_code", "status", "detail"), [
    (401, "invalid_api_key", 503, "rejected the API key"),
    (403, "insufficient_permissions", 503, "denied access"),
    (404, "model_not_found", 503, "denied access"),
    (429, "insufficient_quota", 503, "quota is unavailable"),
    (429, "credit_balance_exhausted", 503, "quota is unavailable"),
    (429, "rate_limit_exceeded", 429, "rate-limited"),
    (400, "invalid_json_schema", 502, "request format"),
    (500, "server_error", 502, "could not complete"),
    (httpx.ReadTimeout, None, 504, "timed out"),
    (httpx.ConnectError, None, 502, "could not connect"),
])
def test_provider_failure_is_actionable_without_leaking_details(
    client, monkeypatch, provider_failure, error_code, status, detail
):
    monkeypatch.setenv("GETSWYDD_AGENT_OPENAI_API_KEY", "test-key")
    model_class = discovery_agent.ChatOpenAI
    raw_detail = "Unfiltered provider response containing test-key"

    def fail(request):
        if isinstance(provider_failure, int):
            return httpx.Response(provider_failure, json={"error": {"code": error_code, "message": raw_detail}})
        raise provider_failure(raw_detail, request=request)

    with httpx.Client(transport=httpx.MockTransport(fail)) as transport:
        monkeypatch.setattr(discovery_agent, "ChatOpenAI", lambda **options: model_class(http_client=transport, **options))
        response = client.post(AGENT_URL, json={"message": "Find Python jobs"})
    assert response.status_code == status
    assert detail in response.json()["detail"]
    assert "test-key" not in response.text
