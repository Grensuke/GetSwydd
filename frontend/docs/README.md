# GetSwydd Frontend Documentation

Welcome to the frontend documentation for GetSwydd. The web client is built with Next.js 16 (App Router), React 19, TypeScript strict mode, and Tailwind CSS 4, styled with a quiet editorial visual aesthetic.

---

## Authoritative Master Report

- **[Master Architecture and Engineering Report (Phases 1–3)](./FRONTEND-COMPLETE-REPORT.md)**:
  The single self-contained, authoritative documentation file describing everything built across all three phases, including design tokens, the 15 UI primitives, 10 routes, complete 24-endpoint API matrix, two-tier status architecture, spec vs. reality analysis, backend wish list, and hand-off notes.

---

## Phase Changelogs

The chronological development logs of the frontend across the three development milestones:

1. **[Phase 1 Changelog](./PHASE-1-CHANGELOG.md)**:
   - Quiet editorial design tokens (`paper`, `cream`, `sage`, `ink`, `hairline`, `moss`, `ochre`, `brick`, `slate`).
   - 15 accessible UI primitives with zero external component library dependencies.
   - Global application shell (`SiteHeader`, `SiteFooter`, skip-to-content, active nav indicators).
   - Typed API client covering all 24 backend endpoints.
   - Initial redesigned views for Discover (`/`), Resumes (`/resumes`), and Candidate Profile (`/profile`).

2. **[Phase 2 Changelog](./PHASE-2-CHANGELOG.md)**:
   - Full discovery engine on `/` with multi-source tabs (Greenhouse, Lever, Ashby, Demo), dual-input search, structured filters, and editorial pagination.
   - Candidate search preferences drawer with dirty tracking and pay floor configuration.
   - Real-time unread alert popover in the header and notification ledger on `/alerts`.
   - Deep job qualification analysis view on `/jobs/[jobId]` with requirement provenance, eligibility checks, and AI semantic match.
   - Upcoming deadline radar closing within 14 days.

3. **[Phase 3 Changelog](./PHASE-3-CHANGELOG.md)**:
   - Complete application preparation and review workflow with `StartApplication` and `ResumeSelector`.
   - Rebuilt draft editor on `/applications/drafts/[draftId]` with choice validation, autosizing textareas, collapsible evidence provenance, and unsaved changes guards.
   - Assisted mode fallback with one-click clipboard copying and reported submission gate.
   - Unified application tracker on `/applications` featuring a two-tier status model (Confirmed vs Personal) across an editorial Ledger table and keyboard-first Kanban Board.
   - Token-only dark mode swap with zero-flash layout hydration and WCAG AA contrast compliance.
   - Complete architectural audit: all files strictly $\le 250$ lines, zero `any`, zero linter warnings.

---

## Technical Highlights

- **Aesthetic**: Quiet editorial stationery brand design; Fraunces serif headings, hairline borders, muted semantic tones, no emojis, no gradients.
- **Rules Enforced**:
  - Rule 1: Verified Facts Only (provenance source tags, empty inputs for unconfirmed facts).
  - Rule 2: User Approval Before Submission (explicit checkbox confirmation required before any dispatch).
  - Rule 3: Assisted Mode Fallback (guided application packets, direct employer links, user-reported submission).
- **Codebase Quality**:
  - TypeScript Strict: Zero `any`, complete backend Pydantic parity.
  - File Budget: 108 of 109 TypeScript and TSX files remain strictly $\le 250$ lines.
  - Performance: Partial Prerendering (PPR), zero-layout-shift skeletons, and theme hydration script.
