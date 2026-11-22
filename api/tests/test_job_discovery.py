import asyncio
import sqlite3
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app import greenhouse, job_alerts, job_analysis, job_sources
from app.main import app
from app.resume_models import ResumeFacts, ResumeReview
from app.resume_store import confirm_resume, store_resume


@pytest.fixture
def catalog(monkeypatch, tmp_path):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "jobs.db"))
    monkeypatch.setenv("GETSWYDD_SEARCH_INTERVAL_MINUTES", "0")
    monkeypatch.delenv("GETSWYDD_OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", "{}")
    monkeypatch.setenv("GETSWYDD_LEVER_BOARDS", '{"leverco":"LeverCo"}')
    monkeypatch.setenv("GETSWYDD_ASHBY_BOARDS", '{"ashbyco":"AshbyCo"}')
    monkeypatch.setattr(greenhouse, "REFRESH_INTERVAL", timedelta(0))
    today = datetime.now(timezone.utc).date()
    deadline = (today + timedelta(days=5)).isoformat()
    ashby = {
        "title": "Python Backend Intern", "applyUrl": "https://jobs.ashbyhq.com/ashbyco/role1/application",
        "isListed": True, "location": "Bengaluru, India", "secondaryLocations": [{"location": "Pune, India"}],
        "workplaceType": "Hybrid", "employmentType": "Intern",
        "descriptionPlain": f"Requirements\nPython\n3 years of experience\nPreferred\nDocker\n\nApplication deadline: {deadline}",
        "compensation": {"summaryComponents": [{
            "compensationType": "Salary", "interval": "1 MONTH", "currencyCode": "INR",
            "minValue": 20000, "maxValue": 40000,
        }]},
    }
    lever = {
        "id": "role2", "text": "Data Engineer", "applyUrl": "https://jobs.lever.co/leverco/role2/apply",
        "categories": {"location": "India", "allLocations": ["India", "Pune"], "commitment": "Full-time"},
        "workplaceType": "remote", "descriptionPlain": "SQL on our team.",
        "lists": [{"text": "Requirements", "content": "<li>Python or Java</li>"}],
        "salaryRange": {"currency": "USD", "interval": "per-year", "min": 90000, "max": 100000},
    }
    feeds = {
        "api.lever.co": [lever],
        "api.ashbyhq.com": {"jobs": [
            ashby, {**ashby, "title": "Hidden job", "isListed": False},
            {**ashby, "applyUrl": ashby["applyUrl"] + "?utm_source=duplicate"},
            {**ashby, "title": "Expired role", "applyUrl": "https://jobs.ashbyhq.com/ashbyco/expired/application",
             "descriptionPlain": f"Application deadline: {today - timedelta(days=1)}"},
        ]},
    }

    def respond(request):
        assert request.method == "GET" and not request.content
        if request.url.host == "api.ashbyhq.com":
            assert request.url.params["includeCompensation"] == "true"
        content = feeds[request.url.host]
        return httpx.Response(content) if isinstance(content, int) else httpx.Response(200, json=content)

    monkeypatch.setattr(job_sources, "Client", lambda **options: httpx.Client(
        transport=httpx.MockTransport(respond), **options
    ))
    with TestClient(app) as client:
        yield client, feeds, deadline


def test_unified_catalog_metadata_eligibility_and_pay_filters(catalog):
    client, _, deadline = catalog
    resume = store_resume("Backend.pdf", b"example", "Python", ResumeFacts(skills=["Python"]))
    confirm_resume(resume.id, ResumeReview(revision=0, facts=ResumeFacts(skills=["Python"])))
    sync = client.post("/api/v1/jobs/refresh")
    assert sync.status_code == 200
    assert sync.json()["new_alerts"] == 0
    assert {item["source"] for item in sync.json()["sources"]} == {"ashby", "lever"}
    data = client.get("/api/v1/jobs?source=live").json()
    assert data["total"] == 2
    by_source = {job["source"]: job for job in data["jobs"]}
    ashby = by_source["ashby"]
    lever = by_source["lever"]
    assert ashby["workplace"] == "hybrid" and ashby["employment"] == "internship"
    assert ashby["application_deadline"] == deadline
    assert ashby["additional_locations"] == ["Pune, India"]
    assert ashby["compensation"] == [{"minimum": 20000, "maximum": 40000, "currency": "INR", "period": "month"}]
    assert ashby["match"]["eligibility_status"] == "needs_confirmation"
    kinds = {item["label"]: item["kind"] for item in ashby["match"]["requirements"]}
    assert kinds == {"Python": "required_skill", "Docker": "mentioned_skill", "Experience duration": "manual_check"}
    assert lever["employment"] == "full_time" and lever["workplace"] == "remote"
    assert lever["compensation"][0]["period"] == "year"
    assert lever["match"]["eligibility_status"] == "not_established"
    assert client.get("/api/v1/jobs?source=live&workplace=hybrid&location=Pune&closing_within_days=6").json()["total"] == 1
    assert client.get("/api/v1/jobs?source=live&employment=full_time").json()["total"] == 1

    prefs = {"minimum_pay": {"amount": 35000, "currency": "INR", "period": "month"}}
    assert client.put("/api/v1/jobs/preferences", json=prefs).status_code == 200
    assert client.get("/api/v1/jobs?source=live&use_preferences=true").json()["total"] == 1
    assert client.put("/api/v1/jobs/preferences", json={**prefs, "include_unknown": True}).status_code == 200
    assert client.get("/api/v1/jobs?source=live&use_preferences=true").json()["total"] == 2


