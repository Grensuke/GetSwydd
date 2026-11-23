# GetSwydd Frontend Phase 2 Changelog

> This changelog records the original milestone. See the [current frontend guide](FRONTEND-COMPLETE-REPORT.md#current-frontend-workflows) for the workflows and API behavior in the latest branch.

## 1. Summary

Phase 2 expanded GetSwydd from a static demonstration prototype into an end-to-end opportunity discovery engine and job qualification analysis suite. Across Prompt 1 and Prompt 2, the frontend gained full URL-synchronized discovery state, dual-input search, multi-source feed tabs, structured filter sidebars, an accessible mobile sheet, an editorial pagination system, and a right-side drawer for persistent search preferences. Candidates now receive real-time unread alert notifications via an accessible popover in the global header and can audit their alerts through a full editorial ledger on `/alerts`. Every job listing links directly to a deep qualification analysis view on `/jobs/[jobId]`, loading full provenance breakdown, required versus mentioned skills, profile work-authorization verification, and optional AI semantic suitability comparison. A non-intrusive deadline radar surfaces urgent upcoming deadlines closing within 14 days without unnecessary API queries. Throughout all additions, the quiet editorial aesthetic (Fraunces headings, paper/cream/sage surfaces, hairline borders, no emojis, no gradients) and the three foundational product rules (Verified Facts Only, User Approval Before Submission, and Assisted Mode Fallback) were rigorously maintained.

---

## 2. New and Changed Design Elements

No new brand colors or design tokens were introduced in Phase 2. All surfaces, text, borders, and semantic indicators adhere strictly to the Tailwind 4 `@theme` tokens established in Phase 1 (`paper`, `paper-raised`, `cream`, `cream-deep`, `sage`, `sage-soft`, `sage-deep`, `ink`, `ink-soft`, `hairline`, `hairline-strong`, `moss`, `ochre`, `brick`, `slate`).

| Component / Pattern | Purpose | Import Path |
| :--- | :--- | :--- |
| `Sheet` | Accessible modal overlay with focus trap, Escape key handling, and background scroll locking for mobile filters and drawer panels. | `@/components/ui/sheet` |
| `TagInput` | Keyboard-accessible tag input supporting comma/enter tokens, duplicate prevention, backspace removal, and `aria-live` announcements. | `@/components/discovery/TagInput` |
| `AlertsSlot` & Popover | Header trigger with mono unread count badge opening a 380px popover for quick alert review on desktop or routing to `/alerts` on mobile. | `@/components/shell/alerts-slot` |
| `SourceTabs` | Editorial underline tablist with roving `tabindex`, arrow key navigation, and mobile snap-scrolling. | `@/components/discovery/SourceTabs` |
| `SortControl` | Segmented radio toggle switching between default sorting and confirmed profile match ranking. | `@/components/discovery/SortControl` |
| `ActiveFilters` | Removable outline badge strip displaying active query parameters with accessible individual clear buttons and a "Clear all" link. | `@/components/discovery/ActiveFilters` |
| `DeadlineRadar` | Compact editorial panel derived from loaded results highlighting roles closing within 14 days. | `@/components/discovery/DeadlineRadar` |
| `Pagination` | Editorial page navigation with previous/next controls, page numbers, ellipses, and page size selector. | `@/components/discovery/Pagination` |
| `PreferencesDrawer` | Slide-in drawer for candidate role/location keywords, filter constraints, and compensation floor. | `@/components/discovery/PreferencesDrawer` |
| `Alerts Ledger` | Responsive table-to-stacked list presenting job alerts with status badges, deadline urgency, and quick actions. | `@/app/alerts/alert-rows` |

---

## 3. File Inventory

### Created Files
| File Path | Description |
| :--- | :--- |
| `frontend/src/lib/labels.ts` | Centralized label, description, and badge tone mappings for eligibility, requirements, and semantic statuses. |
| `frontend/src/lib/discovery/options.ts` | Shared option definitions for sources, workplace modes, employment types, experience levels, and sort options. |
| `frontend/src/lib/discovery/params.ts` | Type definitions and parsing/serialization utilities for URL-synced discovery parameters. |
| `frontend/src/lib/discovery/useDiscoveryParams.ts` | Custom hook coordinating URL parameters, debounced text inputs, and history-safe routing. |
| `frontend/src/lib/discovery/index.ts` | Barrel export for discovery utilities and parameter types. |
| `frontend/src/lib/context/AlertsContext.tsx` | React Context and provider managing unread alerts count, optimistic updates, and visibility-aware polling. |
| `frontend/src/lib/hooks/useAlerts.ts` | Re-export hook for consuming `AlertsContext`. |
| `frontend/src/components/ui/sheet.tsx` | Accessible modal sheet/drawer primitive with focus trapping and ARIA dialog attributes. |
| `frontend/src/components/discovery/SearchBar.tsx` | Dual text search bar with visible labels, submit button, and clear link. |
| `frontend/src/components/discovery/SourceTabs.tsx` | Roving tabindex source selector with editorial underline active state. |
| `frontend/src/components/discovery/FilterPanel.tsx` | Multi-select checkbox groups and closing deadline select with automated redundancy disabling. |
| `frontend/src/components/discovery/ActiveFilters.tsx` | Removable filter tags strip with single-click dismiss and bulk reset. |
| `frontend/src/components/discovery/SortControl.tsx` | Segmented sort control with disabled state and link when no profile is confirmed. |
| `frontend/src/components/discovery/Pagination.tsx` | Minimal editorial pagination with smooth scroll to results heading. |
| `frontend/src/components/discovery/RefreshButton.tsx` | Unified ATS refresh button with per-source outcome reporting and alert link. |
| `frontend/src/components/discovery/TagInput.tsx` | Fully accessible tag input component with screen reader announcements. |
| `frontend/src/components/discovery/PreferencesDrawer.tsx` | Right-side drawer for editing and saving search preferences with dirty tracking. |
| `frontend/src/components/discovery/PreferencesPayFields.tsx` | Modular compensation threshold inputs with currency and interval selectors. |
| `frontend/src/components/discovery/DiscoveryToolbar.tsx` | Discover toolbar displaying formatted result counts, live polite region, and actions. |
| `frontend/src/components/discovery/ResultsRegion.tsx` | Results view handling skeletons, tailored empty states, error states, and opacity-preserving refetching. |
| `frontend/src/components/discovery/MobileFilterSheet.tsx` | Mobile modal sheet wrapper for `FilterPanel`. |
| `frontend/src/components/discovery/DeadlineRadar.tsx` | Compact radar derived from visible listings displaying upcoming deadlines. |
| `frontend/src/components/discovery/index.ts` | Barrel export for discovery components. |
| `frontend/src/components/shell/alerts-slot.tsx` | Header bell control with unread count tag and recent alerts popover. |
| `frontend/src/components/analysis/AnalysisHeader.tsx` | Analysis header displaying job meta badges and data freshness timestamps. |
| `frontend/src/components/analysis/AnalysisAside.tsx` | Sticky aside containing application mode preparation affordances, employer link, and deadline notes. |
| `frontend/src/components/analysis/EligibilitySection.tsx` | Detailed qualification breakdown grouped into required, mentioned, and manual check skills. |
| `frontend/src/components/analysis/SkillsCoverageSection.tsx` | Skills coverage meter, matched vs unevidenced skill columns, and best-fit resume suggestion. |
| `frontend/src/components/analysis/SemanticSection.tsx` | Optional AI semantic comparison toggle and similarity breakdown. |
| `frontend/src/components/analysis/RoleDescriptionSection.tsx` | Plain-text role description parser with safe HTML stripping and toggleable expansion. |
| `frontend/src/app/discovery-view.tsx` | Main Discover container coordinating search, filters, toolbar, and results. |
| `frontend/src/app/alerts/page.tsx` | Full editorial ledger page for reviewing and managing job alerts. |
| `frontend/src/app/alerts/alert-rows.tsx` | Modular table and stacked card rows for the alerts ledger. |
| `frontend/src/app/alerts/loading.tsx` | Loading skeleton for the alerts page. |
| `frontend/src/app/alerts/error.tsx` | Error boundary for the alerts page. |
| `frontend/src/app/jobs/[jobId]/page.tsx` | Deep job analysis page evaluating suitability, requirements, and evidence. |
| `frontend/src/app/jobs/[jobId]/loading.tsx` | Loading skeleton for the job analysis page. |
| `frontend/src/app/jobs/[jobId]/error.tsx` | Error boundary with listing-unavailable message for the job analysis page. |
| `docs/frontend/PHASE-2-CHANGELOG.md` | Comprehensive documentation of Phase 2 deliverables, state models, and verification. |

### Modified Files
| File Path | Description |
| :--- | :--- |
| `frontend/src/app/page.tsx` | Mounted `DiscoveryView` inside `Suspense` with editorial fallback skeleton. |
| `frontend/src/components/jobs/JobCard.tsx` | Linked job titles to `/jobs/[jobId]`, enabled analysis links, added assisted mode caption, and integrated HTML stripping. |
| `frontend/src/components/jobs/JobMatchSummary.tsx` | Refactored to consume centralized `ELIGIBILITY_STATUS_MAP` and `REQUIREMENT_STATUS_MAP`. |
| `frontend/src/components/shell/app-shell.tsx` | Wrapped shell hierarchy in `AlertsProvider`. |
| `frontend/src/components/shell/site-header.tsx` | Replaced placeholder with interactive `AlertsSlot`. |
| `frontend/src/components/ui/index.ts` | Exported `Sheet` primitive. |
| `frontend/src/lib/hooks/useAsync.ts` | Added `keepPreviousData` option and `isRefetching` flag to prevent layout shift during filter updates. |
| `README.md` | Added Phase 2 completion announcement linking to changelogs. |

---

## 4. Routes

| Route | Purpose | Endpoints Consumed | Status |
| :--- | :--- | :--- | :--- |
| `/` | Discover opportunities with URL-synced search, source tabs, filters, sort, and pagination. | `GET /api/v1/jobs`, `POST /api/v1/jobs/refresh`, `GET /api/v1/jobs/preferences`, `PUT /api/v1/jobs/preferences` | Extended |
| `/jobs/[jobId]` | Deep qualification and suitability analysis for an opportunity. | `POST /api/v1/jobs/{job_id}/analysis` | New |
| `/alerts` | Full ledger of newly discovered job opportunities matching search preferences. | `GET /api/v1/jobs/alerts`, `PUT /api/v1/jobs/alerts/{alert_id}/read` | New |
| `/resumes` | Resume upload, text extraction, fact extraction, and confirmation. | `GET /api/v1/resumes`, `POST /api/v1/resumes`, `GET /api/v1/resumes/{id}`, `PUT /api/v1/resumes/{id}/review`, `GET /api/v1/profile` | Unchanged |
| `/profile` | Candidate contact information and UK work authorization editor. | `GET /api/v1/profile/details`, `PUT /api/v1/profile/details` | Unchanged |
| `/applications` | Application tracker for confirmed test submissions and assisted drafts. | `GET /api/v1/applications`, `GET /api/v1/applications/assisted` | Unchanged |
| `/applications/drafts/[draftId]` | Application draft editor with fact verification and approved submission. | `GET /api/v1/applications/drafts/{id}`, `PUT /api/v1/applications/drafts/{id}/answers`, `POST /api/v1/applications/drafts/{id}/submit` | Unchanged |
| `/_not-found` | Editorial 404 error page. | None | Unchanged |

---

## 5. Discovery State Model

All discovery parameters are stored in the URL search parameters to ensure that views are shareable, refresh-safe, and back-button friendly.

### Parameter Mapping
| Parameter | Type | Default | API Parameter | Behavior / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `source` | `string` | `"all"` | `source` | Values: `all`, `live`, `demo`, `greenhouse`, `lever`, `ashby`. Omitted in URL when default. |
| `q` | `string` | `""` | `q` | Role or company keyword. Debounced by 350ms before writing to URL. |
| `location` | `string` | `""` | `location` | Location filter keyword. Debounced by 350ms before writing to URL. |
| `internshipsOnly`| `boolean` | `false` | `internships_only` | When `true`, disables the `employment` filter options in the UI. |
| `workplace` | `string[]` | `[]` | `workplace` | Comma-separated in URL (`remote,hybrid,onsite`). First item passed to backend. |
| `employment` | `string[]` | `[]` | `employment` | Comma-separated in URL. First item passed to backend. |
| `experienceLevel`| `string[]` | `[]` | `experience_level` | Comma-separated in URL. First item passed to backend. |
| `closingWithinDays`| `number` | `null` | `closing_within_days`| Values: 3, 7, 14, 30 days. |
| `usePreferences` | `boolean` | `false` | `use_preferences` | When `true`, merges saved keywords; explicit filters take precedence. |
| `sort` | `string` | `"default"` | `sort` | Values: `default`, `match`. Disabled if no confirmed profile exists. |
| `page` | `number` | `1` | `offset` | Maps to `offset = (page - 1) * pageSize`. Page changes use `router.push`. |
| `pageSize` | `number` | `20` | `limit` | Values: 10, 20, 50 (max 100). |

### Navigation Rules
- **History Hygiene**: Text typing and filter adjustments call `router.replace(..., { scroll: false })` so search refinement does not pollute browser history. Page changes call `router.push(...)` so back/forward navigation between pages works as expected.
- **Page Reset**: Changing any search term, source tab, filter, or sort order automatically resets `page` to `1`.
- **Request Cancellation**: In-flight requests are automatically aborted via `AbortController` when new parameters are submitted, preventing stale responses from overwriting newer state.

### Exact Query Strings for 5 Sample Searches
1. **Keyword search for Python developer in remote mode:**
   `http://127.0.0.1:8000/api/v1/jobs?source=all&q=python&workplace=remote&limit=20&offset=0`
2. **Internships closing within 14 days:**
   `http://127.0.0.1:8000/api/v1/jobs?source=all&internships_only=true&closing_within_days=14&limit=20&offset=0`
3. **Live ATS feeds filtered by entry-level experience:**
   `http://127.0.0.1:8000/api/v1/jobs?source=live&experience_level=entry&limit=20&offset=0`
4. **Demo catalog sorted by profile match on page 2:**
   `http://127.0.0.1:8000/api/v1/jobs?source=demo&sort=match&limit=20&offset=20`
5. **Saved search preferences applied with location filter:**
   `http://127.0.0.1:8000/api/v1/jobs?source=all&location=London&use_preferences=true&limit=20&offset=0`

---

## 6. API Layer Coverage (All 24 Endpoints)

| # | Endpoint | Method | TypeScript Function | Consuming Component / Route |
| :- | :--- | :--- | :--- | :--- |
| 1 | `/health` | GET | `getHealth` | System health check (`api-client.ts`) |
| 2 | `/api/v1/jobs` | GET | `listJobs` | `DiscoveryView` (`frontend/src/app/discovery-view.tsx`) |
| 3 | `/api/v1/jobs/preferences` | GET | `getPreferences` | `PreferencesDrawer` (`components/discovery/PreferencesDrawer.tsx`) |
| 4 | `/api/v1/jobs/preferences` | PUT | `savePreferences` | `PreferencesDrawer` (`components/discovery/PreferencesDrawer.tsx`) |
| 5 | `/api/v1/jobs/greenhouse/refresh` | POST | `refreshGreenhouse` | Reserved for Greenhouse-specific refresh |
| 6 | `/api/v1/jobs/refresh` | POST | `refreshJobs` | `RefreshButton` (`components/discovery/RefreshButton.tsx`) |
| 7 | `/api/v1/jobs/alerts` | GET | `listAlerts` | `AlertsContext` (`lib/context/AlertsContext.tsx`), `/alerts` (`app/alerts/page.tsx`) |
| 8 | `/api/v1/jobs/alerts/{alert_id}/read` | PUT | `markAlertRead` | `AlertsSlot` (`components/shell/alerts-slot.tsx`), `/alerts` (`app/alerts/page.tsx`) |
| 9 | `/api/v1/jobs/{job_id}/analysis` | POST | `analyzeJob` | `/jobs/[jobId]` (`app/jobs/[jobId]/page.tsx`) |
| 10 | `/api/v1/applications/drafts` | POST | `createDraft` | `DraftApplicationButton` (`app/draft-application-button.tsx`) |
| 11 | `/api/v1/applications/drafts/{draft_id}` | GET | `getDraft` | `/applications/drafts/[draftId]` (`app/applications/drafts/[draftId]/page.tsx`) |
| 12 | `/api/v1/applications/drafts/{draft_id}/answers` | PATCH | `updateScreeningAnswers` | `/applications/drafts/[draftId]` (`app/applications/drafts/[draftId]/page.tsx`) |
| 13 | `/api/v1/applications/drafts/{draft_id}/answers` | PUT | `saveScreeningAnswers` | Alias endpoint supported in API layer |
| 14 | `/api/v1/applications/drafts/{draft_id}/submit` | POST | `submitDraft` | `/applications/drafts/[draftId]` (`app/applications/drafts/[draftId]/page.tsx`) |
| 15 | `/api/v1/applications` | GET | `listSubmissions` | `/applications` tracker (`app/applications/page.tsx`) |
| 16 | `/api/v1/applications/assisted` | GET | `listAssistedApplications`| `/applications` tracker (`app/applications/page.tsx`) |
| 17 | `/api/v1/applications/drafts/{id}/reported-submission` | PUT | `reportAssistedSubmission` | Reserved for assisted tracker confirmation (Phase 3) |
| 18 | `/api/v1/resumes` | POST | `uploadResume` | `/resumes` (`app/resumes/page.tsx`) |
| 19 | `/api/v1/resumes` | GET | `listResumes` | `/resumes` (`app/resumes/page.tsx`) |
| 20 | `/api/v1/resumes/{resume_id}` | GET | `getResume` | `/resumes` (`app/resumes/page.tsx`) |
| 21 | `/api/v1/resumes/{resume_id}/review` | PUT | `reviewResume` | `/resumes` (`app/resumes/page.tsx`, `components/resumes/ResumeReview.tsx`) |
| 22 | `/api/v1/profile` | GET | `getConfirmedProfile` | `/resumes` (`app/resumes/page.tsx`) |
| 23 | `/api/v1/profile/details` | GET | `getApplicationDetails`| `/profile` (`app/profile/page.tsx`) |
| 24 | `/api/v1/profile/details` | PUT | `updateApplicationDetails` | `/profile` (`app/profile/page.tsx`) |

---

## 7. Backend vs. Spec Discrepancies

1. **Filtering Parameters for Workplace, Employment, and Experience Level**:
   - *Spec*: Described repeated array parameters (e.g. `workplace=remote&workplace=hybrid`).
   - *Backend*: Route signature in `api/app/main.py` defines singular parameters (`workplace: Workplace | None = None`).
   - *Resolution*: Multi-select is enabled in URL state and saved preferences; `toApiParams` passes the first active value to `GET /api/v1/jobs`.
2. **Missing Endpoint for Single Job Lookup**:
   - *Spec*: Assumed a `GET /api/v1/jobs/{job_id}` endpoint existed.
   - *Backend*: No such endpoint exists. Job analysis (`POST /api/v1/jobs/{job_id}/analysis`) returns `{ job: Job, summary, ... }`.
   - *Resolution*: `/jobs/[jobId]` loads directly via `analyzeJob(jobId, { use_semantic })` and uses `response.job` as the authoritative source of truth.
3. **Alerts Response Structure & Unread Counts**:
   - *Spec*: Anticipated `{ total: int, alerts: JobAlert[] }` and a count endpoint.
   - *Backend*: `GET /api/v1/jobs/alerts` returns a raw JSON array `JobAlert[]`. No count endpoint exists.
   - *Resolution*: `AlertsContext` queries `limit=21` with `unread_only=true`. If 21 items return, the UI presents `"20+"` to ensure honesty rather than fabricating an exact count.
4. **Bulk Mark Read**:
   - *Spec*: Anticipated a bulk "Mark all read" endpoint.
   - *Backend*: Only single-alert update `PUT /api/v1/jobs/alerts/{alert_id}/read` exists.
   - *Resolution*: The UI does not provide a fake bulk mark-read action; alerts are marked read individually or automatically upon navigation.
5. **Preference Merge Behavior**:
   - *Backend*: `GET /api/v1/jobs` with `use_preferences=true` merges role/location keywords, but explicit workplace/employment/level query params completely replace the saved preference arrays for those fields.
   - *Resolution*: Documented in code and explained in the UI hint text.

---

## 8. Rules Compliance

- **Rule 1: Verified Facts Only**
  - Suitability estimates are explicitly disclaimed as suitability approximations, never hiring odds.
  - Every qualification match in `/jobs/[jobId]` displays exact fact quotes and the source resume filename via `SourceTag`.
  - Unmet qualifications are labelled neutrally ("No confirmed evidence in your resumes"), never declaring that the candidate lacks the skill.
  - UK work authorization matches are linked to `/profile` with a note explaining they originate from the candidate's verified profile details.
  - Data freshness timestamps (`source_updated_at`, `source_fetched_at`) are displayed in monospace.
- **Rule 2: User Approval Before Submission**
  - The job analysis view does not contain auto-submission affordances.
  - Assisted mode roles clearly explain that the candidate completes the submission on the employer's website.
- **Rule 3: Assisted Mode Fallback**
  - Roles with `application_mode === "assisted"` display an external link directly to the employer's official job board labelled with the hostname (e.g., `boards.greenhouse.io`).
  - The "Prepare application" button is rendered in a disabled state with a caption explaining it arrives in Phase 3.

---

## 9. Accessibility and Responsiveness Notes

- **Keyboard Navigation**:
  - `SourceTabs`: Roving `tabindex` with arrow keys (`Left`/`Right`/`Up`/`Down`), `Home`, and `End`.
  - `Sheet`: Focus trapped inside the drawer; background elements inert; `Escape` key closes the drawer and restores focus to the trigger.
  - `TagInput`: `Enter` or comma commits a tag; `Backspace` removes the last tag; tags can be focused and removed with `Space`/`Enter`.
  - `AlertsSlot`: Popover opens with `Space`/`Enter`, closes with `Escape` or outside click, and restores focus to the trigger.
- **Screen Readers**:
  - `aria-live="polite"` regions announce dynamic result count changes and tag additions/removals.
  - `aria-busy="true"` signals background data refetching while preserving existing content.
  - Heading hierarchy contains exactly one `h1` per page (`PageHeader` or `AnalysisHeader`).
- **Responsive Breakpoints**:
  - **360px**: Search inputs stack vertically; alerts ledger collapses to card rows; header displays bell icon with count badge.
  - **768px**: Tablet view with two-column search bar and expanded ledger tables.
  - **1024px**: Desktop layout with sticky left filter panel (260px) and sticky right analysis sidebar (320px).
  - **1440px**: Content constrained to 1200px max width with balanced editorial margins.

---

## 10. Performance and Request Hygiene

- **Debounced Search**: 350ms debounce on keyword and location text inputs ensures typing does not flood the network.
- **AbortController Cancellation**: Superseded API calls in `useAsync` and `AlertsContext` are aborted immediately.
- **Opacity Preservation**: During filter updates, existing job cards remain visible with `opacity-60` and `aria-busy`, eliminating layout shifts.
- **Visibility Polling**: Alerts polling runs on a 60-second timer and pauses automatically when the document is hidden (`document.visibilityState === "hidden"`). Window `focus` triggers an immediate refresh.

---

## 11. Known Limitations and Deferred Items

1. **Deadline Radar Scope**: Derived from the currently loaded page of listings rather than an unpaged backend query. Labelled as "Closing soon on this page" to maintain honesty.
2. **Alerts Count Cap**: Displays `"20+"` when unread alerts exceed 20 due to the absence of a dedicated count endpoint.
3. **Assisted Draft Flow**: Disabled in `AnalysisAside` until implemented in Phase 3.
4. **Filter Parameter Multi-select**: Only the first item of multi-select filters is forwarded to the backend `GET /api/v1/jobs` endpoint due to backend query constraints.

---

## 12. Hand-off Notes for Phase 3

1. **Personalized Draft Creation**:
   - Location: `frontend/src/app/draft-application-button.tsx` and `AnalysisAside.tsx`.
   - In Phase 3, connect `resume_id` from reviewed resumes to `POST /api/v1/applications/drafts`.
2. **Assisted Application Preparation**:
   - Location: `frontend/src/components/analysis/AnalysisAside.tsx`.
   - Enable the disabled "Prepare application" button to trigger assisted draft generation with Greenhouse question fetching (`form_status`).
3. **Assisted Submission Tracker**:
   - Location: `frontend/src/app/applications/page.tsx`.
   - Connect `PUT /api/v1/applications/drafts/{id}/reported-submission` to allow candidates to confirm external employer submissions.
4. **Shared Label Utilities**:
   - All status labels and badge tones should continue to be imported from `frontend/src/lib/labels.ts`.

---

## 13. How to Run and Verify (20-Item QA Checklist)

### Execution Commands
```powershell
# Backend (FastAPI)
python -m pytest -v
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (Next.js)
npm --prefix web run lint
npm --prefix web run build
npm --prefix web run dev
```

### Manual QA Checklist
- [x] 1. Navigate to `/` and confirm default source is "All" with demo listings displayed.
- [x] 2. Switch between source tabs (All, Live, Demo, Greenhouse, Lever, Ashby) using arrow keys.
- [x] 3. Type "Python" in the role search bar and observe the 350ms debounced URL update.
- [x] 4. Click the "Search" button or press Enter to commit search terms immediately.
- [x] 5. Click "Clear" in the search bar and verify both inputs and URL parameters reset.
- [x] 6. Select "Remote" in the workplace filter and verify `workplace=remote` in the URL and API request.
- [x] 7. Check "Internships only" and confirm that "Employment type" checkboxes are disabled with an explanatory hint.
- [x] 8. Verify the `ActiveFilters` strip appears and that clicking a badge's "X" removes that parameter.
- [x] 9. Click "Clear all" in `ActiveFilters` and confirm filters reset while retaining the source tab.
- [x] 10. Verify that "Best match" sort is disabled with a link to `/resumes` when no profile is confirmed.
- [x] 11. Open "Search preferences", add role keywords via keyboard tags, and save preferences.
- [x] 12. Confirm that closing the preferences drawer with unsaved changes displays a discard prompt.
- [x] 13. Click "Refresh sources" in the Discover toolbar and verify per-source outcomes display.
- [x] 14. Verify that new alerts discovered during refresh display a link to `/alerts`.
- [x] 15. Click the bell icon in the header on desktop and verify the 380px popover displays recent alerts.
- [x] 16. Click "View analysis" on an alert row and confirm it marks the alert read and navigates to `/jobs/[jobId]`.
- [x] 17. Open `/alerts` and verify the ledger table collapses to stacked cards on narrow viewports (<768px).
- [x] 18. On `/jobs/[jobId]`, verify requirements are split into required, mentioned, and manual check groups.
- [x] 19. Toggle "Include AI semantic comparison" and verify that semantic status and similarity meters render.
- [x] 20. Confirm the "Prepare application" button for assisted roles is disabled with the Phase 3 notice.
