import type { AssistedApplication, SubmissionReceipt } from "@/lib/api/types";
import { type ConfirmedStage, CONFIRMED_STAGE_MAP } from "./status";

export interface TrackedApplication {
  key: string;
  kind: "assisted" | "test";
  draftId: string;
  jobId?: string;
  jobTitle: string;
  company: string;
  resume: string;
  applyUrl?: string | null;
  confirmedStage: ConfirmedStage;
  confirmedSource: string;
  submittedAt: string | null;
  updatedAt: string;
  links: {
    draft: string;
    job?: string;
    employer?: string;
  };
}

export function normalizeAssisted(app: AssistedApplication): TrackedApplication {
  const confirmedStage: ConfirmedStage = app.status_source === "greenhouse"
    ? app.status === "submitted" ? "submitted_direct" : "submission_pending"
    : app.status === "submitted" && app.status_source === "user_reported" ? "submitted_reported" : "preparing";
  const stageInfo = CONFIRMED_STAGE_MAP[confirmedStage];

  return {
    key: `assisted:${app.draft_id}`,
    kind: "assisted",
    draftId: app.draft_id,
    jobId: app.job_id,
    jobTitle: app.job_title || "Untitled Role",
    company: app.company || "Unknown Company",
    resume: app.selected_resume || "None attached",
    applyUrl: app.apply_url || null,
    confirmedStage,
    confirmedSource: stageInfo.sourceTag,
    submittedAt: app.employer_submitted_at || app.reported_submitted_at || null,
    updatedAt: app.updated_at || app.reported_submitted_at || new Date().toISOString(),
    links: {
      draft: `/applications/drafts/${encodeURIComponent(app.draft_id)}`,
      job: app.job_id ? `/jobs/${encodeURIComponent(app.job_id)}` : undefined,
      employer: app.apply_url || undefined,
    },
  };
}

export function normalizeSubmission(receipt: SubmissionReceipt): TrackedApplication {
  const confirmedStage: ConfirmedStage = "test_submitted";
  const stageInfo = CONFIRMED_STAGE_MAP[confirmedStage];

  return {
    key: `test:${receipt.id}`,
    kind: "test",
    draftId: receipt.draft_id,
    jobTitle: receipt.job_title || "Untitled Role",
    company: receipt.company || "Mock Employer",
    resume: receipt.selected_resume || "None attached",
    applyUrl: null,
    confirmedStage,
    confirmedSource: stageInfo.sourceTag,
    submittedAt: receipt.submitted_at || null,
    updatedAt: receipt.submitted_at || receipt.approved_updated_at || new Date().toISOString(),
    links: {
      draft: `/applications/drafts/${encodeURIComponent(receipt.draft_id)}`,
    },
  };
}

export function normalizeApplications(
  assistedList: AssistedApplication[] | null,
  submissionsList: SubmissionReceipt[] | null
): TrackedApplication[] {
  const items: TrackedApplication[] = [];

  if (Array.isArray(assistedList)) {
    for (const app of assistedList) {
      if (app && app.draft_id) {
        items.push(normalizeAssisted(app));
      }
    }
  }

  if (Array.isArray(submissionsList)) {
    for (const receipt of submissionsList) {
      if (receipt && receipt.id) {
        items.push(normalizeSubmission(receipt));
      }
    }
  }

  // Sort newest updatedAt first
  items.sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime() || 0;
    const timeB = new Date(b.updatedAt).getTime() || 0;
    return timeB - timeA;
  });

  return items;
}
