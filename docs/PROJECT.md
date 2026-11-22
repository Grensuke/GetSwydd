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
- [ ] PDF/DOCX resume upload and parsing.
- [ ] Resume variant recommendation and gap analysis.
- [ ] Match explainability badges ("Why this matches your background").

### Phase 4: Integrations & Job Tracking
- [ ] Authorized job board and employer integrations.
- [ ] Job alerts and deadline tracking.
- [ ] Application status Kanban dashboard.
