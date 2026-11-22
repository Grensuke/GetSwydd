import { requestJson } from "../api-client";

export const factLabels = {
  skills: "Skills",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  certifications: "Certifications",
};

export type FactCategory = keyof typeof factLabels;
export type ResumeFacts = Record<FactCategory, string[]>;
export const factCategories = Object.keys(factLabels) as FactCategory[];

export interface ResumeSummary {
  id: string;
  filename: string;
  uploaded_at: string;
  reviewed: boolean;
}

export interface ResumeDetail extends ResumeSummary {
  extracted_text: string;
  suggested_facts: ResumeFacts;
  confirmed_facts: ResumeFacts | null;
  revision: number;
}

export interface ProfileFact {
  category: FactCategory;
  value: string;
  sources: { resume_id: string; filename: string }[];
}

const resumesPath = "/api/v1/resumes";

export function listResumes(signal: AbortSignal) {
  return requestJson<ResumeSummary[]>(resumesPath, { signal });
}

export function fetchProfile(signal: AbortSignal) {
  return requestJson<{ facts: ProfileFact[] }>("/api/v1/profile", { signal });
}

export function getResume(id: string) {
  return requestJson<ResumeDetail>(`${resumesPath}/${encodeURIComponent(id)}`);
}

export function uploadResume(file: File) {
  const body = new FormData();
  body.set("file", file);
  return requestJson<ResumeDetail>(resumesPath, { method: "POST", body });
}

export function confirmResume(resume: ResumeDetail, facts: ResumeFacts) {
  return requestJson<ResumeDetail>(`${resumesPath}/${encodeURIComponent(resume.id)}/review`, {
    method: "PUT",
    body: JSON.stringify({ revision: resume.revision, facts }),
  });
}
