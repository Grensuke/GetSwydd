from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from email import policy
from email.parser import BytesParser
from threading import Event

import httpx
import pytest
from fastapi.testclient import TestClient

from app import employer_submission, greenhouse
from app.main import app
from app.resume_models import ApplicationDetails, ResumeContact, ResumeFacts, ResumeReview
from app.resume_store import confirm_resume, delete_resume, save_application_details, store_resume

JOB_ID = "greenhouse:partner:123"
DRAFTS = "/api/v1/applications/drafts"


@pytest.fixture
def integration(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "getswydd.db"))
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_BOARDS", '{"partner":"Partner Employer"}')
    monkeypatch.setenv("GETSWYDD_GREENHOUSE_SUBMISSION_KEYS", '{"partner":"fixture-key"}')
    form = {
        "id": 123,
        "questions": [
            {"label": "Phone", "required": True, "fields": [{"name": "phone", "type": "input_text"}]},
            {"label": "Resume", "required": True, "fields": [
                {"name": "resume", "type": "input_file"}, {"name": "resume_text", "type": "textarea"},
            ]},
            {"label": "Can you work on site?", "required": True, "fields": [
                {"name": "question_100", "type": "multi_value_single_select", "values": [
                    {"label": "No", "value": 0}, {"label": "Yes", "value": 42},
                ]},
            ]},
        ],
    }
    writes = []
    reply = {"status": 201}

    def public_response(request):
        assert request.method == "GET"
        assert "authorization" not in request.headers
        if request.url.path.endswith("/jobs/123"):
            assert request.url.params.get("questions") == "true"
            return httpx.Response(200, json=form)
        return httpx.Response(200, json={"jobs": [{
            "id": 123, "title": "Engineering Intern", "location": {"name": "Bengaluru"},
            "absolute_url": "https://job-boards.greenhouse.io/partner/jobs/123",
        }]})

    def private_response(request):
        writes.append(request)
        if "arrived" in reply:
            reply["arrived"].set()
            assert reply["finish"].wait(timeout=5)
        if reply.get("timeout"):
            raise httpx.ReadTimeout("test timeout", request=request)
        return httpx.Response(reply["status"])

    monkeypatch.setattr(greenhouse, "Client", lambda **kwargs: httpx.Client(
        transport=httpx.MockTransport(public_response), **kwargs,
    ))
    monkeypatch.setattr(employer_submission, "Client", lambda **kwargs: httpx.Client(
        transport=httpx.MockTransport(private_response), **kwargs,
    ))

    with TestClient(app, base_url="http://127.0.0.1:8000", client=("127.0.0.1", 50001)) as client:
        facts = ResumeFacts(skills=["Python"])
        resume = store_resume("Intern.pdf", b"reviewed resume bytes", "Python", facts)
        confirm_resume(resume.id, ResumeReview(
            revision=0, facts=facts, contact=ResumeContact(email="candidate@example.test", phone="+919876543210"),
        ))
        save_application_details(ApplicationDetails(candidate_name="Alex Example"))
        assert client.post("/api/v1/jobs/greenhouse/refresh").status_code == 200
        yield client, resume.id, form, reply, writes


def prepare(client, resume_id, *, complete=True):
    response = client.post(DRAFTS, json={"job_id": JOB_ID, "resume_id": resume_id})
    assert response.status_code == 201, response.text
    draft = response.json()
    if complete:
        response = client.patch(f"{DRAFTS}/{draft['id']}/answers", json={"answers": {"question_100": "No"}})
        assert response.status_code == 200, response.text
        return response.json()
    return draft


def submit(client, draft, *, approved=True, version=None, headers=None):
    return client.post(
        f"{DRAFTS}/{draft['id']}/employer-submission",
        json={"approved": approved, "draft_updated_at": version or draft["updated_at"]},
        headers=headers,
    )


