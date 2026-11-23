# GetSwydd Frontend — Phase 1 Changelog

> This changelog records the original milestone. See the [current frontend guide](FRONTEND-COMPLETE-REPORT.md#current-frontend-workflows) for the workflows and API behavior in the latest branch.

## 1. Summary
Phase 1 established the foundation for the GetSwydd candidate application assistant frontend. We built a bespoke design system rooted in a "quiet editorial" aesthetic reminiscent of printed journals and stationery, replacing generic purple/indigo SaaS styles with warm cream, sage grey, paper surfaces, and Fraunces typography. A global application shell was introduced with persistent accessible navigation, active-state routing indicators, an accessible mobile sheet, and a skip-to-content mechanism. We implemented a fully typed API layer covering all 24 backend endpoints, complete with structured error handling for FastAPI and Pydantic validation arrays. The four existing routes—Discover (`/`), Resumes (`/resumes`), Applications (`/applications`), and Draft Editor (`/applications/drafts/[draftId]`)—were redesigned into clean, accessible editorial layouts. Finally, we built the new Candidate Profile editor (`/profile`), allowing users to record and verify persistent particulars including their official name, availability, and UK right-to-work declarations.

---

## 2. Design System Reference

### 2.1 Token Palette

| Token Name | Hex Value | Intended Usage |
|---|---|---|
| `--color-paper` | `#F6EFE3` | Primary page canvas background with subtle ~2% inline SVG noise grain |
| `--color-paper-raised` | `#FBF7EF` | Surface for elevated panels, input backgrounds, and popovers |
| `--color-cream` | `#E8D2B5` | Brand highlight, active table rows, tag backgrounds, selection tint |
| `--color-cream-deep` | `#D9BE98` | Hover and active pressed states for cream elements |
| `--color-sage` | `#A5A79B` | Structural dividers, rules, resting icon tint |
| `--color-sage-soft` | `#C9CABF` | Subtle fills, skeletons, unselected meter bars |
| `--color-sage-deep` | `#6F7366` | Eyebrow labels, metadata text, placeholder text |
| `--color-ink` | `#2B2F27` | Primary typography, primary button fills, active navigation indicator |
| `--color-ink-soft` | `#4A4E44` | Secondary body copy, descriptions, explanatory text |
| `--color-hairline` | `#D8CCB6` | Standard 1px structural container borders |
| `--color-hairline-strong`| `#BDB59F` | Emphasized borders, hover states, dashed drop zones |
| `--color-moss` | `#5C7048` | Verified status text, confirmed fact indicators, meter fills |
| `--color-moss-tint` | `#E1E6D3` | Background tint for verified badges and success notices |
| `--color-ochre` | `#A8761F` | Needs confirmation / input required status text |
| `--color-ochre-tint` | `#F1E2BF` | Background tint for attention badges and missing fields |
| `--color-brick` | `#9C4531` | Error notices, unfulfilled requirements, destructive actions |
| `--color-brick-tint` | `#F0D9D0` | Background tint for error callouts and missing evidence |
| `--color-slate` | `#55656B` | Informational badges and technical metadata |
| `--color-slate-tint` | `#DCE3E4` | Background tint for technical source badges |

### 2.2 Typography Scale
- **Display / Headings (`--font-display`):** `Fraunces` variable font with optical sizing and soft axis. Used for display titles (32–40px) and section headers (20–24px).
- **Body / UI (`--font-sans`):** `Geist Sans` for all interactive controls, form fields, and body prose (13–15px, line-height 1.6).
- **Data / Monospace (`--font-mono`):** `Geist Mono` for IDs, dates, scores, counts, and file names with tabular numeral alignment (`.tabular-nums`).
- **Eyebrow Style:** 11px uppercase, tracking `0.14em`, semibold `sage-deep`, placed above major titles as a printed publication motif.

### 2.3 Radius & Spacing Rules
- **Radius:** `rounded-sm` (2px) on tags, badges, and meters; `rounded-md` (6px) on buttons and input fields; `rounded-lg` (8px) maximum on panels. Never use large pills or rounded-2xl/3xl containers.
- **Shadows:** No heavy drop shadows. Elevation is expressed strictly through hairline borders, tone shifts, and an optional 1px hairline shadow (`shadow-[0_1px_0_rgba(43,47,39,0.04)]`).
- **Dividers:** 1px hairline rules, and double rules (two hairlines 3px apart) beneath major page headers.

### 2.4 Do's and Don'ts
- **DO** anchor every answer in verified facts and show its origin with `SourceTag`.
- **DO** require an explicit review step and checkbox before submitting any application draft.
- **DO** use tabular numerals whenever numbers, dates, or scores align vertically.
- **DO NOT** use gradients, glow effects, or glassmorphic blur panels.
- **DO NOT** use purple, indigo, or neon accents.
- **DO NOT** use emojis, clip art, or robot/sparkle illustrations anywhere in the interface.
- **DO NOT** install third-party UI component libraries (such as shadcn or MUI); build primitives with Tailwind.

### 2.5 UI Primitives Inventory

| Primitive | Description | Import Path |
|---|---|---|
| `Button` | Accessible button supporting `primary`, `secondary`, `quiet`, `danger` variants, CSS ring spinner, and `href` links | `@/components/ui` |
| `Field` | Form field wrapper connecting labels, helper hints, and brick error messages to `aria-describedby` | `@/components/ui` |
| `Input` | Styled text input with hairline borders and focus rings | `@/components/ui` |
| `Textarea` | Styled multiline input with vertical resize and error border support | `@/components/ui` |
| `Select` | Styled native select with custom SVG chevron | `@/components/ui` |
| `Checkbox` | Native accessible checkbox with label and hint alignment | `@/components/ui` |
| `Badge` | Small caps 11px badge with semantic color tones | `@/components/ui` |
| `Panel` | Hairline bordered card with optional eyebrow, title, and action slots | `@/components/ui` |
| `Divider` | Single and double hairline printed-paper separation rules | `@/components/ui` |
| `PageHeader` | Standardized editorial header with eyebrow, Fraunces title, description, and double rule | `@/components/ui` |
| `Skeleton` | Sage-soft pulse placeholder matching final layout, disabled under reduced-motion | `@/components/ui` |
| `EmptyState` | Typographic empty screen state with eyebrow, headline, description, and action button | `@/components/ui` |
| `ErrorState` | Brick-tinted error container with service status and retry trigger | `@/components/ui` |
| `InlineNotice` | Multi-tone callout with a 2px colored border accent | `@/components/ui` |
| `SourceTag` | Provenance badge rendering fact origins ("Verified profile", "Provided by you", "Needs your input") | `@/components/ui` |
| `Stat` | Eyebrow label over a large Fraunces numeral with small caption | `@/components/ui` |

---

## 3. File Inventory

### 3.1 Created Files

| Path | Reason |
|---|---|
| `frontend/src/lib/cn.ts` | Tailwind class merger using `clsx` and `tailwind-merge` |
| `frontend/src/lib/api/types.ts` | Complete TypeScript domain models matching backend Pydantic schemas |
| `frontend/src/lib/api/client.ts` | Typed `requestJson`, `ApiError` class, and query string builder |
| `frontend/src/lib/api/jobs.ts` | API functions for job discovery, preferences, refresh, alerts, and analysis |
| `frontend/src/lib/api/applications.ts` | API functions for drafts, answer updates, submissions, and assisted tracking |
| `frontend/src/lib/api/resumes.ts` | API functions for resume upload, retrieval, review, and confirmed profile |
| `frontend/src/lib/api/profile.ts` | API functions for candidate application details persistence |
| `frontend/src/lib/api/index.ts` | Barrel export for typed API layer |
| `frontend/src/lib/format.ts` | Pure formatters for dates, relative times, deadlines, compensation, enums |
| `frontend/src/lib/hooks/useAsync.ts` | Async hook managing status transitions, retry triggers, and AbortController cleanup |
| `frontend/src/lib/hooks/usePageTitle.ts` | Helper setting document title per route conforming to `%s \| GetSwydd` template |
| `frontend/src/components/ui/button.tsx` | Editorial Button primitive with variants and CSS loading spinner |
| `frontend/src/components/ui/field.tsx` | Field wrapper, Input, Textarea, Select, Checkbox primitives |
| `frontend/src/components/ui/badge.tsx` | Semantic 11px Badge primitive |
| `frontend/src/components/ui/panel.tsx` | Hairline Panel container primitive |
| `frontend/src/components/ui/divider.tsx` | Single and double Divider rule primitives |
| `frontend/src/components/ui/page-header.tsx` | Standard PageHeader primitive |
| `frontend/src/components/ui/skeleton.tsx` | Motion-safe pulse Skeleton primitive |
| `frontend/src/components/ui/empty-state.tsx` | Typographic EmptyState primitive |
| `frontend/src/components/ui/error-state.tsx` | ErrorState notice primitive |
| `frontend/src/components/ui/inline-notice.tsx` | InlineNotice status primitive |
| `frontend/src/components/ui/source-tag.tsx` | Rule 1 fact provenance SourceTag component |
| `frontend/src/components/ui/stat.tsx` | Eyebrow over Fraunces numeral Stat primitive |
| `frontend/src/components/ui/index.ts` | Barrel export for UI primitives |
| `frontend/src/components/shell/app-shell.tsx` | Root application shell with skip-to-content, header, content, footer |
| `frontend/src/components/shell/site-header.tsx` | Responsive header with monogram, active route indicator, mobile sheet, and AlertsSlot |
| `frontend/src/components/shell/site-footer.tsx` | Low-emphasis cream footer with core product promise and route links |
| `frontend/src/components/shell/page-container.tsx` | 1200px max-width container with fade-up mount animation |
| `frontend/src/components/shell/index.ts` | Barrel export for shell components |
| `frontend/src/components/jobs/JobCard.tsx` | Reusable horizontal editorial JobCard component |
| `frontend/src/components/jobs/JobMatchSummary.tsx` | Horizontal meter match summary with eligibility indicators |
| `frontend/src/components/resumes/ResumeReview.tsx` | Fact verification and review editor component |
| `frontend/src/app/profile/page.tsx` | Application Details editor route |
| `frontend/src/app/not-found.tsx` | Custom 404 error page in editorial style |
| `frontend/src/app/error.tsx` | Custom global error boundary page in editorial style |
| `docs/frontend/PHASE-1-CHANGELOG.md` | Comprehensive Phase 1 documentation and specification record |

### 3.2 Modified Files

| Path | Reason |
|---|---|
| `frontend/package.json` | Installed `clsx`, `tailwind-merge`, and `lucide-react` |
| `frontend/src/app/globals.css` | Rewrote theme tokens, base element styles, noise grain, scrollbars, animations |
| `frontend/src/app/layout.tsx` | Loaded Fraunces/Geist fonts, set title template, and wrapped app in `AppShell` |
| `frontend/src/app/api-client.ts` | Re-exported from `@/lib/api/client` for backward compatibility |
| `frontend/src/app/application-drafts.ts` | Re-exported from `@/lib/api/applications` without duplicate logic |
| `frontend/src/app/resumes/resume-api.ts` | Re-exported from `@/lib/api/resumes` and `@/lib/api/types` |
| `frontend/src/app/resumes/resume-review.tsx` | Re-exported from `@/components/resumes/ResumeReview` |
| `frontend/src/app/job-match.tsx` | Re-exported from `@/components/jobs/JobMatchSummary` |
| `frontend/src/app/draft-application-button.tsx` | Restyled with `Button` using paper/ink tokens |
| `frontend/src/app/page.tsx` | Redesigned into editorial layout using `JobCard`, `useAsync`, and toolbar row |
| `frontend/src/app/resumes/page.tsx` | Redesigned into 2-column layout with drag-and-drop zone and master profile view |
| `frontend/src/app/applications/page.tsx` | Redesigned into editorial ledger table with responsive mobile stacking |
| `frontend/src/app/applications/drafts/[draftId]/page.tsx` | Redesigned into 2-column draft editor with sticky review panel and Rule 2 approval |
| `README.md` | Added Phase 1 Frontend completion notice linking to this changelog |

### 3.3 Moved / Renamed Files
- `frontend/src/app/job-match.tsx` → Moved logic to `frontend/src/components/jobs/JobMatchSummary.tsx` (re-export shim left at original path).
- `frontend/src/app/resumes/resume-review.tsx` → Moved logic to `frontend/src/components/resumes/ResumeReview.tsx` (re-export shim left at original path).

---

## 4. Routes

| Route | Purpose | Consumed Endpoints | Status |
|---|---|---|---|
| `/` | Discover career opportunities with explainable profile matching | `GET /api/v1/jobs` | Restyled |
| `/resumes` | Upload resumes, inspect extracted claims, and confirm master profile facts | `POST /api/v1/resumes`<br/>`GET /api/v1/resumes`<br/>`GET /api/v1/resumes/{id}`<br/>`PUT /api/v1/resumes/{id}/review`<br/>`GET /api/v1/profile` | Restyled |
| `/profile` | Manage verified candidate identity, availability, and UK work authorization | `GET /api/v1/profile/application-details`<br/>`PUT /api/v1/profile/application-details` | **New** |
| `/applications` | Audit trail of submitted packages and dispatch receipts | `GET /api/v1/applications` | Restyled |
| `/applications/drafts/[draftId]` | Inspect, answer, and explicitly approve application draft packages | `GET /api/v1/applications/drafts/{id}`<br/>`PATCH /api/v1/applications/drafts/{id}/answers`<br/>`POST /api/v1/applications/drafts/{id}/submit` | Restyled |

---

## 5. API Layer Coverage

All 24 backend endpoints have fully typed client functions in `frontend/src/lib/api/`.

| # | HTTP Method & Path | Client Function | Consumed in Phase 1 UI? | Page / Component |
|---|---|---|---|---|
| 1 | `GET /health` | `getHealth()` | No (ready for diagnostic panel) | — |
| 2 | `GET /api/v1/jobs` | `listJobs()` | **Yes** | Home (`/`) |
| 3 | `GET /api/v1/jobs/preferences` | `getPreferences()` | No (ready for Phase 2 preferences) | — |
| 4 | `PUT /api/v1/jobs/preferences` | `savePreferences()` | No (ready for Phase 2 preferences) | — |
| 5 | `POST /api/v1/jobs/greenhouse/refresh` | `refreshGreenhouse()` | No (ready for Phase 2 source management) | — |
| 6 | `POST /api/v1/jobs/refresh` | `refreshJobs()` | No (ready for Phase 2 unified refresh) | — |
| 7 | `GET /api/v1/jobs/alerts` | `listAlerts()` | No (ready for Phase 2 alert bell) | — |
| 8 | `PUT /api/v1/jobs/alerts/{alert_id}/read` | `markAlertRead()` | No (ready for Phase 2 alert drawer) | — |
| 9 | `POST /api/v1/jobs/{job_id}/analysis` | `analyzeJob()` | No (ready for Phase 2 semantic analysis) | — |
| 10 | `POST /api/v1/applications/drafts` | `createDraft()` | **Yes** | `DraftApplicationButton` |
| 11 | `GET /api/v1/applications/drafts/{draft_id}` | `getDraft()` | **Yes** | Draft Editor (`/applications/drafts/[draftId]`) |
| 12 | `PATCH /api/v1/applications/drafts/{draft_id}/answers` | `updateAnswers()` | **Yes** | Draft Editor (`/applications/drafts/[draftId]`) |
| 13 | `PUT /api/v1/applications/drafts/{draft_id}/answers` | (Aliased in `updateAnswers`) | **Yes** | Draft Editor |
| 14 | `POST /api/v1/applications/drafts/{draft_id}/submit` | `submitDraft()` | **Yes** | Draft Editor (`/applications/drafts/[draftId]`) |
| 15 | `GET /api/v1/applications` | `listSubmissions()` | **Yes** | Applications Tracker (`/applications`) |
| 16 | `GET /api/v1/applications/assisted` | `listAssisted()` | No (ready for Phase 3 tracker) | — |
| 17 | `PUT /api/v1/applications/drafts/{draft_id}/reported-submission` | `markReportedSubmission()`| No (ready for Phase 3 reporting flow) | — |
| 18 | `POST /api/v1/resumes` | `uploadResume()` | **Yes** | Resumes (`/resumes`) |
| 19 | `GET /api/v1/resumes` | `listResumes()` | **Yes** | Resumes (`/resumes`) |
| 20 | `GET /api/v1/resumes/{resume_id}` | `getResume()` | **Yes** | Resumes (`/resumes`) |
| 21 | `PUT /api/v1/resumes/{resume_id}/review` | `reviewResume()` | **Yes** | `ResumeReview` component |
| 22 | `GET /api/v1/profile` | `getProfile()` | **Yes** | Resumes (`/resumes`) |
| 23 | `GET /api/v1/profile/application-details` | `getApplicationDetails()`| **Yes** | Candidate Profile (`/profile`) |
| 24 | `PUT /api/v1/profile/application-details` | `saveApplicationDetails()`| **Yes** | Candidate Profile (`/profile`) |

---

## 6. Backend vs. Specification Discrepancies

1. **Filtering Parameters vs. Stored Preferences:** In the backend `JobSearchPreferences` model, `workplace_modes`, `employment_types`, and `experience_levels` are arrays. However, in `GET /api/v1/jobs`, the query parameters are singular query strings (`workplace`, `employment`, `experience_level`). `JobListParams` was typed to mirror these singular query expectations while keeping `JobSearchPreferences` typed as lists.
2. **Colon-Delimited Job Identifiers:** Live ATS jobs (e.g. `greenhouse:mozilla:12345`) contain colons. In `analyzeJob(jobId)` and `getDraft(draftId)`, identifiers are properly passed through `encodeURIComponent` to prevent routing errors.
3. **Screening Question Choices:** The backend returns an optional `choices: string[]` on `ScreeningQuestionAnswer` when Greenhouse supplies single-select inputs. The Draft Editor component was updated to conditionally render `<select>` dropdowns when choices exist, rather than strictly rendering a textarea.
4. **Pydantic Error Payloads:** FastAPI 422 errors return an array of error objects (`[{ loc, msg, type }]`) rather than a simple string. The `ApiError` class in `frontend/src/lib/api/client.ts` flattens this array into human-readable field errors (e.g., `candidate_name: String should have at least 1 characters`).

---

## 7. Rules Compliance

### Rule 1: Verified Facts Only
- **Enforcement:** Every fact and screening answer rendered in the application displays a `SourceTag`.
- If an answer originated from confirmed resume extraction, it is labeled with `"Verified profile"` and its source filename.
- If provided directly by the user, it is labeled `"Provided by you"`.
- If a required question has no confirmed fact, it renders an `"Input required"` badge with an attention tone. The assistant never invents or guesses placeholder credentials.

### Rule 2: User Approval Before Submission
- **Enforcement:** In `/applications/drafts/[draftId]`, the submission button remains disabled until:
  1. All mandatory screening questions have answers (`ready_for_review = true`).
  2. The candidate manually ticks an explicit approval checkbox: *"I have reviewed this draft version and approve its test submission."*
- Submitting sends the exact version timestamp (`draft_updated_at`), guaranteeing that any background edit invalidates approval.

### Rule 3: Assisted Mode Fallback
- **Enforcement:** The application card and data models explicitly support `application_mode: "assisted"`. When active, badges reflect "Assisted Mode" and layout slots are prepared to present external employer links rather than brittle botting.

---

## 8. Accessibility and Responsiveness Notes

### 8.1 Accessibility (WCAG 2.1 AA)
- **Contrast:** Body copy uses `ink` (`#2B2F27`) and `ink-soft` (`#4A4E44`) on `paper` (`#F6EFE3`), exceeding WCAG AAA for normal text (> 8:1 contrast ratio).
- **Semantics & Headings:** Every page contains exactly one `<h1>`. Landmarks (`<header>`, `<main id="content">`, `<footer>`, `<aside>`, `<nav>`) are used systematically.
- **Focus Indicators:** Interactive elements display a 2px `ink` focus ring with a 2px offset.
- **Keyboard Navigation:** The mobile navigation sheet traps focus, supports Escape key dismissal, and controls `aria-expanded` and `aria-controls`.
- **Screen Reader Announcements:** Form validation errors announce dynamically via `aria-live="polite"` and `role="alert"`.

### 8.2 Responsive Breakpoints
- **Mobile (360px – 767px):** Navigation collapses into a sheet; job cards stack metadata; application tracker ledger transitions from a table into stacked cards without horizontal overflow; draft editor side panel stacks beneath questions.
- **Tablet (768px – 1023px):** Desktop navigation bar appears; ledger renders as a table with sticky headers.
- **Desktop (1024px – 1440px):** Resumes page displays a 2-column layout (left: upload/list, right: review/profile); profile page displays form and "How this is used" aside; draft editor displays sticky review side panel.

---

## 9. Known Limitations & Deferred Items
- **Search & Filter Controls:** Deferred to Phase 2. The toolbar on `/` currently contains only the refresh control and results count, with clear mount points for Phase 2 search inputs and filters.
- **Alerts Bell Indicator:** The `AlertsSlot` component in `SiteHeader` is an exported placeholder. Phase 2 will plug in the unread count query (`GET /api/v1/jobs/alerts`) and popover.
- **Assisted Applications Tracker:** Deferred to Phase 3. The `/applications` page currently renders mock test receipts, with a commented mount point for `GET /api/v1/applications/assisted`.
- **Dark Mode:** Color tokens are defined in variables; dark mode theme redefinition is scheduled for Phase 3.

---

## 10. Hand-off Notes for Phase 2

### 10.1 Mount Points
- **Discover Toolbar (`frontend/src/app/page.tsx`):** Line marked `{/* PHASE 2 MOUNT POINT */}` ready for search input (`q`, `location`), workplace/employment filter pills, and saved preferences modal.
- **Header Alerts Bell (`frontend/src/components/shell/site-header.tsx`):** `AlertsSlot` component positioned on the right of the header. Phase 2 should connect `listAlerts({ unread_only: true })` and render a count badge.
- **Job Analysis Modal:** `analyzeJob(jobId, { use_semantic: true })` is ready in `frontend/src/lib/api/jobs.ts`. A "Detailed Match Analysis" button can be placed on `JobCard`.

### 10.2 Reusable Hooks & Utilities
- `useAsync(fn, deps)` in `frontend/src/lib/hooks/useAsync.ts`: Standardize all data loading through this hook.
- `usePageTitle(title)` in `frontend/src/lib/hooks/usePageTitle.ts`: Use on all new client pages.
- Formatters in `frontend/src/lib/format.ts`: `formatDeadline`, `formatCompensation`, `formatRelativeDate`.

---

## 11. How to Run & Manual QA Checklist

### 11.1 Commands

```powershell
# 1. Start FastAPI backend (Terminal 1)
cd c:\Users\bakht\GetSwydd\api
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Run verification in frontend (Terminal 2)
cd c:\Users\bakht\GetSwydd\web
npm run lint
npm run build

# 3. Start Next.js dev server
npm run dev
# Open http://localhost:3000
```

### 11.2 Manual QA Checklist

1. [ ] **Global Shell:** Navigate between Discover (`/`), Resumes (`/resumes`), Applications (`/applications`), and Profile (`/profile`). Active link displays an ink text color and a 2px bottom rule.
2. [ ] **Skip Link:** Press Tab upon opening any page; verify "Skip to main content" appears and jumps focus to `<main id="content">`.
3. [ ] **Mobile Menu:** Resize viewport to 400px; click "Open menu"; verify sheet displays all 4 links. Press Escape and verify menu closes.
4. [ ] **Home Page Catalog:** Verify synthetic job listings display title, company eyebrow, location, and metadata badges.
5. [ ] **Home Page Meter:** Inspect "Profile match" panel; verify thin 4px horizontal meter renders beside the Fraunces skill count.
6. [ ] **Home Page Honesty Statement:** Verify footer note: *"Estimated suitability, not a guarantee of hiring."*
7. [ ] **Home Page Refresh:** Click "Refresh catalog"; verify button enters loading state and updates count.
8. [ ] **Draft Creation:** Click "Draft Application" on a job card; verify user is routed to `/applications/drafts/[draftId]`.
9. [ ] **Draft Missing Questions:** Verify missing required questions are highlighted with an attention border, listed in the right panel with jump links.
10. [ ] **Draft Save Answers:** Enter text in the missing question field and click "Save draft answers"; verify status transitions to "Ready for review".
11. [ ] **Rule 2 Approval Checkbox:** Verify "Approve & Dispatch" button is disabled until the approval checkbox is ticked.
12. [ ] **Draft Submission:** Tick checkbox and click "Approve & Dispatch"; verify receipt ID is generated.
13. [ ] **Applications Tracker:** Navigate to `/applications`; verify newly submitted receipt appears in the table with "Delivered" and "Test submission" badges.
14. [ ] **Tracker Mobile Layout:** Resize `/applications` to 400px; verify table neatly transitions into stacked cards with zero horizontal scroll.
15. [ ] **Resume Upload (Drag-and-Drop):** Drag a sample PDF onto the drop zone in `/resumes`; verify extracted text and suggestions load.
16. [ ] **Resume Fact Confirmation:** Edit suggested facts, click "Confirm verified facts", and verify confirmed items appear in "Confirmed Profile" below.
17. [ ] **Profile Editor Form:** Navigate to `/profile`; enter candidate name, select UK work authorization, and verify completeness indicator updates.
18. [ ] **Unsaved Changes Warning:** Type edits in `/profile` without saving; verify "Unsaved changes" warning appears and Save button becomes active.
19. [ ] **404 Page:** Navigate to `/unknown-path`; verify quiet editorial 404 page renders with "Return to Discover" button.

