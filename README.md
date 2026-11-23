# GetSwydd

GetSwydd is a local job search and application assistant. Upload and review resumes, find jobs on configured employer boards, compare job requirements with confirmed resume facts, and prepare an application for review.

- **Backend (`api/`)** runs on Python 3.12+, FastAPI, and SQLite. It handles resume review, the demo and live catalogs, matching, saved searches, alerts, and application drafts.
- **Frontend (`web/`)** uses Next.js, TypeScript, and Tailwind CSS. The local UI exposes jobs, resume review, application drafts, and tracking. The natural-language discovery endpoint is available in Swagger for frontend integration.
- **Product documentation** covers [project status and roadmap](docs/PROJECT.md) and the [API contract](docs/api-contract.md).

## Run locally on Windows

### Backend

In PowerShell, start in the repository root. The copy command creates a local configuration file on first run and preserves an existing one.

```powershell
Set-Location .\api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env --reload
```

Open [Swagger](http://127.0.0.1:8000/docs) to try the API or [check backend health](http://127.0.0.1:8000/health). Demo jobs, resume review, local matching, and draft preparation are available without a model key.

### Frontend

In a second PowerShell terminal, start in the repository root.

```powershell
Set-Location .\web
npm ci
npm run dev
```

Open [GetSwydd](http://localhost:3000). The frontend defaults to `http://127.0.0.1:8000`. To override it, set `NEXT_PUBLIC_API_URL` in `web/.env.local` using the template in `web/.env.example`.

## Try live job discovery with Groq

Create a key in the [Groq Console](https://console.groq.com/keys). Add or update these entries in `api/.env`, then restart the backend. Use `api/.env.example` as the template and keep real keys in `api/.env`.

```dotenv
GETSWYDD_DISCOVERY_PROVIDER=groq
GETSWYDD_DISCOVERY_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=replace_with_your_key
GETSWYDD_GREENHOUSE_BOARDS='{"mozilla":"Mozilla"}'
```

The Mozilla board is an example. Keep or add authorized boards using the Greenhouse, Lever, and Ashby maps in the [API contract](docs/api-contract.md#11-unified-job-discovery-and-analysis). The agent needs a configured board with available listings to return results.

In [Swagger](http://127.0.0.1:8000/docs), open `POST /api/v1/agents/job-discovery`, select **Try it out**, and send this request.

```json
{
  "message": "Ignore my saved preferences and find two jobs at Mozilla.",
  "limit": 2,
  "refresh": true
}
```

The live Groq smoke test returned HTTP 200 with `status: "results"`. The match count depends on the catalog. `total_matches` counts all matches and `jobs` contains up to two entries for this request. If the response has no results, check `refresh_sources` and the applied filters. The [agent API contract](docs/api-contract.md#12-job-discovery-agent) covers OpenAI configuration, response states, and error handling.

## Development checks

- From `api/`, run `.\.venv\Scripts\python.exe -m pytest -q`.
- From `web/`, run `npm run lint` and `npm run build`.

Real employer applications use assisted mode. GetSwydd prepares the materials, and the candidate completes the employer's form. The approval and submission test flow writes to a local test inbox.
