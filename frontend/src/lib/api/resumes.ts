import { requestJson } from "./client";
import type {
  ConfirmedProfile,
  ResumeContact,
  ResumeDetail,
  ResumeFacts,
  ResumeReview,
  ResumeSummary,
} from "./types";

/**
 * POST /api/v1/resumes
 * Upload a PDF or DOCX resume (up to 5 MB) for text extraction and fact suggestion.
 */
export function uploadResume(file: File, signal?: AbortSignal): Promise<ResumeDetail> {
  const formData = new FormData();
  formData.set("file", file);
  return requestJson<ResumeDetail>("/api/v1/resumes", {
    method: "POST",
    body: formData,
    signal,
  });
}

/**
 * GET /api/v1/resumes
 * List all uploaded resumes with review status and timestamps.
 */
export function listResumes(signal?: AbortSignal): Promise<ResumeSummary[]> {
  return requestJson<ResumeSummary[]>("/api/v1/resumes", { signal });
}

/**
 * GET /api/v1/resumes/{resume_id}
 * Retrieve resume detail including raw extracted text and suggested/confirmed facts.
 */
export function getResume(resumeId: string, signal?: AbortSignal): Promise<ResumeDetail> {
  return requestJson<ResumeDetail>(`/api/v1/resumes/${encodeURIComponent(resumeId)}`, {
    signal,
  });
}

export async function deleteResume(resumeId: string): Promise<void> {
  await requestJson<void>(`/api/v1/resumes/${encodeURIComponent(resumeId)}`, { method: "DELETE" });
}

/**
 * PUT /api/v1/resumes/{resume_id}/review
 * Confirm verified facts for an uploaded resume, merging them into the candidate profile.
 */
export function reviewResume(
  resumeId: string,
  review: ResumeReview,
  signal?: AbortSignal
): Promise<ResumeDetail> {
  return requestJson<ResumeDetail>(`/api/v1/resumes/${encodeURIComponent(resumeId)}/review`, {
    method: "PUT",
    body: JSON.stringify(review),
    signal,
  });
}

/**
 * Convenience helper to confirm facts given a ResumeDetail and facts object.
 */
export function confirmResumeFacts(
  resume: ResumeDetail,
  facts: ResumeFacts,
  signal?: AbortSignal,
  contact?: ResumeContact
): Promise<ResumeDetail> {
  return reviewResume(resume.id, { revision: resume.revision, facts, contact }, signal);
}

/**
 * GET /api/v1/profile
 * Retrieve the master profile formed by merging confirmed facts from all reviewed resumes.
 */
export function getProfile(signal?: AbortSignal): Promise<ConfirmedProfile> {
  return requestJson<ConfirmedProfile>("/api/v1/profile", { signal });
}

