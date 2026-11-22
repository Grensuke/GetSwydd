# GetSwydd

GetSwydd is a full-stack job search and application assistant designed for candidates seeking high-signal career opportunities with responsible, explainable preparation and approved submissions.

---

## Architecture Overview

- **`api/`**: Python 3.12+ backend powered by [FastAPI](https://fastapi.tiangolo.com/) and [Pydantic](https://docs.pydantic.dev/). Provides health checks and validated synthetic job listings with CORS configured for `http://localhost:3000`.
- **`web/`**: Modern frontend built with [Next.js](https://nextjs.org/) (App Router), TypeScript, Tailwind CSS, and npm. Features loading skeletons, empty state fallback, error diagnosis, and rich job opportunity cards.
- **`docs/`**: Product roadmap, core rules, and API specifications.
  - [docs/PROJECT.md](file:///c:/Users/STARK/Documents/GetSwydd/docs/PROJECT.md): Product vision, roadmap, and foundational rules.
  - [docs/api-contract.md](file:///c:/Users/STARK/Documents/GetSwydd/docs/api-contract.md): Endpoint contract and next-milestone specification.

---

## Core Product Rules

1. **Use Verified Facts for Application Answers**: Qualifications and claims are anchored exclusively in verified user profiles. The assistant never invents or exaggerates credentials.
2. **Require User Approval Before Submission**: Submissions are never dispatched automatically. The candidate must explicitly review and confirm all answers and attachments.
3. **Use Assisted Mode When Automation is Unsupported**: When direct employer/portal APIs are unavailable, GetSwydd provides guided packets and pre-fills rather than brittle, unauthorized scrapers.

---

## Quickstart (Windows PowerShell)

Follow these exact commands to install dependencies and run both servers locally in separate PowerShell terminals.

### Terminal 1: Backend (FastAPI)

1. Open PowerShell and navigate to the project repository:
   ```powershell
   cd c:\Users\STARK\Documents\GetSwydd\api
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Run tests:
   ```powershell
   pytest -v
   ```

5. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   - API Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
   - Interactive Docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Jobs Endpoint: [http://127.0.0.1:8000/api/v1/jobs](http://127.0.0.1:8000/api/v1/jobs)

---

### Terminal 2: Frontend (Next.js)

1. Open a second PowerShell terminal and navigate to the web directory:
   ```powershell
   cd c:\Users\STARK\Documents\GetSwydd\web
   ```

2. (Optional) Set up environment variables if modifying the API target:
   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Install frontend dependencies:
   ```powershell
   npm install
   ```

4. Run frontend verification:
   ```powershell
   npm run lint
   npm run build
   ```

5. Start the Next.js development server:
   ```powershell
   npm run dev
   ```

6. Open your browser:
   - Web Application: [http://localhost:3000](http://localhost:3000)

---

## Environment Configuration

- **API (`api/.env.example`)**:
  ```env
  HOST=127.0.0.1
  PORT=8000
  FRONTEND_ORIGIN=http://localhost:3000
  ```

- **Frontend (`web/.env.example`)**:
  ```env
  NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
  ```

---

## Next Milestone

In Milestone 2, candidates will be able to:
- Select a job from the listing to draft an application package.
- Identify missing questions and supply verified answers.
- Inspect the tailored draft before explicit submission to a local mock employer endpoint.
