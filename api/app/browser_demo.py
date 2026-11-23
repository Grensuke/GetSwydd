"""Run the demo employer form in an isolated, visible Chromium window."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from dataclasses import dataclass
import json
from html import escape
from uuid import uuid4

from app.db import DraftConflict, deliver_to_test_employer
from app.models import ApplicationDraft, SubmissionReceipt
from app.services import SYNTHETIC_CANDIDATE

FORM_URL = "https://getswydd-employer.test/application"
CONFIRMATION = "Test application received"
CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'"


class BrowserDemoUnavailable(RuntimeError):
    """Playwright or Chromium could not run the demo."""


@dataclass(frozen=True)
class DemoField:
    name: str
    label: str
    value: str
    multiline: bool = False
    required: bool = True


def sample_resume(draft: ApplicationDraft) -> bytes:
    profile = SYNTHETIC_CANDIDATE
    facts = profile["verified_facts"]
    skills = facts["python_experience"] if draft.job_id == "job-py-001" else facts["data_analysis"]
    lines = ("GetSwydd demo resume", profile["name"], profile["email"], draft.job_title,
             skills[:90], "Fictional candidate for local testing.")
    commands = ["BT /F1 12 Tf 48 754 Td 22 TL"]
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        commands.append(f"({escaped}) Tj T*")
    stream = ("\n".join([*commands, "ET"]) + "\n").encode("ascii", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"endstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(pdf)


def _document(title: str, content: str) -> str:
    return f"""<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<style>