def test_new_saved_search_alerts_are_deduplicated_and_marked_read(catalog):
    client, feeds, deadline = catalog
    assert client.put("/api/v1/jobs/preferences", json={
        "role_keywords": ["Backend"], "workplace_modes": ["hybrid"], "location_keywords": ["India"],
    }).status_code == 200
    assert client.post("/api/v1/jobs/refresh").json()["new_alerts"] == 1
    assert client.post("/api/v1/jobs/refresh").json()["new_alerts"] == 0
    alert_url = "/api/v1/jobs/alerts"
    alerts = client.get(alert_url).json()
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["application_deadline"] == deadline
    assert alert["read_at"] is None
    read_url = f"{alert_url}/{alert['id']}/read"
    read = client.put(read_url).json()
    assert read["read_at"] and client.put(read_url).json() == read
    assert client.get(alert_url, params={"unread_only": True}).json() == []
    feeds["api.ashbyhq.com"] = 429
    result = client.post("/api/v1/jobs/refresh").json()
    assert any(item["source"] == "ashby" and item["status"] == "failed" for item in result["sources"])
    assert client.get("/api/v1/jobs?source=ashby").json()["total"] == 1
    assert result["new_alerts"] == 0


def test_confirmed_uk_work_authorization_controls_only_explicit_uk_requirement(catalog):
    client, feeds, _ = catalog
    feeds["api.ashbyhq.com"]["jobs"][0]["descriptionPlain"] = (
        "Requirements\nLegally authorized to work in the UK"
    )
    # Keep the primary record for this isolated eligibility case.
    feeds["api.ashbyhq.com"]["jobs"] = feeds["api.ashbyhq.com"]["jobs"][:1]
    client.post("/api/v1/jobs/refresh").raise_for_status()
    job = client.get("/api/v1/jobs?source=ashby").json()["jobs"][0]
    assert job["match"]["eligibility_status"] == "needs_confirmation"
    profile = "/api/v1/profile/application-details"
    client.put(profile, json={"uk_work_authorization": "not_authorized"}).raise_for_status()
    urls = "/api/v1/jobs?source=live&sort=match"
    jobs = client.get(urls).json()["jobs"]
    assert jobs[0]["source"] == "lever" and jobs[1]["source"] == "ashby"
    assert jobs[1]["match"]["eligibility_status"] == "not_met"
    assert jobs[1]["match"]["requirements"][0]["confirmation_source"] == "profile.uk_work_authorization"
    client.put(profile, json={"uk_work_authorization": "authorized"}).raise_for_status()
    job_id = jobs[1]["id"]
    analysis = client.post(f"/api/v1/jobs/{job_id}/analysis", json={}).json()
    assert analysis["job"]["match"]["eligibility_status"] == "listed_requirements_supported"


def test_explicit_semantic_analysis_sends_only_job_text_and_confirmed_skills(catalog, monkeypatch):
    client, _, _ = catalog
    for filename, skill in [("Private backend.pdf", "Python"), ("Private data.pdf", "SQL")]:
        resume = store_resume(filename, b"Private resume binary", "Private resume text", ResumeFacts(skills=[skill]))
        confirm_resume(resume.id, ResumeReview(revision=0, facts=ResumeFacts(skills=[skill])))

    url = "/api/v1/jobs/job-py-001/analysis"
    assert client.post(url, json={}).json()["semantic_status"] == "disabled"
    assert client.post(url, json={"use_semantic": True}).json()["semantic_status"] == "not_configured"
    monkeypatch.setenv("GETSWYDD_OPENAI_API_KEY", "test-key")
    captured = []

    def embed(request):
        import json

        assert str(request.url) == "https://api.openai.com/v1/embeddings"
        data = json.loads(request.content)
        captured.extend(data["input"])
        python = [1.0, 0.0] + [0.0] * 254
        sql = [0.0, 1.0] + [0.0] * 254
        return httpx.Response(200, json={"data": [
            {"index": 2, "embedding": sql}, {"index": 0, "embedding": python},
            {"index": 1, "embedding": python},
        ]})

    monkeypatch.setattr(job_analysis, "Client", lambda **options: httpx.Client(
        transport=httpx.MockTransport(embed), **options
    ))
    result = client.post(url, json={"use_semantic": True}).json()
    assert result["semantic_status"] == "available"
    assert [match["similarity"] for match in result["semantic_resume_matches"]] == [1, 0]
    assert captured[1:] == ["Python", "SQL"] and "Private" not in str(captured)
    assert result["job"]["match"]["recommended_resume"]["filename"] == "Private backend.pdf"


def test_retry_after_alert_storage_failure_keeps_new_job(catalog, monkeypatch):
    client, _, _ = catalog
    client.put("/api/v1/jobs/preferences", json={"role_keywords": ["Backend"]}).raise_for_status()
    persist = job_alerts._record_discoveries

    def fail(_):
        raise sqlite3.OperationalError("Simulated write failure")

    monkeypatch.setattr(job_alerts, "_record_discoveries", fail)
    with pytest.raises(sqlite3.OperationalError, match="Simulated write failure"):
        client.post("/api/v1/jobs/refresh")
    assert client.get("/api/v1/jobs?source=ashby").json()["total"] == 1
    monkeypatch.setattr(job_alerts, "_record_discoveries", persist)
    assert client.post("/api/v1/jobs/refresh").json()["new_alerts"] == 1
    assert client.get("/api/v1/jobs/alerts").json()[0]["job_title"] == "Python Backend Intern"


def test_scheduled_refresh_runs_and_is_cancellable(monkeypatch):
    calls = []
    monkeypatch.setattr(job_alerts, "refresh_catalog", lambda: calls.append("refresh"))

    async def stop(delay):
        assert delay == 300
        raise asyncio.CancelledError

    monkeypatch.setattr(job_alerts.asyncio, "sleep", stop)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(job_alerts.scheduled_refresh(5))
    assert calls == ["refresh"]
