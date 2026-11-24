# GetSwydd Frontend

The GetSwydd web client uses Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. Its main routes are Discover, Resumes, Profile, Applications, Alerts, and job and draft details.

## Core Capabilities

- **Interactive Skill Tags & Project Card Previews (`/resumes`)**: Interactive chip manipulation, inline tag creation (`Enter` / `,`), and raw-text switch; structured project cards with technology stack badges and bullet breakdown.
- **1-Click Skill Add from Job Analysis (`/jobs/[jobId]`)**: One-click action to add missing required skills directly to your primary resume with immediate match recalculation.
- **Bookmark & Saved Jobs System**: Reactive `useSyncExternalStore` hook synchronizing bookmarked roles across job cards, detailed analysis headers, and a dedicated Saved filter tab on Discover.
- **Gmail Application Review Modal**: Review email recipient, subject, drafted body, and attached resume with direct OAuth connection and approval dispatch. Tracked as "Sent via Gmail" across ledger and board views.
- **Kanban Drag-and-Drop & Application Analytics (`/applications`)**: Drag-and-drop cards between stages (`Saved`, `Preparing`, `Submitted`, `Assessment`, `Interview`, `Offer`, `Rejected`) with full keyboard accessibility, paired with a search funnel analytics dashboard showing active opportunities, channel breakdowns, and interview conversion rates.

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
