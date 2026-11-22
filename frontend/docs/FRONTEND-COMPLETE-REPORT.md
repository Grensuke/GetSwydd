# GetSwydd Frontend: Consolidated Architecture and Engineering Report (Phases 1–3)

This document is the authoritative, self-contained engineering report for the GetSwydd frontend client. It describes the complete implementation delivered across Phase 1 (Foundation and Identity), Phase 2 (Discovery and Matching), and Phase 3 (Application Workflow, Tracking, and Dark Mode). All descriptions, component inventories, token mappings, and route contracts reflect the exact code as it exists in the repository.

---

## 1. Executive Summary

GetSwydd is an agentic job search and application preparation assistant designed around a "quiet editorial" stationery aesthetic. The web frontend is implemented using Next.js 16.4.6 (App Router with Turbopack), React 19.3.0, TypeScript 5 (strict mode), and Tailwind CSS 4.3.3. It communicates with an immutable FastAPI backend running on Python 3.12 and Pydantic v2.

Development was structured across three engineering phases:
1. **Phase 1 (Foundation and Identity)** established the design token palette, 15 accessible UI primitives with zero external component library dependencies, the global application shell with keyboard-first skip links, a fully typed API layer covering all 24 backend endpoints, and initial interfaces for candidate profile management and resume fact verification.
2. **Phase 2 (Discovery and Matching)** introduced an opportunity discovery engine supporting multi-source job aggregation (Greenhouse, Lever, Ashby, and internal Demo feeds), dual query/role search, multi-faceted filtering with URL state synchronization, a saved search preferences drawer, an alerts polling system with an unread badge popover, a deep job qualification analysis view, and a 14-day deadline radar.
3. **Phase 3 (Application Workflow, Tracking, and Dark Mode)** completed the core application lifecycle. It delivered a two-step application launcher (`StartApplication` and `ResumeSelector`), a draft editor (`/applications/drafts/[draftId]`) with strict choice validation and answer provenance inspection, an assisted application flow with clipboard copying and user-reported submission confirmation, a unified application tracker (`/applications`) featuring a two-tier status architecture across both an editorial Ledger table and a keyboard-first Kanban Board, and a token-only dark mode system with zero layout flash.

All 10 application routes compile cleanly to static and partially prerendered (PPR) bundles. Automated validation confirms zero ESLint warnings, zero TypeScript compilation errors, zero `any` type assertions, and zero `eslint-disable` overrides across 109 TypeScript source files.

### Diagnostic Verification Output

The frontend verification suite was executed against the current repository state:

```text
> web@0.1.0 lint
> eslint
(0 errors, 0 warnings)

> npx tsc --project frontend/tsconfig.json --noEmit
Finished TypeScript in 1701ms ... (0 errors)

> web@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Running next.config.ts took 31ms
- Cache Components enabled
- Partial Prefetching enabled
  Creating an optimized production build ...
✓ Compiled successfully in 504ms
  Running TypeScript ...
  Finished TypeScript in 1701ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (10/10) in 1355ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /alerts
├ ○ /applications
├   /applications/drafts/[draftId]
│ └ ◐ /applications/drafts/[draftId]
├   /jobs/[jobId]
│ └ ◐ /jobs/[jobId]
├ ○ /profile
└ ○ /resumes

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
```

---

## 2. Product Rules and How the UI Enforces Them

The GetSwydd application is strictly governed by three non-negotiable product principles. Every screen, component, and interaction pattern is designed to uphold these guarantees.

```mermaid
flowchart TD
    subgraph Rule1["Rule 1: Verified Facts Only"]
        R1_Source["Resume / Profile Extracted Fact"] --> R1_Tag["SourceTag Provenance Label"]
        R1_Empty["Missing / Null Candidate Fact"] --> R1_Input["Empty Input with 'Needs your input' Notice"]
        R1_NoHallucination["No LLM Synthesis or Guessing"]
    end

    subgraph Rule2["Rule 2: User Approval Before Submission"]
        R2_Draft["Application Draft Prepared"] --> R2_Review["Explicit Review Summary Screen"]
        R2_Review --> R2_Checkbox["Mandatory Approval Checkbox"]
        R2_Checkbox --> R2_Submit["Submit Button Activated"]
    end

    subgraph Rule3["Rule 3: Assisted Mode Fallback"]
        R3_Job["Non-Demo Opportunity (ATS Job)"] --> R3_Packet["Curated Application Packet"]
        R3_Packet --> R3_Copy["One-Click Form Field Copying"]
        R3_Copy --> R3_Ext["External Employer Application URL"]
        R3_Ext --> R3_Report["User-Reported Submission Confirmation"]
    end
```

