import {
  confirmResumeFacts,
  getProfile,
  getResume as apiGetResume,
  listResumes as apiListResumes,
  uploadResume as apiUploadResume,
} from "@/lib/api";
import type {
  ConfirmedProfile,
  FactCategory,
  ProfileFact,
  ResumeDetail,
  ResumeFacts,
  ResumeSummary,
} from "@/lib/api/types";

export const factLabels: Record<FactCategory, string> = {
  skills: "Skills",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  certifications: "Certifications",
};

export type { FactCategory, ResumeFacts, ResumeSummary, ResumeDetail, ProfileFact };
export const factCategories = Object.keys(factLabels) as FactCategory[];

export function listResumes(signal: AbortSignal): Promise<ResumeSummary[]> {
  return apiListResumes(signal);
}

export function fetchProfile(signal: AbortSignal): Promise<ConfirmedProfile> {
  return getProfile(signal);
}

export function getResume(id: string): Promise<ResumeDetail> {
  return apiGetResume(id);
}

export function uploadResume(file: File): Promise<ResumeDetail> {
  return apiUploadResume(file);
}

export function confirmResume(resume: ResumeDetail, facts: ResumeFacts): Promise<ResumeDetail> {
  return confirmResumeFacts(resume, facts);
}
