import type { ProfileSource } from "./types";

export interface AnswerEvidence {
  value: string;
  resume?: ProfileSource | null;
  profile_field?: "availability" | "uk_work_authorization" | null;
}

export interface ScreeningQuestionAnswer {
  id: string;
  question: string;
  required: boolean;
  answer: string | null;
  source: "verified_profile" | "user_supplied" | null | string;
  evidence: AnswerEvidence[];
  choices: string[];
}

export interface DraftCreateRequest {
  job_id: string;
  resume_id?: string | null;
}

export interface UpdateAnswersRequest {
  answers: Record<string, string>;
}

export interface SubmitDraftRequest {
  approved: boolean;
  draft_updated_at: string;
}

export interface ReportSubmissionRequest {
  submitted: boolean;
}

export interface SubmissionReceipt {
  id: string;
  draft_id: string;
  job_title: string;
  company: string;
  selected_resume: string;
  approved_updated_at: string;
  submitted_at: string;
  destination: "local_test_employer";
  status: "submitted";
}

export interface ApplicationDraft {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  candidate_name: string;
  selected_resume: string;
  resume_id?: string | null;
  mode: "demo" | "personalized" | "assisted";
  apply_url?: string | null;
  form_status?: "loaded" | "partial" | "unavailable" | null;
  reported_submitted_at?: string | null;
  screening_questions: ScreeningQuestionAnswer[];
  missing_required_questions: string[];
  ready_for_review: boolean;
  created_at: string;
  updated_at: string;
  submission?: SubmissionReceipt | null;
}

export interface AssistedApplication {
  draft_id: string;
  job_id: string;
  job_title: string;
  company: string;
  selected_resume: string;
  apply_url: string;
  status: "draft" | "submitted";
  status_source: "getswydd" | "user_reported";
  reported_submitted_at: string | null;
  updated_at: string;
}
