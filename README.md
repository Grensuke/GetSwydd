# GetSwydd

GetSwydd is a local job search and application assistant for roles in India and remote jobs open worldwide. Upload and review resumes, search configured employer boards, compare job requirements with confirmed resume facts, and review an application before sending it.

- **Backend (`api/`)** runs on Python 3.12+, FastAPI, and SQLite. It handles resume review, the demo and live catalogs, matching, saved searches, alerts, application drafts, and approval-gated submission integrations.
- **Frontend (`frontend/`)** uses Next.js, TypeScript, and Tailwind CSS. The local UI includes structured and AI job search, saved preferences, alerts, resume review, application review, and a tracker with Ledger and Board views.
- **Product documentation** covers [project status and roadmap](docs/PROJECT.md) and the [API contract](docs/api-contract.md). The [frontend guide](frontend/README.md) links to the frontend report and release notes.

## Run locally on Windows

### Backend

In PowerShell, start in the repository root. The copy command creates a local configuration file on first run and preserves an existing one.

```powershell
Set-Location .\api
if (-not (Test-Path '.\.venv\Scripts\python.exe')) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env --reload
```

Open [Swagger](http://127.0.0.1:8000/docs) to try the API or [check backend health](http://127.0.0.1:8000/health). Demo jobs, resume review, local matching, and draft preparation are available without a model key.

### Frontend

Use a supported Node.js LTS release and npm. In a second PowerShell terminal, start in the repository root.

```powershell
Set-Location .\frontend
npm.cmd ci
npm.cmd run dev -- --port 3000
```

Open [GetSwydd](http://localhost:3000). The frontend defaults to `http://127.0.0.1:8000`. To override it, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` using the template in `frontend/.env.example`.

## Review a resume and prepare an application

1. Open **Resumes** and upload a text-based PDF or DOCX up to 5 MB. Review the suggested skills with the **interactive skill tag editor** (add tags, delete with `×`, type with `Enter` or `,`, or toggle raw text), inspect **structured project card previews** with parsed tech stack badges, and verify education, experience, certifications, and contact details. The extractor reads supported PDF and DOCX link targets, so a linked phone number, email, LinkedIn profile, or GitHub profile can appear even when the visible text is just a label.
2. Confirm the facts you want to use. The **Confirmed profile** groups facts by category and shows their source resumes. Select **Remove** to delete a resume and facts unique to it. Saved drafts keep their snapshots.
3. In **Profile**, save your candidate name and optional availability. Answer work authorization questions on individual drafts when an employer asks.
4. Use **Find jobs with this resume**, **Search with AI**, or the catalog. Bookmark roles to review later using the **Bookmark / Saved Jobs** system. Open the job analysis, use **+ Add skill** to immediately append missing required skills to your primary resume, or choose **Prepare application**. Select a reviewed resume, save any missing answers, and check the draft before continuing.

| Workflow | What happens after review |
| --- | --- |
| Assisted application | Open the official employer form, use the prepared answers and resume, and report completion in GetSwydd when you have submitted. |
| Authorized Greenhouse submission | **Approve and apply** sends the saved version and selected resume to a supported, opted-in Greenhouse board. It requires an employer-issued board key. |
| Local test submission | Submit the sample draft to the test inbox, with an optional Chromium preview of the mock form. |
| Gmail API integration | Connect Gmail via OAuth directly in the review modal, preview the drafted email and resume attachment, and dispatch with explicit approval. Verified in the tracker as **Sent via Gmail**. |

### Application tracker and search analytics

Open **Applications** to manage your search pipeline in either **Ledger** table or **Board** view:
- **Kanban Drag-and-Drop**: Drag application cards across stages (`Saved`, `Preparing`, `Submitted`, `Assessment`, `Interview`, `Offer`, `Rejected`) with visual drag handles, dropzones, and full keyboard accessibility.
- **Search Funnel & Application Analytics**: Track total active opportunities, submission channels (Greenhouse, Gmail, Direct), active pipeline stages, and overall interview conversion rate.

### Try the browser application demo

Run this once from `api/` after installing `requirements.txt`.

```powershell
.\.venv\Scripts\python.exe -m playwright install chromium
```

Run the backend from your desktop with the loopback host shown above and omit `--reload` for the browser demo. In Discover, select **Demo**, open **Data Analyst Internship**, and start a demo draft with the sample résumé. Select **Fill mock employer form**. Review the sample name, email, résumé, and screening answers in the Chromium window, then return to GetSwydd, check the approval box, and select **Approve and submit test application**. The browser shows confirmation and the receipt appears in **Applications**. The demo uses one browser preview at a time.

## Browse jobs in India

The frontend opens the live catalog with **India and worldwide remote** selected. It includes jobs with an Indian city or India in the listed location and roles explicitly open worldwide. Choose **All locations** for international listings. The **Demo** source opens the sample catalog. Compensation preferences use INR by default.

For an existing setup, update `GETSWYDD_GREENHOUSE_BOARDS` in `api/.env` using the starter map below. The feeds are public employer boards. Keep up to five entries in the Greenhouse map. Restart the backend, then select **Refresh sources** on the job search page to import the listings.

```dotenv
GETSWYDD_GREENHOUSE_BOARDS='{"razorpaysoftwareprivatelimited":"Razorpay","hackerrank":"HackerRank","enterpret":"Enterpret","instawork":"Instawork"}'
```

## Try live job discovery with Groq

Create a key in the [Groq Console](https://console.groq.com/keys). Add or update these entries in `api/.env`, then restart the backend. Use `api/.env.example` as the template and keep real keys in `api/.env`.

```dotenv
GETSWYDD_DISCOVERY_PROVIDER=groq
GETSWYDD_DISCOVERY_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=replace_with_your_key
```

The agent searches the configured Greenhouse, Lever, and Ashby feeds. Check the [API contract](docs/api-contract.md#11-unified-job-discovery-and-analysis) for board setup.

On the Discover page, open **Search with AI** and choose **Use example**, then **Find jobs**. The agent refreshes the configured feeds and returns a ranked shortlist with links to the listings. The **Employer feeds checked** section shows which boards were used.

In [Swagger](http://127.0.0.1:8000/docs), open `POST /api/v1/agents/job-discovery`, select **Try it out**, and send this request.

```json
{
  "message": "Ignore my saved preferences and find two internships in India.",
  "limit": 2,
  "refresh": true
}
```

A successful search returns HTTP 200. The match count depends on the catalog. `total_matches` counts all matches and `jobs` contains up to two entries for this request. If the response has no results, check `refresh_sources` and the applied filters. The [agent API contract](docs/api-contract.md#12-job-discovery-agent) covers provider configuration, response states, and errors.

## Verify the Gmail backend integration

Use the mocked integration test from `api/`. It exercises OAuth, approval, the message and original attachment, and the tracker response without sending a real email.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_application_email.py -q
```

To check the local catalog, refresh sources in Discover and run this in PowerShell. A zero email count with live results means the available descriptions did not contain an email submission instruction recognized by the parser.

```powershell
$catalog = Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/jobs?source=live'
$emailJobs = @($catalog.jobs | Where-Object { $_.email_application_available -eq $true })
"Live listings: $($catalog.total)"
"Email applications available: $($emailJobs.Count)"
$emailJobs | Select-Object title, company, location
```

For local API setup and the approval fields, see the [Gmail API contract](docs/api-contract.md#13-application-by-email-with-gmail).

## Development checks

- From `api/`, run `.\.venv\Scripts\python.exe -m pytest -q`.
- From `frontend/`, run `npm.cmd run lint` and `npm.cmd run build`.

Use the [frontend QA guide](frontend/docs/FRONTEND-COMPLETE-REPORT.md#current-verification) to verify the review flow, tracker, and light and dark layouts.
