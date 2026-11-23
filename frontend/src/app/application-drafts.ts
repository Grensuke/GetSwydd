import {
  listSubmissions as apiListSubmissions,
  requestJson,
  submitDraft as apiSubmitDraft,
} from "@/lib/api";
import type {
  ApplicationDraft,
  SubmissionReceipt,
} from "@/lib/api/types";

export type { ApplicationDraft, SubmissionReceipt };

const applicationsPath = "/api/v1/applications";

export function requestApplicationDraft(path: string, options?: RequestInit) {
  return requestJson<ApplicationDraft>(`${applicationsPath}/drafts${path}`, options);
}

export function submitApplicationDraft(path: string, updatedAt: string) {
  const draftId = path.replace(/^\//, "");
  return apiSubmitDraft(draftId, { approved: true, draft_updated_at: updatedAt });
}

export function listSubmissions(signal: AbortSignal) {
  return apiListSubmissions(signal);
}
