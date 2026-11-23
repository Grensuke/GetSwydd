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

A candidate can confirm a resume, find a suitable job from configured Greenhouse, Lever, and Ashby feeds, and prepare a draft from either the catalog or AI search. The India-first catalog includes explicitly worldwide remote roles. Groq or OpenAI interprets the natural-language query, while the backend applies filters and ranks actual postings using confirmed facts. The [discovery contract](api-contract.md#12-job-discovery-agent) describes the search and its clarification states.

The [application guide](../README.md#review-a-resume-and-prepare-an-application) covers the assisted employer-site workflow, local test inbox, Chromium demo, and approval-gated Greenhouse integration. Gmail sending is available at the API when a supported listing explicitly requests email applications. The Gmail connect, send, and tracker UI still needs wiring.

The tracker provides Ledger and Board views. It distinguishes test inbox receipts, user-reported submissions, and Greenhouse outcomes. Interview, assessment, offer, rejection, and saved statuses are personal tracking notes stored in the browser. Gmail inbox monitoring remains a separate roadmap item.

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
- [x] Fill a local mock employer form in Chromium for review and test submission.

### Phase 3: Resume Management & Explainable Matching
- [x] Upload multiple text-based PDF and DOCX resumes and review extracted facts.
- [x] Merge confirmed facts into a local profile with resume sources.
- [x] Extract supported contact hyperlinks, review contact fields, and remove uploaded resumes.
- [x] Search from a selected reviewed resume and require at least one recognized confirmed skill match.
- [x] Match sample job skills against the confirmed profile and show evidence, gaps, and checks that need confirmation.
- [x] Recommend the reviewed resume that supports the most listed skills.
- [x] Prepare personalized draft answers from confirmed profile and resume evidence.
- [ ] Add role-specific resume improvement suggestions.

### Phase 4: Integrations & Job Tracking
- [x] Import configured public Greenhouse boards into the backend and expose assisted application links.
- [x] Prepare assisted drafts for Greenhouse, Lever, and Ashby jobs and track user-reported submissions.
- [x] Save role and location preferences and filter or rank real jobs by confirmed skill evidence.
- [x] Search configured Greenhouse, Lever, and Ashby boards in one catalog.
- [x] Default the frontend to India and worldwide remote listings. Keep all locations available and use INR for new compensation preferences.
- [x] Filter by workplace, employment type, experience, compensation, and closing date when listed.
- [x] Explain recognized job requirements and offer opt-in semantic resume comparison.
- [x] Refresh job listings on a schedule and retain deduplicated saved-search alerts.
- [x] Turn natural-language search requests into a ranked shortlist using a configurable model provider.
- [x] Verify live Groq-backed discovery in Swagger.
- [x] Connect natural-language search and clarification to the frontend.
- [x] Submit a reviewed draft to supported Greenhouse boards with employer authorization and explicit candidate approval.
- [x] Provide Ledger and Kanban Board tracker views with personal stages and notes.
- [x] Add approval-gated Gmail sending to the backend for listings with supported email instructions.
- [ ] Connect the Gmail approval flow and Gmail-specific tracker statuses to the frontend.
- [ ] Explore Gmail inbox tracking for hiring updates with separate user permission.
