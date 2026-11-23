import { requestJson } from "./client";
import type {
  ApplicationDraft,
  AssistedApplication,
  DraftCreateRequest,
  ReportSubmissionRequest,
  SubmissionReceipt,
  SubmitDraftRequest,
  UpdateAnswersRequest,
} from "./types";

/**
 * POST /api/v1/applications/drafts
 * Create a new application draft for a target job. Pre-fills screening answers from verified facts.
 */
export function createDraft(
  payload: DraftCreateRequest,
  signal?: AbortSignal
): Promise<ApplicationDraft> {
  return requestJson<ApplicationDraft>("/api/v1/applications/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

/**
 * GET /api/v1/applications/drafts/{draft_id}
 * Retrieve an application draft by ID from persistent storage.
 */
export function getDraft(draftId: string, signal?: AbortSignal): Promise<ApplicationDraft> {
  return requestJson<ApplicationDraft>(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}`, {
    signal,
  });
}

/**
 * PATCH /api/v1/applications/drafts/{draft_id}/answers
 * Update screening question answers for an application draft.
 */
export function updateAnswers(
  draftId: string,
  answers: Record<string, string>,
  signal?: AbortSignal
): Promise<ApplicationDraft> {
  const payload: UpdateAnswersRequest = { answers };
  return requestJson<ApplicationDraft>(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}/answers`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    signal,
  });
}

/**
 * POST /api/v1/applications/drafts/{draft_id}/submit
 * Explicitly approve and submit a demo draft to the local test employer inbox.
 */
export function submitDraft(
  draftId: string,
  payload: SubmitDraftRequest,
  signal?: AbortSignal
): Promise<SubmissionReceipt> {
  return requestJson<SubmissionReceipt>(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

export function submitToEmployer(draftId: string, payload: SubmitDraftRequest): Promise<ApplicationDraft> {
  return requestJson<ApplicationDraft>(
    `/api/v1/applications/drafts/${encodeURIComponent(draftId)}/employer-submission`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export interface BrowserDemoPreview {
  session_id: string;
  draft_updated_at: string;
}

export function openBrowserDemo(draftId: string, version: string): Promise<BrowserDemoPreview> {
  return requestJson(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}/browser-demo`, {
    method: "POST",
    body: JSON.stringify({ draft_updated_at: version }),
  });
}

export function approveBrowserDemo(draftId: string, preview: BrowserDemoPreview): Promise<SubmissionReceipt> {
  return requestJson(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}/browser-demo/submit`, {
    method: "POST",
    body: JSON.stringify({ ...preview, approved: true }),
  });
}

export async function cancelBrowserDemo(draftId: string, sessionId: string): Promise<void> {
  await requestJson(`/api/v1/applications/drafts/${encodeURIComponent(draftId)}/browser-demo/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

/** List receipts from the local demo inbox. */
export function listSubmissions(signal?: AbortSignal): Promise<SubmissionReceipt[]> {
  return requestJson<SubmissionReceipt[]>("/api/v1/applications", { signal });
}

/**
 * GET /api/v1/applications/assisted
 * List real assisted drafts and user-reported employer submissions.
 */
export function listAssisted(signal?: AbortSignal): Promise<AssistedApplication[]> {
  return requestJson<AssistedApplication[]>("/api/v1/applications/assisted", { signal });
}

/**
 * PUT /api/v1/applications/drafts/{draft_id}/reported-submission
 * Record the user's explicit report of completing submission on the employer's website.
 */
export function markReportedSubmission(
  draftId: string,
  payload: ReportSubmissionRequest = { submitted: true },
  signal?: AbortSignal
): Promise<AssistedApplication> {
  return requestJson<AssistedApplication>(
    `/api/v1/applications/drafts/${encodeURIComponent(draftId)}/reported-submission`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      signal,
    }
  );
}

