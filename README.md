# GetSwydd

GetSwydd is a local job search and application assistant. Upload and review resumes, find jobs on configured employer boards, compare job requirements with confirmed resume facts, and prepare an application for review.

- **Backend (`api/`)** runs on Python 3.12+, FastAPI, and SQLite. It handles resume review, the demo and live catalogs, matching, saved searches, alerts, and application drafts.
- **Frontend (`frontend/`)** uses Next.js, TypeScript, and Tailwind CSS. The local UI includes structured and AI job search, saved preferences, alerts, resume review, assisted drafts, and an application tracker with list and Kanban views.
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

In a second PowerShell terminal, start in the repository root.

```powershell
Set-Location .\frontend
npm.cmd ci
npm.cmd run dev -- --port 3000
```

Open [GetSwydd](http://localhost:3000). The frontend defaults to `http://127.0.0.1:8000`. To override it, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` using the template in `frontend/.env.example`.

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

## Development checks

- From `api/`, run `.\.venv\Scripts\python.exe -m pytest -q`.
- From `frontend/`, run `npm.cmd run lint` and `npm.cmd run build`.

Real employer applications use assisted mode. GetSwydd prepares the materials, and the candidate completes the employer's form. The approval and submission test flow writes to a local test inbox.
