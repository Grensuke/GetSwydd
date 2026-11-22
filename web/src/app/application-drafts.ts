export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ScreeningQuestion {
  id: string;
  question: string;
  required: boolean;
  answer: string | null;
  source: "verified_profile" | "user_supplied" | null;
}

export interface ApplicationDraft {
  id: string;
  job_title: string;
  company: string;
  candidate_name: string;
  selected_resume: string;
  screening_questions: ScreeningQuestion[];
  missing_required_questions: string[];
  ready_for_review: boolean;
  updated_at: string;
  submission: SubmissionReceipt | null;
}

export interface SubmissionReceipt {
  id: string;
  draft_id: string;
  job_title: string;
  company: string;
  selected_resume: string;
  submitted_at: string;
}

const applicationsPath = "/api/v1/applications";

export function requestApplicationDraft(path: string, options?: RequestInit) {
  return requestJson<ApplicationDraft>(`${applicationsPath}/drafts${path}`, options);
}

export function submitApplicationDraft(path: string, updatedAt: string) {
  return requestJson<SubmissionReceipt>(`${applicationsPath}/drafts${path}/submit`, {
    method: "POST",
    body: JSON.stringify({ approved: true, draft_updated_at: updatedAt }),
  });
}

export function listSubmissions(signal: AbortSignal) {
  return requestJson<SubmissionReceipt[]>(applicationsPath, { signal });
}

async function requestJson<Result>(
  path: string,
  options?: RequestInit,
): Promise<Result> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error("Could not connect to GetSwydd. Check that FastAPI is running and try again.");
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    if (typeof problem?.detail === "string") throw new Error(problem.detail);
    throw new Error(`The application draft request failed (HTTP ${response.status}).`);
  }

  return response.json();
}
