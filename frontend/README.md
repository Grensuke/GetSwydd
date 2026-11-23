# GetSwydd Frontend

The GetSwydd web client uses Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. Its main routes are Discover, Resumes, Profile, Applications, Alerts, and job and draft details.

## Run locally

Start FastAPI from a separate terminal using the [root setup guide](../README.md#backend). The frontend reads `NEXT_PUBLIC_API_URL` from `frontend/.env.local` and defaults to `http://127.0.0.1:8000`. Use the [environment template](.env.example) if you need to override it.

Run these commands from the repository root.

```powershell
Set-Location .\frontend
npm.cmd ci
npm.cmd run dev -- --port 3000
```

Open [GetSwydd](http://localhost:3000).

## Verify changes

From `frontend/`, run lint and the production build. The build also checks TypeScript.

```powershell
npm.cmd run lint
npm.cmd run build
```

For a frontend handoff, use the [current workflow and QA guide](docs/FRONTEND-COMPLETE-REPORT.md#current-frontend-workflows). For request and response details, use the [API contract](../docs/api-contract.md). [Frontend documentation](docs/README.md) links to the phase changelogs.
