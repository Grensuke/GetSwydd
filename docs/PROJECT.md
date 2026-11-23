# GetSwydd Project Guide

GetSwydd helps candidates review their resumes, find relevant jobs, see which requirements their experience supports, and prepare applications for review.

---

## Core Product Rules

All features and workflows in GetSwydd must adhere strictly to three foundational rules:

1. **Use confirmed facts for application answers**
   - Prefill candidate claims from user-confirmed resume or profile facts. Leave missing information for the user to supply during review.

2. **Require user approval before submission**
   - The candidate explicitly approves the reviewed answers, attachments, and intended recipient before GetSwydd can submit a package.

3. **Use assisted mode where submission automation is unavailable**
   - GetSwydd prepares application materials and opens the official form for the candidate to complete. The tracker identifies manual completion as user-reported.

---

## Current milestone

The backend supports the workflow from a reviewed resume to a ranked shortlist and an assisted application draft. The natural-language discovery endpoint is `POST /api/v1/agents/job-discovery`. The live Mozilla test in Swagger returned HTTP 200 with matches using Groq. The model extracts search filters, configured employer feeds supply the listings, and GetSwydd ranks them using confirmed profile evidence.

The next milestone is connecting the natural-language search UI to that endpoint. The frontend needs to show the applied filters and ranked jobs, ask for clarification when requested, and let the user open the official posting or prepare an assisted draft with a reviewed resume. See the [agent API contract](api-contract.md#12-job-discovery-agent) for request and response behavior and the [README](../README.md#try-live-job-discovery-with-groq) for the local smoke test.

## Product Roadmap

### Phase 1: Foundation
- [x] Next.js frontend with Tailwind CSS and App Router.
- [x] FastAPI backend with Pydantic validation and CORS configuration.
- [x] Synthetic job catalog (Python Developer Internship, Data Analyst Internship).
- [x] Local developer documentation, API contract, and smoke tests.

### Phase 2: Application Preparation & Local Submissions
- [x] Select a job to start an application draft.
- [x] Prefill answers from a synthetic candidate's verified facts.
- [x] Ask for missing answers and save the completed draft for review.
- [x] Accept explicit approval for the reviewed draft version.
- [x] Record a submission in the local test employer inbox and show its receipt in the tracker.

### Phase 3: Resume Management & Explainable Matching
- [x] Upload multiple text-based PDF and DOCX resumes and review extracted facts.
- [x] Merge confirmed facts into a local profile with resume sources.
- [x] Match sample job skills against the confirmed profile and show evidence, gaps, and checks that need confirmation.
- [x] Recommend the reviewed resume that supports the most listed skills.
- [x] Prepare personalized draft answers from confirmed profile and resume evidence.
- [ ] Add role-specific resume improvement suggestions.

### Phase 4: Integrations & Job Tracking
- [x] Import configured public Greenhouse boards into the backend and expose assisted application links.
- [x] Prepare assisted drafts for Greenhouse, Lever, and Ashby jobs and track user-reported submissions.
- [x] Save role and location preferences and filter or rank real jobs by confirmed skill evidence.
- [x] Search configured Greenhouse, Lever, and Ashby boards in one catalog.
- [x] Filter by workplace, employment type, experience, compensation, and closing date when listed.
- [x] Explain recognized job requirements and offer opt-in semantic resume comparison.
- [x] Refresh job listings on a schedule and retain deduplicated saved-search alerts.
- [x] Turn natural-language search requests into a ranked shortlist using a configurable model provider.
- [x] Verify live Groq-backed discovery in Swagger.
- [ ] Connect natural-language search and clarification to the frontend.
- [ ] Add an authorized employer submission integration.
- [ ] Application status Kanban dashboard.
- [ ] Add optional Gmail tracking through OAuth.