body {{ margin: 2rem auto; max-width: 38rem; padding: 0 1rem; font: 16px/1.5 system-ui; color: #20332a; }}
label {{ display: block; margin: 1rem 0; font-weight: 600; }}
input, textarea {{ display: block; width: 100%; padding: .5rem; box-sizing: border-box; font: inherit; }}
textarea {{ min-height: 5rem; }}
button {{ padding: .5rem .8rem; font: inherit; }}
</style><main>{content}</main></html>"""


def _form(title: str, fields: list[DemoField]) -> str:
    controls = []
    for field in fields:
        name = escape(field.name, quote=True)
        required = " required" if field.required else ""
        label = escape(field.label)
        if field.multiline:
            control = f'<textarea name="{name}"{required}></textarea>'
        else:
            kind = "email" if field.name == "email" else "text"
            control = f'<input type="{kind}" name="{name}"{required}>'
        controls.append(f"<label>{label}{control}</label>")
    return _document("GetSwydd employer sandbox", f"""
      <p>GetSwydd employer sandbox</p>
      <h1>{escape(title)}</h1>
      <p>Review the filled test application here. Approve it in GetSwydd to send it to the local test inbox.</p>
      <form action="{FORM_URL}" method="post" enctype="multipart/form-data" autocomplete="off">
        {''.join(controls)}
        <label>Resume<input type="file" name="resume" accept="application/pdf" required></label>
        <button type="submit" disabled>Submit test application</button>
      </form>
      <p id="status" role="status"></p>
      <script>
      document.querySelector('form').addEventListener('submit', async (event) => {{
        event.preventDefault();
        const form = event.currentTarget;
        form.querySelector('button').disabled = true;
        const data = new FormData(form);
        const file = data.get('resume');
        const fields = Object.fromEntries(data.entries());
        delete fields.resume;
        try {{
          const response = await fetch(form.action, {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
              fields,
              filename: file.name,
              resume: Array.from(new Uint8Array(await file.arrayBuffer())),
            }}),
          }});
          if (!response.ok) throw new Error('Rejected');
          const heading = document.querySelector('h1');
          heading.textContent = '{CONFIRMATION}';
          form.hidden = true;
          document.querySelector('#status').textContent = 'Return to GetSwydd to view the receipt.';
        }} catch {{
          document.querySelector('#status').textContent = 'The preview changed. Open it again in GetSwydd.';
        }}
      }});
      </script>""")


def _matches_payload(body: bytes, fields: dict[str, str], filename: str, resume: bytes) -> bool:
    if len(body) > 1024 * 1024:
        return False
    try:
        return json.loads(body) == {"fields": fields, "filename": filename, "resume": list(resume)}
    except (ValueError, UnicodeError):
        return False


class DemoBrowserSession:
    def __init__(self, draft: ApplicationDraft) -> None:
        try:
            from playwright.sync_api import Error, sync_playwright
        except ImportError as error:
            raise BrowserDemoUnavailable("Install the Playwright dependency and Chromium to start the browser demo.") from error

        self.id = uuid4().hex
        self.draft_id = draft.id
        self.version = draft.updated_at
        self._browser = None
        self._driver = None
        self._approved = False
        self._received = False
        self._error = Error
        fields = [
            DemoField("name", "Full name", draft.candidate_name),
            DemoField("email", "Email address", SYNTHETIC_CANDIDATE["email"]),
        ]
        fields.extend(
            DemoField(f"answer_{index}", question.question, question.answer or "", True, question.required)
            for index, question in enumerate(draft.screening_questions)
        )
        expected = {field.name: field.value.replace("\r\n", "\n").replace("\r", "\n") for field in fields}
        resume = sample_resume(draft)
        filename = draft.selected_resume
        form = _form(draft.job_title, fields)

        def intercept(route):
            request = route.request
            if request.url != FORM_URL:
                route.abort()
            elif request.method == "GET" and request.is_navigation_request():
                route.fulfill(status=200, headers={"Content-Security-Policy": CSP},
                              content_type="text/html; charset=utf-8", body=form)
            elif (
                request.method == "POST" and self._approved and not self._received
                and _matches_payload(request.post_data_buffer or b"", expected, filename, resume)
            ):
                self._received = True
                route.fulfill(status=200, content_type="application/json", body='{"received":true}')
            else:
                route.abort()

        try:
            self._driver = sync_playwright().start()
            self._browser = self._driver.chromium.launch(headless=False, timeout=12_000)
            context = self._browser.new_context(service_workers="block")
            context.route("**/*", intercept)
            self._page = context.new_page()
            self._page.set_default_timeout(2_000)
            self._page.goto(FORM_URL, wait_until="domcontentloaded")
            for field in fields:
                self._page.locator(f'[name="{field.name}"]').fill(expected[field.name])
            self._page.get_by_label("Resume", exact=True).set_input_files({
                "name": filename, "mimeType": "application/pdf", "buffer": resume,
            })
            self._page.bring_to_front()
        except Error as error:
            self.close()
            raise BrowserDemoUnavailable(
                "Could not open the demo browser. Install Playwright Chromium and run the API from your desktop.",
            ) from error
        except Exception:
            self.close()
            raise

    def submit(self) -> None:
        try:
            if self._page.is_closed() or self._page.url != FORM_URL:
                raise DraftConflict("The mock employer form was closed or changed. Open it again.")
            button = self._page.get_by_role("button", name="Submit test application", exact=True)
            self._approved = True
            button.evaluate("(button) => { button.disabled = false; }")
            button.click()
            self._page.get_by_role("heading", name=CONFIRMATION, exact=True).wait_for()
            if not self._received:
                raise DraftConflict("The test receipt could not be verified. Open the mock form again.")
        except self._error as error:
            raise DraftConflict(
                "The browser could not confirm the reviewed form. Open it again and approve a fresh preview.",
            ) from error
        finally:
            self._approved = False

    def close(self) -> None:
        if self._browser:
            with suppress(self._error):
                self._browser.close()
        if self._driver:
            with suppress(self._error):
                self._driver.stop()


class BrowserDemoWorker:
    """A local API process owns one preview and one thread for all Playwright calls."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="getswydd-browser")
        self._session: DemoBrowserSession | None = None

    def prepare(self, draft: ApplicationDraft) -> str:
        return self._executor.submit(self._prepare, draft).result()

    def _prepare(self, draft: ApplicationDraft) -> str:
        self._close()
        self._session = DemoBrowserSession(draft)
        return self._session.id

    def deliver(self, draft_id: str, version: str, session_id: str) -> SubmissionReceipt | None:
        return self._executor.submit(
            deliver_to_test_employer, draft_id, version,
            confirm_browser=lambda draft: self._submit(draft, session_id),
        ).result()

    def _submit(self, draft: ApplicationDraft, session_id: str) -> None:
        session = self._session
        if not session or (session.id, session.draft_id, session.version) != (session_id, draft.id, draft.updated_at):
            raise DraftConflict("This browser preview is out of date. Open the mock employer form again.")
        try:
            session.submit()
        except DraftConflict:
            self._close()
            raise

    def cancel(self, draft_id: str, session_id: str) -> None:
        self._executor.submit(self._cancel, draft_id, session_id).result()

    def _cancel(self, draft_id: str, session_id: str) -> None:
        if self._session and (self._session.draft_id, self._session.id) == (draft_id, session_id):
            self._close()

    def _close(self) -> None:
        session, self._session = self._session, None
        if session:
            session.close()

    def shutdown(self) -> None:
        try:
            self._executor.submit(self._close).result()
        finally:
            self._executor.shutdown()