def test_sends_exact_approved_fields_and_original_resume_once(integration):
    client, resume_id, _, _, writes = integration
    draft = prepare(client, resume_id)
    assert draft["greenhouse_form_hash"]
    assert not writes
    result = submit(client, draft)
    assert result.status_code == 200, result.text
    receipt = result.json()
    assert receipt["employer_submission_status"] == "submitted"
    request, = writes
    assert str(request.url) == "https://boards-api.greenhouse.io/v1/boards/partner/jobs/123"
    assert request.headers["Authorization"] == "Basic Zml4dHVyZS1rZXk6"
    raw = f"Content-Type: {request.headers['content-type']}\r\n\r\n".encode() + request.content
    parts = {
        part.get_param("name", header="content-disposition"): part
        for part in BytesParser(policy=policy.default).parsebytes(raw).iter_parts()
    }
    assert {key: part.get_payload(decode=True) for key, part in parts.items()} == {
        "first_name": b"Alex", "last_name": b"Example", "email": b"candidate@example.test",
        "phone": b"+919876543210", "question_100": b"0", "resume": b"reviewed resume bytes",
    }
    assert parts["resume"].get_filename() == "Intern.pdf"
    assert submit(client, draft).json() == receipt
    assert client.get(f"{DRAFTS}/{draft['id']}").json() == receipt
    assert submit(client, prepare(client, resume_id)).status_code == 409
    assert len(writes) == 1
    tracked = client.get("/api/v1/applications/assisted").json()
    assert any(record["status_source"] == "greenhouse" and record["status"] == "submitted" for record in tracked)


def test_requires_explicit_approval_ready_current_draft_and_loopback(integration):
    client, resume_id, _, _, writes = integration
    incomplete = prepare(client, resume_id, complete=False)
    assert submit(client, incomplete).status_code == 409
    draft = prepare(client, resume_id)
    assert submit(client, draft, approved=False).status_code == 422
    assert submit(client, draft, version="older-draft").status_code == 409
    assert submit(client, draft, headers={"origin": "https://unapproved.example"}).status_code == 403
    assert not writes


@pytest.mark.parametrize("unsupported", ("no_key", "compliance", "question_type"))
def test_public_or_unsupported_forms_keep_manual_fallback(integration, monkeypatch, unsupported):
    client, resume_id, form, _, writes = integration
    if unsupported == "no_key":
        monkeypatch.delenv("GETSWYDD_GREENHOUSE_SUBMISSION_KEYS")
    elif unsupported == "compliance":
        form["data_compliance"] = [{"requires_processing_consent": True}]
    else:
        form["questions"][2]["fields"][0]["type"] = "multi_value_multi_select"
    draft = prepare(client, resume_id, complete=False)
    assert draft["greenhouse_form_hash"] is None
    assert draft["apply_url"]
    assert submit(client, draft).status_code == 409
    assert not writes


def test_checks_current_form_and_resume_before_sending(integration):
    client, resume_id, form, _, writes = integration
    draft = prepare(client, resume_id)
    saved_form = deepcopy(form)
    form["questions"][2]["fields"][0]["values"][0]["value"] = 999
    assert submit(client, draft).status_code == 409
    form.update(saved_form)
    delete_resume(resume_id)
    assert submit(client, draft).status_code == 409
    assert not writes


def test_rejected_request_requires_fresh_approval(integration):
    client, resume_id, _, reply, writes = integration
    reply["status"] = 403
    draft = prepare(client, resume_id)
    assert submit(client, draft).status_code == 502
    assert submit(client, draft).status_code == 409
    assert len(writes) == 1
    assert client.get(f"{DRAFTS}/{draft['id']}").json()["employer_submission_status"] is None


def test_timeout_does_not_report_success_or_repeat_submission(integration):
    client, resume_id, _, reply, writes = integration
    reply["timeout"] = True
    draft = prepare(client, resume_id)
    result = submit(client, draft).json()
    assert result["employer_submission_status"] == "uncertain"
    assert result["employer_submitted_at"] is None
    assert submit(client, draft).json() == result
    assert submit(client, prepare(client, resume_id)).status_code == 409
    assert len(writes) == 1
    assert any(item["status"] == "unconfirmed" for item in client.get("/api/v1/applications/assisted").json())


def test_concurrent_drafts_cannot_send_to_the_same_job(integration):
    client, resume_id, _, reply, writes = integration
    first = prepare(client, resume_id)
    second = prepare(client, resume_id)
    reply.update(arrived=Event(), finish=Event())
    with ThreadPoolExecutor(max_workers=2) as executor:
        pending = executor.submit(submit, client, first)
        try:
            assert reply["arrived"].wait(timeout=3)
            assert submit(client, first).json()["employer_submission_status"] == "sending"
            assert submit(client, second).status_code == 409
        finally:
            reply["finish"].set()
        assert pending.result(timeout=3).json()["employer_submission_status"] == "submitted"
    assert len(writes) == 1
