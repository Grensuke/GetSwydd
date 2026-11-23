import json
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app import browser_demo
from app.main import app
from app.models import ApplicationDraft

DRAFTS = "/api/v1/applications/drafts"


@pytest.fixture
def demo(tmp_path, monkeypatch):
    monkeypatch.setenv("GETSWYDD_DB_PATH", str(tmp_path / "browser.db"))
    events = []

    class FakeBrowser:
        def __init__(self, draft):
            self.id = uuid4().hex
            self.draft_id = draft.id
            self.version = draft.updated_at
            events.append(("opened", draft))

        def submit(self):
            events.append(("confirmed", self.draft_id))

        def close(self):
            events.append(("closed", self.draft_id))

    monkeypatch.setattr(browser_demo, "DemoBrowserSession", FakeBrowser)
    with TestClient(app, base_url="http://127.0.0.1:8000", client=("127.0.0.1", 50001)) as client:
        yield client, events


def draft_url(client, job_id="job-da-002"):
    draft = client.post(DRAFTS, json={"job_id": job_id}).json()
    return f"{DRAFTS}/{draft['id']}/browser-demo", draft["updated_at"]


def test_browser_requires_approval_and_reuses_receipt(demo):
    client, events = demo
    url, version = draft_url(client)
    peek = client.post(url, json={"draft_updated_at": version})
    assert peek.status_code == 200, peek.text
    preview = peek.json()
    expected = [("opened", events[0][1])]
    assert events == expected
    assert client.post(url + "/submit", json={**preview, "approved": False}).status_code == 422
    assert events == expected
    assert client.get("/api/v1/applications").json() == []
    accepted = client.post(url + "/submit", json={**preview, "approved": True})
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["destination"] == "local_test_employer"
    assert events[-1][0] == "confirmed"
    assert client.post(url + "/submit", json={**preview, "approved": True}).json() == accepted.json()
    assert [event for event, _ in events] == ["opened", "confirmed"]
    assert client.get("/api/v1/applications").json() == [accepted.json()]


def test_rejects_incomplete_draft_and_cross_origin_request(demo):
    client, events = demo
    url, version = draft_url(client, "job-py-001")
    payload = {"draft_updated_at": version}
    assert client.post(url, json=payload).status_code == 409
    assert client.post(url, json=payload, headers={"Origin": "https://another-site.test"}).status_code == 403
    assert events == []


def test_canceled_and_changed_previews_cannot_submit(demo):
    client, events = demo
    url, version = draft_url(client)
    payload = {"draft_updated_at": version}
    first = client.post(url, json=payload).json()
    assert client.delete(f"{url}/{first['session_id']}").status_code == 204
    assert client.post(url + "/submit", json={**first, "approved": True}).status_code == 409
    current = client.post(url, json=payload).json()
    draft = url.removesuffix("/browser-demo")
    assert client.patch(draft + "/answers", json={"answers": {"sql_experience": "I use SQL."}}).status_code == 200
    assert client.post(url + "/submit", json={**current, "approved": True}).status_code == 409
    assert [event for event, _ in events] == ["opened", "closed", "opened"]
    assert client.get("/api/v1/applications").json() == []


def test_mock_employer_requires_exact_answers_and_sample_pdf(demo):
    client, _ = demo
    draft = ApplicationDraft.model_validate(client.post(DRAFTS, json={"job_id": "job-da-002"}).json())
    resume = browser_demo.sample_resume(draft)
    assert draft.job_title in PdfReader(BytesIO(resume), strict=True).pages[0].extract_text()
    fields = {"name": draft.candidate_name, "answer_0": "Reviewed answer"}
    payload = {"fields": fields, "filename": draft.selected_resume, "resume": list(resume)}
    assert browser_demo._matches_payload(json.dumps(payload).encode(), fields, draft.selected_resume, resume)
    changed = {**payload, "fields": {**fields, "answer_0": "Different answer"}}
    assert not browser_demo._matches_payload(json.dumps(changed).encode(), fields, draft.selected_resume, resume)
    changed = {**payload, "resume": [65]}
    assert not browser_demo._matches_payload(json.dumps(changed).encode(), fields, draft.selected_resume, resume)