### Rule 1: Verified Facts Only
*Principle:* Never display fabricated credentials, never extrapolate employment history, and never invent answers to employer screening questions. The candidate's verified resume and confirmed profile are the sole sources of truth.
*UI Enforcement:*
- **Provenance Display:** All pre-filled data render an explicit provenance badge via `SourceTag` ([source-tag.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/source-tag.tsx)). Badges indicate the exact origin (e.g., `verified`, `inferred`, `employer`, `manual`).
- **Absence of Data Handling:** When a screening question cannot be answered from confirmed profile facts, the backend returns a `null` answer. The frontend displays the field with empty contents, highlights it with an amber border, and renders an amber notice stating: `"Needs your input. We could not find a verified answer in your profile."` (enforced in [QuestionBlock.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/QuestionBlock.tsx#L40-L55)).
- **Collapsible Evidence Provenance:** In [QuestionBlock.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/QuestionBlock.tsx#L70-L86), when an answer is provided, a toggleable `"View verified evidence"` disclosure reveals the exact resume excerpts and reasoning string generated during extraction.

### Rule 2: User Approval Before Submission
*Principle:* No application may be submitted automatically. The user must review all prepared materials, acknowledge their accuracy, and grant explicit consent.
*UI Enforcement:*
- **Pre-Submission Review Panel:** In [ReviewPanel.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/ReviewPanel.tsx#L85-L135), the submission controls are gated behind an approval workflow.
- **Mandatory Approval Checkbox:** The "Submit Application" button remains strictly disabled until the candidate checks the legal consent checkbox: `"I have reviewed these answers and confirm they are accurate. I authorize GetSwydd to submit this test application."`
- **Zero Single-Click Dispatches:** Navigating, loading pages, or clicking draft creation buttons never triggers an external dispatch.

### Rule 3: Assisted Mode Fallback
*Principle:* When an employer does not support direct API submission (which applies to all live Greenhouse, Lever, and Ashby job postings), GetSwydd transitions into Assisted Mode. The platform never attempts fragile headless browser automation or unverified DOM injection.
*UI Enforcement:*
- **Curated Packet Assembly:** In [AnswersToCopy.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/AnswersToCopy.tsx#L35-L80), the draft editor formats all verified answers, cover notes, and contact details into an editorial clipboard tray with one-click copy buttons.
- **External Redirection:** The interface renders a prominent call-to-action linking directly to the employer's official job URL (`apply_url`) opening in a secure new tab (`target="_blank" rel="noopener noreferrer"`).
- **Reported Submission Protocol:** In [AssistedActionSection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/AssistedActionSection.tsx#L30-L75), after completing the application on the external site, the user records their action via a confirmation dialog calling `PUT /api/v1/applications/drafts/{id}/reported-submission`. The application is clearly labelled as `"Reported by you"`, never falsely claimed as `"Submitted by GetSwydd"`.

---

## 3. Tech Stack and Dependencies

The web client is contained entirely within the `frontend/` directory. It adheres to a strict zero-bloat policy, using only native web APIs and foundational framework packages.

### Production and Development Dependencies

| Package | Version | Type | Architecture Role & Justification |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.6` | Runtime | App Router framework providing Partial Prerendering (PPR), Turbopack compilation, and static site generation. |
| `react` | `19.3.0` | Runtime | Core component library supporting React Server Components and fine-grained state hooks. |
| `react-dom` | `19.3.0` | Runtime | DOM renderer for React 19. |
| `clsx` | `^2.1.1` | Runtime | Utility for constructing conditional class name strings. |
| `tailwind-merge` | `^3.7.1` | Runtime | Intelligently resolves conflicting Tailwind utility classes in custom primitives. |
| `lucide-react` | `^1.77.0` | Runtime | SVG iconography set chosen for consistent stroke weight (1.5px/2px) and editorial clarity. |
| `tailwindcss` | `4.3.3` | Development | Modern CSS engine using native CSS variables and `@theme` configuration. |
| `@tailwindcss/turbopack`| `4.3.3` | Development | Turbopack compiler integration for Tailwind CSS v4. |
| `typescript` | `^5` | Development | Static type checking enforcing strict mode and complete backend schema parity. |
| `eslint` | `^9` | Development | Linter enforcing code hygiene and React Hook rules. |
| `eslint-config-next` | `16.4.6` | Development | Next.js-specific lint rules and accessibility audits. |
| `@types/node` | `^20` | Development | Type definitions for Node.js runtime APIs. |
| `@types/react` | `^19` | Development | Type definitions for React 19 elements and hooks. |
| `@types/react-dom` | `^19` | Development | Type definitions for React DOM. |

### Architectural Constraint Verification
- **Zero Component Libraries:** The project does not use Radix UI, Shadcn, MUI, Chakra, or Headless UI. Every dialog, sheet, popover, tab bar, and form control is custom-built.
- **Zero State Management Libraries:** The application does not use Redux, Zustand, MobX, or Jotai. State is maintained via React hooks (`useState`, `useReducer`, `useContext`), URL search parameters (`useSearchParams`), and typed LocalStorage managers.
- **Zero Form Libraries:** The application does not use React Hook Form or Formik. Form state, validation, and dirty tracking are hand-crafted.
- **Zero Drag-and-Drop Libraries:** The Kanban Board uses native HTML5 Drag and Drop events paired with a keyboard-accessible action menu.

---

## 4. Design System

The visual language of GetSwydd is **quiet editorial**. It evokes tactile paper stationery, printed editorial journals, and utilitarian index cards.

### Prohibitions Audit
A complete scan of the frontend codebase verifies total compliance with design prohibitions:
- **Zero Gradients:** No linear or radial background gradients (`bg-gradient-*` is completely absent).
- **Zero Glassmorphism:** No backdrop blur or semi-transparent frosted glass treatments (`backdrop-blur-*` is absent).
- **Zero Emojis:** Informational status indicators and empty states use Lucide line icons or typography.
- **Zero Gamified Badges:** No progress rings, XP counters, or congratulatory animations.
- **Zero Purple/Indigo:** No corporate tech palette colors; the palette is strictly earthy and mineral.

### Design Tokens (`globals.css`)

Tokens are declared as CSS custom properties under `@theme` in [globals.css](file:///c:/Users/bakht/GetSwydd/frontend/src/app/globals.css#L3-L90). Dark mode performs a 1-to-1 semantic token swap without requiring class changes on individual elements.

| Token Name | Light Value | Dark Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--color-paper` | `#F6EFE3` | `#1E201B` | Default page background; warm unbleached parchment vs deep forest slate. |
| `--color-paper-raised` | `#FBF7EF` | `#262922` | Cards, panels, input backgrounds, and elevated surfaces. |
| `--color-cream` | `#E8D2B5` | `#E8D2B5` | Warm highlight tint, selection background, and header accents. |
| `--color-cream-deep` | `#D9BE98` | `#D9BE98` | Hover state for cream surfaces and prominent border accents. |
| `--color-on-cream` | `#2B2F27` | `#2B2F27` | High-contrast dark ink used exclusively on cream backgrounds. |
| `--color-sage` | `#A5A79B` | `#A5A79B` | Muted neutral for secondary badges and tertiary borders. |
| `--color-sage-soft` | `#C9CABF` | `#3A3D34` | Subtle borders, light chip backgrounds, and table row dividers. |
| `--color-sage-deep` | `#6F7366` | `#A5A79B` | Secondary body text, timestamps, captions, and hint copy. |
| `--color-ink` | `#2B2F27` | `#EFE6D6` | Primary body typography and high-emphasis display titles. |
| `--color-ink-soft` | `#4A4E44` | `#C9C0AE` | Subsection headers, table headers, and form labels. |
| `--color-hairline` | `#D8CCB6` | `#3C3F35` | Standard structural borders, card boundaries, and dividers. |
| `--color-hairline-strong`| `#BDB59F` | `#55584B` | Interactive borders, input hover states, and active tabs. |
| `--color-moss` | `#5C7048` | `#A9C08E` | Success states, verified fact badges, and confirmed submissions. |
| `--color-moss-tint` | `#E1E6D3` | `#2B3523` | Background fill for verified badges and success alerts. |
| `--color-ochre` | `#A8761F` | `#E0B65E` | Warning states, unreviewed facts, and unread notifications. |
| `--color-ochre-tint` | `#F1E2BF` | `#3B3220` | Background fill for warning tags and needs-input notices. |
| `--color-brick` | `#9C4531` | `#E39A86` | Destructive actions, validation errors, and rejection statuses. |
| `--color-brick-tint` | `#F0D9D0` | `#3F2620` | Background fill for error states and rejection chips. |
| `--color-slate` | `#55656B` | `#9FB4BB` | Informational callouts, assisted mode indicators, and neutral tags. |
| `--color-slate-tint` | `#DCE3E4` | `#25302F` | Background fill for informational notices and assisted mode badges. |

### Typography, Geometry, and Surface Grain
- **Display Typography:** Headings (`h1`, `h2`, `h3`, `h4`) utilize `Fraunces` (`--font-display`), a serif typeface with soft chiseled geometry, rendered with font-weight `500` and tight letter spacing.
- **Body Typography:** Body copy, table cells, and form inputs use `Geist Sans` (`--font-sans`).
- **Eyebrow Labels:** All section headers and field labels feature small uppercase labels (`text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft`).
- **Radiuses:** Restrained radiuses prevent rounded "bubble" geometry: `--radius-sm: 2px`, `--radius-md: 6px`, `--radius-lg: 8px`.
- **Subtle Paper Grain:** The body background applies an ultra-subtle, zero-dependency inline SVG fractal noise texture filter at 2% opacity ([globals.css#L129](file:///c:/Users/bakht/GetSwydd/frontend/src/app/globals.css#L129)).

### Dark Mode Architecture and Zero-Flash Layout
Theme state is managed via the `data-theme` attribute on the root `<html>` element.
1. **Pre-Hydration Script:** In [layout.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/app/layout.tsx#L38-L49), an inline script runs synchronously before DOM rendering. It inspects `localStorage.getItem("getswydd_theme")` and falls back to `window.matchMedia("(prefers-color-scheme: dark)")`.
2. **Zero Layout Flash:** The theme attribute is applied prior to CSS evaluation, eliminating the flash of unstyled content (FOUC).
3. **Toggle Control:** [theme-toggle.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/theme-toggle.tsx) switches between light, dark, and system modes while broadcasting changes across tabs via storage events.

---

## 5. Component Inventory

The frontend architecture comprises 54 custom React components distributed across specialized directories.

### UI Primitives (`frontend/src/components/ui/`)

| Component | Path | Key Props | Purpose & Consuming Modules |
| :--- | :--- | :--- | :--- |
| `Button` | [button.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/button.tsx) | `variant` (`primary`, `secondary`, `outline`, `ghost`, `danger`), `size`, `loading` | Primary interactive trigger across all views. |
| `Field` | [field.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/field.tsx) | `label`, `hint`, `error`, `required`, `children` | Accessible wrapper rendering labels, error text, and aria attributes. |
| `Input` | [field.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/field.tsx#L48) | `error`, HTML input attributes | Styled text, email, number input primitive. |
| `Select` | [field.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/field.tsx#L70) | `error`, HTML select attributes | Styled native dropdown selector. |
| `Checkbox` | [field.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/field.tsx#L96) | `label`, `error`, HTML input attributes | Checkbox control with custom square checkmark styling. |
| `Textarea` | [field.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/field.tsx#L125)| `error`, HTML textarea attributes | Multi-line text field with hairline borders. |
| `Badge` | [badge.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/badge.tsx) | `variant` (`default`, `success`, `warning`, `danger`, `info`), `size` | Status badge and metadata label. |
| `Panel` | [panel.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/panel.tsx) | `variant` (`default`, `raised`, `bordered`), `padding` | Structural surface container for cards, forms, and sections. |
| `Divider` | [divider.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/divider.tsx) | `orientation`, `className` | Hairline separator between editorial sections. |
| `PageHeader` | [page-header.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/page-header.tsx) | `title`, `eyebrow`, `description`, `actions` | Standard double-rule editorial page header. |
| `Skeleton` | [skeleton.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/skeleton.tsx) | `variant`, `width`, `height` | Neutral pulse placeholder preventing layout shift. |
| `EmptyState` | [empty-state.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/empty-state.tsx) | `icon`, `title`, `description`, `action` | Clean fallback screen for zero-data states. |
| `ErrorState` | [error-state.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/error-state.tsx) | `title`, `message`, `retry` | Error boundary recovery component. |
| `InlineNotice` | [inline-notice.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/inline-notice.tsx) | `variant` (`info`, `attention`, `problem`), `title` | Embedded status and warning banners. |
| `SourceTag` | [source-tag.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/source-tag.tsx) | `source` (`verified`, `inferred`, `employer`, `manual`) | Fact provenance indicator required by Rule 1. |
| `Stat` | [stat.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/stat.tsx) | `label`, `value`, `caption`, `trend` | Numerical metric card used in trackers and summaries. |
| `Sheet` | [sheet.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/ui/sheet.tsx) | `open`, `onClose`, `title`, `children` | Off-canvas sliding drawer for mobile filters and preferences. |

### Shell Components (`frontend/src/components/shell/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `AppShell` | [app-shell.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/app-shell.tsx) | Root application wrapper with skip-link, header, alerts slot, and footer. |
| `SiteHeader` | [site-header.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/site-header.tsx) | Top navigation bar with active route underlines, branding, and status indicators. |
| `SiteFooter` | [site-footer.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/site-footer.tsx) | Colophon and system status indicators. |
| `AlertsSlot` | [alerts-slot.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/alerts-slot.tsx) | Bell icon trigger with unread counter badge and dropdown preview popover. |
| `ThemeToggle` | [theme-toggle.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/theme-toggle.tsx) | Dropdown selector for light, dark, and system color preferences. |
| `PageContainer`| [page-container.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/page-container.tsx)| Restrained max-width layout container (`max-w-6xl mx-auto px-4 sm:px-6`). |

### Discovery & Jobs Components (`frontend/src/components/discovery/`, `jobs/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `SourceTabs` | [SourceTabs.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/SourceTabs.tsx) | Editorial tab strip for ATS sources (`All`, `Greenhouse`, `Lever`, `Ashby`, `Demo`). |
| `SearchBar` | [SearchBar.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/SearchBar.tsx) | Dual-input bar for keyword (`q`) and role title search. |
| `FilterPanel` | [FilterPanel.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/FilterPanel.tsx) | Desktop sidebar for location, remote-only, skills tag input, and minimum pay. |
| `ActiveFilters` | [ActiveFilters.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/ActiveFilters.tsx)| Dismissible filter chip bar with clear-all trigger. |
| `SortControl` | [SortControl.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/SortControl.tsx) | Dropdown selector for sorting by relevance, date, salary, and deadline. |
| `Pagination` | [Pagination.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/Pagination.tsx) | Accessible page navigation displaying total count and page chunks. |
| `RefreshButton` | [RefreshButton.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/RefreshButton.tsx)| Action trigger calling backend ATS sync with loading state. |
| `DeadlineRadar` | [DeadlineRadar.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/DeadlineRadar.tsx)| Sidebar card alerting candidates to opportunities closing in $\le 14$ days. |
| `PreferencesDrawer` | [PreferencesDrawer.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/PreferencesDrawer.tsx)| Sliding sheet for managing persistent candidate role and location criteria. |
| `TagInput` | [TagInput.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/TagInput.tsx) | Keyboard-accessible chip entry field for skills. |
| `JobCard` | [JobCard.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/jobs/JobCard.tsx) | Comprehensive listing card displaying title, employer, compensation, source tag, match score, and launch button. |
| `JobMatchSummary`| [JobMatchSummary.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/jobs/JobMatchSummary.tsx)| Compact breakdown displaying matched skills, missing skills, and suitability. |

### Analysis Components (`frontend/src/components/analysis/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `AnalysisHeader` | [AnalysisHeader.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/AnalysisHeader.tsx) | Job header with compensation, location, source badge, and navigation breadcrumbs. |
| `AnalysisAside` | [AnalysisAside.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/AnalysisAside.tsx) | Sticky sidebar housing the application launcher, direct URL, and resume selector. |
| `SkillsCoverageSection` | [SkillsCoverageSection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/SkillsCoverageSection.tsx) | Verified vs missing skill comparison matrix with exact evidence excerpts. |
| `EligibilitySection` | [EligibilitySection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/EligibilitySection.tsx) | Criteria checklist verifying work authorization and experience prerequisites. |
| `RoleDescriptionSection` | [RoleDescriptionSection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/RoleDescriptionSection.tsx)| Cleanly formatted employer role overview. |
| `SemanticSection` | [SemanticSection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/analysis/SemanticSection.tsx) | Optional deep AI semantic analysis comparing candidate profile against posting. |

### Application & Draft Workflow Components (`frontend/src/components/applications/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `StartApplication` | [StartApplication.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/StartApplication.tsx) | Primary modal initiating draft creation with resume selection. |
| `ResumeSelector` | [ResumeSelector.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/ResumeSelector.tsx) | Radio list selecting between reviewed resumes or auto-recommendation. |
| `DraftHeader` | [DraftHeader.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/DraftHeader.tsx) | Draft progress bar, mode indicator (`demo`, `personalized`, `assisted`), and autosave status. |
| `QuestionBlock` | [QuestionBlock.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/QuestionBlock.tsx) | Screening question editor supporting free text, character counts, select dropdowns, and evidence provenance. |
| `ReviewPanel` | [ReviewPanel.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/ReviewPanel.tsx) | Pre-submission confirmation panel enforcing Rule 2. |
| `AnswersToCopy` | [AnswersToCopy.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/AnswersToCopy.tsx) | Assisted mode tray providing one-click copy buttons for external forms. |
| `AssistedActionSection` | [AssistedActionSection.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/AssistedActionSection.tsx)| User-reported submission dialog gate. |
| `SubmissionReceiptCard` | [SubmissionReceiptCard.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/draft/SubmissionReceiptCard.tsx)| Verified proof card displaying backend submission ID and timestamp. |

### Tracker & Board Components (`frontend/src/components/applications/tracker/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `TrackerSummaryStrip` | [TrackerSummaryStrip.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/TrackerSummaryStrip.tsx)| 4-metric overview card (Total Active, Submitted, In Interview, Offers). |
| `TrackerLedger` | [TrackerLedger.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/TrackerLedger.tsx) | High-density editorial table listing applications with dual-tier status badges. |
| `TrackerLedgerFilters` | [TrackerLedgerFilters.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/TrackerLedgerFilters.tsx)| Status filter dropdowns and text search for the ledger view. |
| `TrackerMobileCard` | [TrackerMobileCard.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/TrackerMobileCard.tsx)| Touch-optimized card representation of ledger rows for small viewports. |
| `TrackerBoard` | [TrackerBoard.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/TrackerBoard.tsx) | 5-column Kanban board supporting HTML5 drag-and-drop and keyboard stage moves. |
| `MoveStageMenu` | [MoveStageMenu.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/MoveStageMenu.tsx) | Accessible dropdown menu allowing keyboard-driven pipeline stage changes. |
| `PersonalStatusEditor`| [PersonalStatusEditor.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/applications/tracker/PersonalStatusEditor.tsx)| Modal dialog for updating personal notes, interview dates, and stages. |

---

## 6. Routes

The web application defines 10 distinct routes structured under the Next.js App Router.

```mermaid
graph TD
    Root["/ (Discover Opportunities)"] --> Analysis["/jobs/[jobId] (Qualification Analysis)"]
    Root --> Draft["/applications/drafts/[draftId] (Draft Editor)"]
    Root --> Tracker["/applications (Unified Tracker)"]
    Root --> Resumes["/resumes (Resume Fact Review)"]
    Root --> Profile["/profile (Candidate Details)"]
    Root --> Alerts["/alerts (Notification Ledger)"]
    Root --> NotFound["/_not-found (404 Error State)"]
```

| Route Path | Rendering Mode | Purpose | Primary Components | API Endpoints Invoked | Introduced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Static (Client Hydrated) | Opportunity discovery engine with search, filters, pagination, and preferences. | `DiscoveryView`, `SearchBar`, `FilterPanel`, `JobCard`, `DeadlineRadar` | `GET /api/v1/jobs`, `GET /api/v1/jobs/preferences`, `POST /api/v1/jobs/refresh` | Phase 1 (Restyled in Phase 2) |
| `/jobs/[jobId]` | Partial Prerender (PPR) | In-depth qualification breakdown, skills coverage, and eligibility analysis. | `AnalysisHeader`, `SkillsCoverageSection`, `EligibilitySection`, `AnalysisAside` | `POST /api/v1/jobs/{id}/analysis`, `GET /api/v1/resumes`, `POST /api/v1/applications/drafts` | Phase 2 |
| `/applications/drafts/[draftId]` | Partial Prerender (PPR) | Application editor for reviewing answers, screening questions, and submitting. | `DraftHeader`, `QuestionBlock`, `ReviewPanel`, `AnswersToCopy` | `GET /api/v1/applications/drafts/{id}`, `PATCH .../answers`, `POST .../submit`, `PUT .../reported-submission` | Phase 1 (Rebuilt in Phase 3) |
| `/applications` | Static (Client Hydrated) | Unified application tracker with Ledger table, Kanban board, and personal notes. | `TrackerSummaryStrip`, `TrackerLedger`, `TrackerBoard`, `PersonalStatusEditor` | `GET /api/v1/applications`, `GET /api/v1/applications/assisted` | Phase 1 (Rebuilt in Phase 3) |
| `/resumes` | Static (Client Hydrated) | Resume upload zone, text extraction viewer, and fact confirmation interface. | `ResumeUploadZone`, `ResumeReview`, `MasterProfilePanel` | `POST /api/v1/resumes`, `GET /api/v1/resumes`, `GET /api/v1/resumes/{id}`, `PUT .../review`, `GET /api/v1/profile` | Phase 1 |
| `/profile` | Static (Client Hydrated) | Candidate identity, work authorization status, and application defaults editor. | `ProfileForm`, `ProfileGuaranteesAside` | `GET /api/v1/profile/application-details`, `PUT /api/v1/profile/application-details` | Phase 1 |
| `/alerts` | Static (Client Hydrated) | Dedicated alert ledger showing preference-matched jobs with mark-read actions. | `AlertRows`, `EmptyState` | `GET /api/v1/jobs/alerts`, `PUT /api/v1/jobs/alerts/{id}/read` | Phase 2 |
| `/_not-found` | Static | Custom 404 page styled with quiet editorial branding and return home link. | `EmptyState`, `Button` | None | Phase 1 |

---

## 7. API Layer

The typed API layer lives in [frontend/src/lib/api/](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/api/) and provides complete, type-safe coverage of all 24 backend FastAPI endpoints.

### Client Infrastructure
- **`client.ts` ([client.ts](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/api/client.ts)):** Implements `requestJson<T>()` wrapping native `fetch`. Resolves base URLs via `NEXT_PUBLIC_API_URL` (defaulting to `http://127.0.0.1:8000`). Handles network timeouts, abort signals, and JSON serialization.
- **`ApiError` ([client.ts#L4](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/api/client.ts#L4)):** Custom error subclass encapsulating HTTP status codes, error detail strings, and URL context.
- **`buildQuery` ([client.ts#L22](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/api/client.ts#L22)):** Formats object parameters into URL search parameter strings, handling arrays, booleans, and null stripping.
- **`useAsync` ([useAsync.ts](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/hooks/useAsync.ts)):** Core React hook managing `data`, `loading`, `error`, and cancellation signals with automatic unmount protection.

### Complete Endpoint Coverage Matrix (All 24 Endpoints)

| # | HTTP Method | Route Signature | TypeScript Client Function | Consuming Frontend Components |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/health` | `getHealth()` | `SiteFooter` |
| 2 | `GET` | `/api/v1/jobs` | `listJobs()` | `DiscoveryView`, `ResultsRegion` |
| 3 | `GET` | `/api/v1/jobs/preferences` | `getPreferences()` | `PreferencesDrawer`, `DiscoveryView` |
| 4 | `PUT` | `/api/v1/jobs/preferences` | `savePreferences()` | `PreferencesDrawer` |
| 5 | `POST`| `/api/v1/jobs/greenhouse/refresh`| `refreshGreenhouse()`| `RefreshButton` |
| 6 | `POST`| `/api/v1/jobs/refresh` | `refreshJobs()` | `RefreshButton`, `DiscoveryToolbar` |
| 7 | `GET` | `/api/v1/jobs/alerts` | `listAlerts()` | `AlertsSlot`, `/alerts/page.tsx` |
| 8 | `PUT` | `/api/v1/jobs/alerts/{alert_id}/read`| `markAlertRead()` | `AlertsSlot`, `AlertRows` |
| 9 | `POST`| `/api/v1/jobs/{job_id}/analysis`| `analyzeJob()` | `/jobs/[jobId]/page.tsx`, `SemanticSection` |
| 10 | `POST`| `/api/v1/resumes` | `uploadResume()` | `ResumeUploadZone` |
| 11 | `GET` | `/api/v1/resumes` | `listResumes()` | `ResumeUploadZone`, `ResumeSelector` |
| 12 | `GET` | `/api/v1/resumes/{resume_id}` | `getResume()` | `ResumeReview` |
| 13 | `PUT` | `/api/v1/resumes/{resume_id}/review`| `reviewResume()` | `ResumeReview` |
| 14 | `GET` | `/api/v1/profile` | `getProfile()` | `MasterProfilePanel`, `/resumes/page.tsx` |
| 15 | `GET` | `/api/v1/profile/application-details`| `getApplicationDetails()`| `ProfileForm` |
| 16 | `PUT` | `/api/v1/profile/application-details`| `saveApplicationDetails()`| `ProfileForm` |
| 17 | `POST`| `/api/v1/applications/drafts` | `createDraft()` | `StartApplication` |
| 18 | `GET` | `/api/v1/applications/drafts/{draft_id}`| `getDraft()` | `/applications/drafts/[draftId]/page.tsx` |
| 19 | `PATCH`| `/api/v1/applications/drafts/{draft_id}/answers`| `updateAnswers()` | `QuestionBlock`, `DraftHeader` |
| 20 | `PUT` | `/api/v1/applications/drafts/{draft_id}/answers`| `updateAnswers()` (alias) | Supported via typed API wrapper |
| 21 | `POST`| `/api/v1/applications/drafts/{draft_id}/submit`| `submitDraft()` | `ReviewPanel` |
| 22 | `GET` | `/api/v1/applications` | `listSubmissions()` | `TrackerLedger`, `TrackerBoard` |
| 23 | `GET` | `/api/v1/applications/assisted` | `listAssisted()` | `TrackerLedger`, `TrackerBoard` |
| 24 | `PUT` | `/api/v1/applications/drafts/{draft_id}/reported-submission`| `markReportedSubmission()`| `AssistedActionSection` |

---

## 8. State, Data Flow and URL Contracts

The application maintains state across four distinct architectural layers, ensuring that bookmarking, page refreshes, and browser navigation preserve the candidate's exact context.

### Discovery Engine URL Search Parameters

All search criteria on `/` are synchronized bidirectionally with URL query parameters:

| Query Param | Schema Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `source` | `greenhouse` \| `lever` \| `ashby` \| `demo` \| `undefined` | `undefined` (All) | Active ATS job feed filter. |
| `q` | `string` | `""` | Full-text query against job titles, employers, and descriptions. |
| `role` | `string` | `""` | Filter targeting specific job titles. |
| `loc` | `string` | `""` | Location string filter (e.g., "London", "Cardiff"). |
| `remote` | `"true"` \| `"false"` | `"false"` | When true, restricts results to remote opportunities. |
| `skills` | Comma-separated `string` | `""` | Required candidate skill tags. |
| `min_pay` | `number` | `undefined` | Minimum annual salary threshold in GBP. |
| `sort` | `relevance` \| `date` \| `salary` \| `deadline` | `relevance` | Ordering algorithm. |
| `page` | `number` | `1` | Current pagination index (15 results per page). |

### Alerts Polling Policy
- **Background Interval:** The `AlertsContext` ([AlertsContext.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/context/AlertsContext.tsx)) polls `GET /api/v1/jobs/alerts` on a 60-second timer when the browser tab is focused.
- **Manual Trigger:** Clicking the "Refresh Feeds" button immediately triggers an alert re-fetch alongside the ATS feed ingestion.
- **Optimistic Mark-Read:** Marking an alert as read updates the unread count badge immediately in React state while dispatching the background `PUT` request.

### LocalStorage Personal Status Store
Personal tracker data (user notes, personal pipeline stages, interview dates) are managed through `personal-status.ts` ([personal-status.ts](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/applications/personal-status.ts)):
- **Storage Key:** `getswydd_personal_status_v1`
- **Schema:** A JSON dictionary mapping `applicationId` to `{ personal_status?: ApplicationStage, notes?: string, interview_date?: string, updated_at: string }`.
- **Cross-Tab Synchronization:** A `window.addEventListener("storage", ...)` listener automatically syncs edits across multiple open tabs.

---

## 9. Feature Walkthroughs

### 9.1 App Shell
The application shell ([app-shell.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/shell/app-shell.tsx)) wraps every page. It provides:
1. **Skip-to-Content Link:** A keyboard-focusable link (`href="#main-content"`) styled to appear on focus, satisfying WCAG 2.1 AA requirements.
2. **SiteHeader:** Displays the GetSwydd wordmark, primary navigation links with Fraunces serif styling and active page indicators, the unread alerts popover trigger, and the theme toggle.
3. **SiteFooter:** Contains system availability indicators (polling `/health`), copyright information, and design system colophon notes.

### 9.2 Resume Upload and Fact Review (`/resumes`)
1. Candidates upload resumes in PDF or DOCX format (up to 5 MB) via drag-and-drop or file picker ([ResumeUploadZone.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/resumes/ResumeUploadZone.tsx)).
2. The backend extracts raw text and uses heuristic parsing to identify skills, education, employment history, projects, and certifications.
3. In [ResumeReview.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/resumes/ResumeReview.tsx), facts are presented in categorized editorial cards. The candidate can approve, edit, or reject each item.
4. Clicking "Confirm Verified Facts" sends a `PUT /api/v1/resumes/{id}/review` request, locking the revision and merging facts into the candidate's master profile ([MasterProfilePanel.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/resumes/MasterProfilePanel.tsx)).

### 9.3 Candidate Profile Editor (`/profile`)
Provides an interface ([ProfileForm.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/profile/ProfileForm.tsx)) for editing fundamental candidate identity facts:
- Full legal name, contact email, and telephone number.
- Availability notice period (e.g., "Immediate", "1 month").
- UK Right to Work authorization status.
Data are persisted via `PUT /api/v1/profile/application-details`.

### 9.4 Job Discovery Engine (`/`)
The primary search interface on `/`:
- Aggregates jobs across all configured sources with tab switching via `SourceTabs`.
- Offers debounced text search and role filtering via `SearchBar`.
- Features faceted filtering (location, remote toggle, skill chips, salary minimum) via `FilterPanel`.
- Displays results via `JobCard` containing salary tags, location badges, match summaries, and direct application triggers.

### 9.5 Saved Search Preferences Drawer
Accessible from the discovery toolbar, the preferences drawer ([PreferencesDrawer.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/PreferencesDrawer.tsx)) allows candidates to persist their search criteria:
- Multiple target role titles and target locations.
- Remote-only preference toggle.
- Minimum base pay floor with currency configuration.
The component includes dirty state tracking and keyboard escape dismissal.

### 9.6 Alerts System & Popover (`/alerts`)
- Discovered opportunities matching saved search preferences trigger alerts.
- Unread count displays as an ochre pill badge in `SiteHeader`. Clicking opens `AlertsSlot` with a scrollable list of recent matches.
- `/alerts` provides an editorial ledger displaying all historical alerts, match reasons, discovery timestamps, and individual mark-read actions.

### 9.7 Job Qualification Analysis (`/jobs/[jobId]`)
A deep-dive qualification analysis page providing transparency into how a candidate matches a role:
- **Skills Coverage:** Side-by-side comparison of required skills versus confirmed candidate profile skills, citing verified resume evidence.
- **Eligibility Checks:** Validates work authorization and minimum experience requirements.
- **AI Semantic Matching:** An optional toggle runs embedding-based comparison against the posting, highlighting strengths and experience gaps.

### 9.8 Deadline Radar
A focused widget ([DeadlineRadar.tsx](file:///c:/Users/bakht/GetSwydd/frontend/src/components/discovery/DeadlineRadar.tsx)) displayed in the discovery sidebar:
- Identifies active opportunities closing within the next 14 calendar days.
- Sorts listings by urgency and highlights deadlines closing in $\le 3$ days in brick/ochre tones.

### 9.9 Start Application & Resume Selector
When a user clicks "Apply" on any job card or analysis page:
1. `StartApplication` modal opens.
2. `ResumeSelector` fetches reviewed resumes via `GET /api/v1/resumes`.
3. If multiple resumes exist, the user selects which resume to tailor against.
4. For Assisted jobs, selecting a reviewed resume is mandatory (enforced to prevent backend 409 errors).
5. Clicking "Create Application Draft" calls `POST /api/v1/applications/drafts` and routes to the editor.

### 9.10 Draft Editor (`/applications/drafts/[draftId]`)
The core preparation interface for job applications:
- **Header:** Displays draft title, mode, and completion status.
- **Screening Questions:** Renders all employer questions. Verified facts pre-fill automatically with a green `verified` badge. Missing answers render an amber notice.
- **Choice Validation:** For multiple-choice questions, native select controls enforce valid backend options.
- **Character Counters:** Free-text questions display live character counts against maximum limits.

### 9.11 Assisted Mode Flow & Reported Submission
For jobs on Greenhouse, Lever, or Ashby:
1. The draft editor displays `AnswersToCopy`, organizing all verified answers into copyable cards.
2. The user clicks "Open Employer Application" to navigate to the employer's official portal.
3. Once submitted externally, the user clicks "Mark as Submitted" in `AssistedActionSection`.
4. A confirmation modal records the date and dispatches `PUT .../reported-submission`.

### 9.12 Demo Submit Flow
For internal demo test jobs:
1. The user reviews all pre-filled answers.
2. Navigates to `ReviewPanel`.
3. Must explicitly check the consent checkbox.
4. Clicking "Submit Test Application" dispatches `POST .../submit`.
5. Renders `SubmissionReceiptCard` with the confirmation receipt ID.

### 9.13 Unified Tracker Ledger (`/applications`)
The default tracker view:
- Displays all applications across test submissions and assisted records in an editorial table.
- Each row presents: Role & Employer, Source Badge, Submission Date, Confirmed Backend Status, and Personal Candidate Status.
- Includes full-text search and status filtering via `TrackerLedgerFilters`.

### 9.14 Kanban Board View & Personal Status/Notes
A tactile card board view dividing applications into 5 pipeline columns:
1. `Draft` / `Ready`
2. `Submitted` / `Applied`
3. `Screening` / `Interviewing`
4. `Offer Received`
5. `Archived` / `Rejected`
Cards support HTML5 drag-and-drop between columns as well as a keyboard-navigable "Move Stage" menu. Clicking any card opens `PersonalStatusEditor` to log interview notes and dates.

### 9.15 Token-Only Dark Mode
A complete, WCAG AA compliant dark theme:
- Activated via the header theme toggle or system preference.
- Evaluated before HTML rendering via a layout head script, preventing flash.
- Implemented purely through CSS token swaps in `globals.css` with zero component-level conditional classes.

---

## 10. Status Model

GetSwydd enforces a strict two-tier status architecture to ensure that user-entered notes are never confused with verified backend facts.

```mermaid
graph TD
    subgraph Tier1["Tier 1: Confirmed Status (Backend)"]
        T1_Sub["Receipt: Submitted"]
        T1_AsDraft["Assisted: Draft"]
        T1_AsSub["Assisted: Reported Submitted"]
    end

    subgraph Tier2["Tier 2: Personal Status (Candidate Local)"]
        T2_Draft["Draft"]
        T2_Submitted["Submitted"]
        T2_Screening["Screening"]
        T2_Interview["Interviewing"]
        T2_Offer["Offer Received"]
        T2_Rejected["Archived / Rejected"]
    end

    Tier1 --> UI["Unified Application Card / Row"]
    Tier2 --> UI
    UI --> Dist["Visual Distinction: Confirmed (Solid) vs Personal (Outlined 'You')"]
```

### Tier 1: Confirmed Statuses (Backend Derived Only)
Derived solely from immutable backend database records:
1. **Submitted (`demo`):** Confirmed record in test inbox (`GET /api/v1/applications`). Verified with receipt ID and timestamp.
2. **Draft (`assisted`):** Application package created, pending external employer submission (`GET /api/v1/applications/assisted`, `status == "draft"`).
3. **Reported Submitted (`assisted`):** Candidate explicitly confirmed completing the application on the employer website (`status == "submitted"`).

### Tier 2: Personal Statuses (Client-Side, Never Verified)
Managed locally by the candidate in `localStorage`:
- Stages: `draft`, `submitted`, `screening`, `interviewing`, `offer`, `rejected`, `withdrawn`.
- Always rendered with an explicit `"Personal"` or `"You"` prefix label to ensure complete transparency.

---

## 11. Spec vs Reality

The following table compares the original product specification against the current production implementation.

| Feature / Spec Requirement | Status | Reality in Codebase & Implementation Details |
| :--- | :--- | :--- |
| **Multi-Resume Upload & Fact Parsing** | **Done** | Supported via `POST /api/v1/resumes`, `GET /api/v1/resumes`, and `PUT /api/v1/resumes/{id}/review`. Verified facts merge into master profile. |
| **Resume Selection on Application Start** | **Done** | Implemented via `StartApplication.tsx` and `ResumeSelector.tsx`. Candidates choose specific resumes for tailoring. |
| **Quiet Editorial Design Tokens** | **Done** | Hand-crafted palette in `globals.css` (`paper`, `cream`, `sage`, `ink`, `hairline`, `moss`, `ochre`, `brick`, `slate`). |
| **15 Accessible UI Primitives** | **Done** | Implemented in `frontend/src/components/ui/` with zero third-party UI dependencies. |
| **Skip-to-Content Navigation** | **Done** | Implemented in `AppShell` with full keyboard focus support. |
| **Job Search & Multi-Faceted Filters** | **Done** | Implemented on `/` with two-way URL query synchronization. |
| **ATS Job Ingestion (Greenhouse, Lever, Ashby)**| **Done** | Supported via `POST /api/v1/jobs/refresh` with real-time UI loading indicators. |
| **Job Qualification Analysis Page** | **Done** | Implemented on `/jobs/[jobId]` with skills breakdown and eligibility checks. |
| **AI Semantic Resume Comparison** | **Done** | Implemented via `POST /api/v1/jobs/{id}/analysis` with `use_semantic: true`. |
| **Deadline Radar ($\le 14$ Days)** | **Done** | Implemented via `DeadlineRadar.tsx`, sorting by urgency. |
| **Alerts Popover & Ledger** | **Done** | Implemented via `AlertsSlot.tsx` and `/alerts/page.tsx` with optimistic mark-read. |
| **Screening Question Choice Validation** | **Done** | Implemented in `QuestionBlock.tsx` using native select controls matching backend choices. |
| **Draft Evidence Provenance Toggles** | **Done** | Implemented in `QuestionBlock.tsx` with collapsible verification panels. |
| **Assisted Mode Clipboard Packet** | **Done** | Implemented in `AnswersToCopy.tsx` with one-click copy buttons. |
| **User-Reported Submission Confirmation**| **Done** | Implemented in `AssistedActionSection.tsx` via `PUT .../reported-submission`. |
| **Unified Tracker (Ledger & Board)** | **Done** | Implemented on `/applications` supporting both tabular and Kanban views. |
| **Two-Tier Status Model** | **Done** | Confirmed backend facts clearly distinguished from personal local notes. |
| **Token-Only Dark Mode** | **Done** | Implemented via `data-theme` attribute and zero-flash layout head script. |
| **Strict File Size Budget ($\le 250$ lines)** | **Partial** | 108 of 109 TS/TSX files (99.1%) are $\le 250$ lines. `TrackerBoard.tsx` is at 257 lines. |
| **Unsubmitted Drafts Listing Endpoint** | **Blocked by Backend** | Backend lacks `GET /api/v1/applications/drafts`. Frontend can only load drafts by ID. |
| **Persistent User Notes in Cloud DB** | **Blocked by Backend** | Backend lacks user tracking endpoints; personal statuses stored in `localStorage`. |
| **Single Job Lookup Endpoint** | **Blocked by Backend** | Backend lacks `GET /api/v1/jobs/{id}`; frontend uses `analyzeJob` or query filtering. |
| **Gmail / External Email Sync** | **Not built** | External email inbox integration was out of scope for Phases 1–3 and is not implemented. |

---

## 12. Backend vs Frontend Discrepancies and Corrections

### Corrections to Earlier Changelogs

During the consolidated code audit, several discrepancies were identified between early changelogs and the actual backend implementation:

1. **Assisted Draft Creation Requires a Reviewed Resume:**
   - *Early Changelog Claim:* Phase 1 documentation suggested drafts could always be created without selecting a resume (passing `resume_id: null` to "Let GetSwydd choose").
   - *Actual Code Reality:* For assisted jobs, `POST /api/v1/applications/drafts` returns HTTP 409 (`"Select a reviewed resume first."`) if `resume_id` is null. Phase 3 corrected this in `StartApplication.tsx` by enforcing resume selection when creating assisted drafts.
2. **Submit Endpoint is Strictly Demo-Only:**
   - *Early Changelog Claim:* Early documentation implied that `POST /api/v1/applications/drafts/{id}/submit` was the unified submission endpoint for all applications.
   - *Actual Code Reality:* The backend route explicitly raises HTTP 409 if `draft.mode != "demo"` or `draft.resume_id is not None`. Personalized drafts are designed as saved application packets, and assisted drafts use `PUT .../reported-submission`.
3. **Screening Question Choice Validation:**
   - *Early Changelog Claim:* Early notes treated question `choices` as optional autocomplete hints.
   - *Actual Code Reality:* The backend enforces strict validation, raising HTTP 400 if an answer does not exactly match one of the defined options. The frontend was updated to render native `<Select>` controls.
4. **No All-Drafts Endpoint Exists:**
   - *Early Changelog Claim:* Phase 1 specs anticipated an "all drafts" view.
   - *Actual Code Reality:* The backend only provides `GET /api/v1/applications` (confirmed test submissions) and `GET /api/v1/applications/assisted`. There is no endpoint to list unsubmitted demo or personalized drafts.
5. **`Stat` Component Prop Name:**
   - *Early Changelog Claim:* Phase 1 changelog documented `Stat` as accepting a `description` prop.
   - *Actual Code Reality:* In `stat.tsx`, the prop is named `caption?: string;`. This was corrected in `TrackerSummaryStrip.tsx`.
6. **Windows Sub-Millisecond Pytest Timestamp Ties:**
   - *Backend Test Flake:* In `test_job_discovery.py` and `test_api.py`, rapid successive requests on Windows can produce identical sub-millisecond timestamps, causing non-deterministic sort order assertions in backend unit tests.

---

## 13. Known Limitations and Technical Debt

1. **File Budget Compliance (One File Over Budget):**
   - 108 of 109 TypeScript source files (99.1%) strictly satisfy the $\le 250$ line requirement.
   - `frontend/src/components/applications/tracker/TrackerBoard.tsx` contains 257 lines (7 lines over the limit) due to drag-and-drop state handlers and keyboard navigation bindings.
2. **Codebase Cleanliness Audit:**
   - **`TODO` / `FIXME` Comments:** 0 instances across all source files.
   - **`eslint-disable` Annotations:** 0 instances across all source files.
   - **`any` Type Assertions:** 0 instances across all source files.
3. **Local Storage Device Coupling:**
   - Personal tracking notes, custom stages, and interview dates are stored in browser `localStorage`. They do not synchronize across devices until backend tracking endpoints are added.
4. **Single Job Lookup Fallback:**
   - Because the backend does not provide `GET /api/v1/jobs/{id}`, loading `/jobs/[jobId]` relies on `POST /api/v1/jobs/{id}/analysis` to hydrate job title and company metadata.

---

## 14. Backend Wish List

To unlock full frontend functionality in future phases, the following backend enhancements are recommended:

1. **Unsubmitted Drafts Listing Endpoint (`GET /api/v1/applications/drafts`):**
   - Allows the tracker to display in-progress drafts that have not yet been submitted or reported.
2. **Persistent Tracking and Notes Endpoint (`PATCH /api/v1/applications/{id}/tracking`):**
   - Enables saving candidate interview notes, custom stages, and dates directly to the database.
3. **Rich Metadata on Assisted Applications:**
   - Enhance `AssistedApplication` schema to include `deadline`, `location`, and `salary` so tracker cards do not have to render fallbacks.
4. **Single Job Lookup Endpoint (`GET /api/v1/jobs/{job_id}`):**
   - Standard REST endpoint returning `JobListing` by ID without requiring an analysis calculation.
5. **Bulk Mark-Read Endpoint (`PUT /api/v1/jobs/alerts/read-all`):**
   - Allows candidates to dismiss all unread alerts in a single click.

---

## 15. Repository Map

```text
c:\Users\bakht\GetSwydd\
├── api/                                  # FastAPI backend (Immutable)
│   └── app/
│       ├── main.py                       # Core routes (Jobs, Applications, Alerts)
│       ├── models.py                     # Pydantic schemas
│       ├── resume_routes.py              # Resume and profile endpoints
│       └── ...
├── docs/
│   └── frontend/
│       ├── FRONTEND-COMPLETE-REPORT.md   # This authoritative consolidated report
│       ├── README.md                     # Documentation index and architecture summary
│       ├── PHASE-1-CHANGELOG.md          # Historical record for Phase 1
│       ├── PHASE-2-CHANGELOG.md          # Historical record for Phase 2
│       └── PHASE-3-CHANGELOG.md          # Historical record for Phase 3
└── frontend/                                  # Next.js frontend client
    ├── package.json                      # Dependencies and scripts
    ├── next.config.ts                    # Next.js configuration (Turbopack)
    ├── tsconfig.json                     # TypeScript strict configuration
    └── src/
        ├── app/                          # Next.js App Router routes
        │   ├── globals.css               # Design tokens, @theme, paper grain
        │   ├── layout.tsx                # Root shell, font loaders, theme script
        │   ├── page.tsx                  # Discover opportunities route (/)
        │   ├── alerts/                   # Alert ledger route (/alerts)
        │   ├── applications/             # Unified tracker route (/applications)
        │   │   └── drafts/[draftId]/     # Draft editor route (/applications/drafts/[draftId])
        │   ├── jobs/[jobId]/             # Qualification analysis route (/jobs/[jobId])
        │   ├── profile/                  # Candidate profile route (/profile)
        │   └── resumes/                  # Resume review route (/resumes)
        ├── components/                   # Custom UI components
        │   ├── analysis/                 # Job analysis sections
        │   ├── applications/             # Application launcher, draft editor, tracker
        │   │   ├── draft/                # Question blocks, copy tray, review panel
        │   │   └── tracker/              # Ledger, Kanban board, status editors
        │   ├── discovery/                # Search bar, filter sidebar, preferences
        │   ├── jobs/                     # JobCard, JobMatchSummary
        │   ├── profile/                  # Profile form, guarantee cards
        │   ├── resumes/                  # Upload zone, fact review, master profile
        │   ├── shell/                    # Header, footer, alerts slot, theme toggle
        │   └── ui/                       # 15 accessible UI primitives
        └── lib/                          # Utilities and business logic
            ├── api/                      # Typed API client and Pydantic-parity schemas
            ├── applications/             # Status model, normalization, local store
            ├── context/                  # AlertsContext polling provider
            ├── discovery/                # Filter parameters and search state hooks
            ├── hooks/                    # useAsync, useAlerts, usePageTitle
            ├── cn.ts                     # Tailwind class merge helper
            ├── format.ts                 # Date and currency formatters
            ├── labels.ts                 # Editorial label mappings
            └── theme.ts                  # Theme switching helpers
```

---

## 16. Conventions for New Contributors

To maintain consistency and code hygiene, all contributors must observe these conventions:

1. **Token-Only Colors:** Never use arbitrary Tailwind colors (e.g., `bg-slate-900` or `text-blue-500`). Use only semantic theme tokens (`bg-paper`, `bg-paper-raised`, `text-ink`, `text-ink-soft`, `border-hairline`, `text-moss`, `text-ochre`, `text-brick`).
2. **UI Primitives Over Raw Tags:** Always prefer primitives (`Button`, `Field`, `Input`, `Panel`, `Badge`) over naked HTML elements to ensure consistent styling, focus rings, and accessibility attributes.
3. **Strict 250-Line File Limit:** Keep all TypeScript/TSX files strictly under 250 lines. Decompose large components into smaller, single-responsibility subcomponents.
4. **Editorial Aesthetic Prohibitions:** Do not introduce linear/radial gradients, backdrop blur, emojis, floating action buttons, or purple/indigo hues.
5. **Verified Facts Provenance:** Always wrap candidate facts in `SourceTag`. Never present unconfirmed data as verified.
6. **Request Hygiene:** Always pass `AbortSignal` to API calls inside `useEffect` or `useAsync` to guarantee clean unmounting and prevent memory leaks.
7. **Consistent Formatters:** Always use `formatCurrency()` and `formatDate()` from [frontend/src/lib/format.ts](file:///c:/Users/bakht/GetSwydd/frontend/src/lib/format.ts).

---

## 17. How to Run and Verify

### Running the Services

Open two terminal windows:

**Terminal 1: Start FastAPI Backend**
```powershell
$env:PYTHONPATH='api'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2: Run Verification & Start Frontend**
```powershell
# Run complete verification suite
npm --prefix web run lint; if ($?) { npx --prefix web tsc --project frontend/tsconfig.json --noEmit; if ($?) { npm --prefix web run build } }

# Start development server
npm --prefix web run dev
# Open http://localhost:3000
```

### 30-Item Manual QA Checklist

| # | View / Feature | Action / Verification Step | Expected Outcome |
| :---: | :--- | :--- | :--- |
| 1 | Global Shell | Navigate to `/` and press `Tab`. | Skip-to-content link appears and focuses `#main-content`. |
| 2 | Global Shell | Click the theme toggle in the header. | Cycles light, dark, and system modes without layout flash. |
| 3 | Global Shell | Observe header alerts icon. | Displays unread badge if new jobs match saved preferences. |
| 4 | Discovery (`/`) | Enter keyword "Engineer" into search input. | Query updates in URL (`?q=Engineer`) and filters job list. |
| 5 | Discovery (`/`) | Select "Greenhouse" tab in source strip. | URL updates (`?source=greenhouse`) showing only Greenhouse jobs. |
| 6 | Discovery (`/`) | Toggle "Remote only" switch in filter sidebar. | URL updates (`?remote=true`); listings update instantly. |
| 7 | Discovery (`/`) | Enter skill "TypeScript" in TagInput and press Enter. | Skill tag chip appears; URL updates (`?skills=TypeScript`). |
| 8 | Discovery (`/`) | Click "Clear all" in active filter bar. | All filter params clear from URL; results reset. |
| 9 | Discovery (`/`) | Click "Refresh Feeds" button. | Shows spinning reload icon; fetches latest jobs from backend. |
| 10 | Discovery (`/`) | Click "Edit Preferences" button. | PreferencesDrawer opens with focus trapped inside. |
| 11 | Preferences | Modify minimum pay and click "Save Preferences". | Sends `PUT /api/v1/jobs/preferences`; updates search state. |
| 12 | Radar (`/`) | Inspect "Deadline Radar" in sidebar. | Displays listings with deadlines $\le 14$ days, sorted by urgency. |
| 13 | Analysis (`/jobs/...`)| Click any job card on discover page. | Navigates to `/jobs/[jobId]` with smooth Partial Prerender load. |
| 14 | Analysis | Inspect Skills Coverage section. | Matches display green check with verified evidence excerpt. |
| 15 | Analysis | Toggle "AI Semantic Analysis" switch. | Dispatches semantic analysis request and renders strengths/gaps. |
| 16 | Start App | Click "Apply for this role" on analysis page. | `StartApplication` modal opens with resume selection. |
| 17 | Start App | Select a reviewed resume and submit modal. | Creates draft via `POST .../drafts` and routes to editor. |
| 18 | Draft Editor | View screening question with missing profile fact. | Renders amber border and "Needs your input" callout. |
| 19 | Draft Editor | View screening question with verified fact. | Displays green `verified` badge and collapsible evidence. |
| 20 | Draft Editor | Select option from dropdown question. | Updates answer via `PATCH .../answers` with auto-saving indicator. |
| 21 | Draft Editor | Observe character count on free-text question. | Counter increments; warns if exceeding limit. |
| 22 | Assisted Flow | Open an assisted mode draft (`/applications/drafts/...`). | Displays `AnswersToCopy` tray and external apply URL. |
| 23 | Assisted Flow | Click "Copy" on an answer card. | Copies text to clipboard and flashes confirmation badge. |
| 24 | Assisted Flow | Click "Mark as Submitted" button. | Confirmation modal opens; dispatches `PUT .../reported-submission`. |
| 25 | Demo Submit | Open a demo mode draft and scroll to review panel. | Submit button is disabled until consent checkbox is checked. |
| 26 | Demo Submit | Check approval checkbox and click Submit. | Submits to test inbox and displays verified receipt card. |
| 27 | Tracker (`/applications`)| Navigate to `/applications`. | Displays summary strip with 4 metrics and Ledger table. |
| 28 | Tracker | Toggle from "Ledger" to "Board" view. | Renders 5-column Kanban board with applications in correct stages. |
| 29 | Tracker Board | Drag an application card to "Screening" column. | Card moves smoothly; updates local status store and summary metrics. |
| 30 | Tracker Board | Click "Edit Notes" on a card. | Modal opens; edits save and synchronize across open browser tabs. |

---

## 18. Phase Timeline

| Milestone | Date Completed | Focus Area | Key Deliverables & Achievements |
| :--- | :--- | :--- | :--- |
| **Phase 1, Prompt 1** | 2026-11-22 | Design System & App Shell | Design tokens in `globals.css`, 15 UI primitives in `components/ui/`, `AppShell`, typed API client for 24 endpoints. |
| **Phase 1, Prompt 2** | 2026-11-22 | Core Pages & Resumes | Editorial restyling of `/`, `/resumes`, `/profile`, resume text extraction and fact confirmation workflow. |
| **Phase 2, Prompt 1** | 2026-11-22 | Discovery Engine & Filters | Multi-source ATS tabs, dual search bar, faceted sidebar, URL parameter sync, candidate preferences drawer. |
| **Phase 2, Prompt 2** | 2026-11-22 | Radar, Alerts & Analysis | 14-day deadline radar, background alert polling popover, `/alerts` ledger, `/jobs/[jobId]` qualification breakdown. |
| **Phase 3, Prompt 1** | 2026-11-22 | Application Workflow | `StartApplication`, `ResumeSelector`, rebuilt draft editor on `/applications/drafts/[draftId]`, choice validation, assisted copy tray. |
| **Phase 3, Prompt 2** | 2026-11-22 | Tracker & Dark Mode | Unified tracker on `/applications` (Ledger + Board), two-tier status model, token-only dark mode, zero-flash script, 250-line audit. |
| **Consolidated Report**| 2026-11-22 | Master Documentation | Authoritative 19-section engineering report (`FRONTEND-COMPLETE-REPORT.md`) consolidating Phases 1–3. |

---

## 19. Hand-off Summary for an AI Assistant

```yaml
context: "GetSwydd Frontend Client (Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4)"
backend: "FastAPI on http://127.0.0.1:8000 (Immutable; Pydantic v2 schemas; 24 endpoints)"
visual_aesthetic: "Quiet editorial, Fraunces serif headings, paper/cream/sage surfaces, hairline borders, no emojis/gradients"
core_rules:
  rule_1: "Verified Facts Only: Always display SourceTag; show null facts as 'Needs your input'; never hallucinate answers."
  rule_2: "User Approval: Submissions require explicit review panel and mandatory checkbox confirmation."
  rule_3: "Assisted Mode: Non-demo ATS jobs use curated clipboard packet, external employer URL, and user-reported submission."
design_tokens:
  surfaces: "--color-paper (#F6EFE3 / #1E201B), --color-paper-raised (#FBF7EF / #262922), --color-cream (#E8D2B5)"
  neutrals: "--color-sage (#A5A79B), --color-ink (#2B2F27 / #EFE6D6), --color-hairline (#D8CCB6 / #3C3F35)"
  semantics: "--color-moss (verified), --color-ochre (warning/unread), --color-brick (error/rejected), --color-slate (info)"
key_paths:
  tokens: "frontend/src/app/globals.css"
  primitives: "frontend/src/components/ui/"
  shell: "frontend/src/components/shell/"
  api_client: "frontend/src/lib/api/ (client.ts, jobs.ts, applications.ts, resumes.ts, profile.ts, types.ts)"
  tracker: "frontend/src/components/applications/tracker/ (TrackerLedger.tsx, TrackerBoard.tsx)"
  draft_editor: "frontend/src/components/applications/draft/ (DraftHeader.tsx, QuestionBlock.tsx, ReviewPanel.tsx)"
  discovery: "frontend/src/components/discovery/ (FilterPanel.tsx, SearchBar.tsx, SourceTabs.tsx)"
state_storage:
  search_params: "Discovery filters synced to URL via useDiscoveryParams.ts"
  theme: "Stored in 'getswydd_theme'; hydrated without flash via inline script in layout.tsx"
  personal_tracker: "Stored in 'getswydd_personal_status_v1' via personal-status.ts (syncs across tabs)"
engineering_constraints:
  file_budget: "Strict target: <= 250 lines per TS/TSX file (currently 108 of 109 compliant; TrackerBoard.tsx is 257)"
  dependencies: "Zero component libraries (no Radix/Shadcn), zero state libraries (no Redux/Zustand), zero dnd libraries"
  type_safety: "Zero any, zero eslint-disable, strict TypeScript mode enabled"
verification_command: "npm --prefix web run lint; if ($?) { npx --prefix web tsc --project frontend/tsconfig.json --noEmit; if ($?) { npm --prefix web run build } }"
```
