# GetSwydd Project Guide

GetSwydd is a full-stack job search and application assistant designed to help candidates discover relevant roles, tailor application packages responsibly, and apply with confidence.

---

## Core Product Rules

All features and workflows in GetSwydd must adhere strictly to three foundational rules:

1. **Use Verified Facts for Application Answers**
   - Every claim, experience, skill, or credential in an application draft must be anchored in verified profile facts.
   - The assistant never hallucinates, exaggerates, or fabricates candidate qualifications. If information is missing, it asks the user.

2. **Require User Approval Before Submission**
   - No application is ever submitted automatically behind the user's back.
   - The user must explicitly inspect, verify, and approve the complete submission package (answers, attachments, and recipient) before dispatch.

3. **Use Assisted Mode When Automation is Unsupported**
   - For job boards, employer ATS portals, or forms lacking reliable or authorized APIs, GetSwydd switches to "assisted mode" (providing copy-paste packets, pre-filled fields, or guidance) rather than fragile, unauthorized botting or brittle scrapers.

---

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
- [ ] Add role-specific resume improvement suggestions.

### Phase 4: Integrations & Job Tracking
- [x] Import configured public Greenhouse boards into the backend and expose assisted application links.
- [x] Prepare local drafts for Greenhouse jobs and track user-reported submissions.
- [x] Save role and location preferences and filter or rank real jobs by confirmed skill evidence.
- [x] Search configured Greenhouse, Lever, and Ashby boards in one catalog.
- [x] Filter by workplace, employment type, experience, compensation, and closing date when listed.
- [x] Explain recognized job requirements and offer opt-in semantic resume comparison.
- [x] Refresh job listings on a schedule and retain deduplicated saved-search alerts.
- [ ] Add an authorized employer submission integration.
- [ ] Application status Kanban dashboard.
