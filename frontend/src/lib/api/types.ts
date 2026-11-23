/**
 * Domain types for GetSwydd API.
 * Mirrors FastAPI / Pydantic models in api/app/models.py and api/app/resume_models.py exactly.
 */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export type FactCategory = "skills" | "education" | "experience" | "projects" | "certifications";

export interface ProfileSource {
  resume_id: string;
  filename: string;
}

export interface ProfileFact {
  category: FactCategory;
  value: string;
  sources: ProfileSource[];
}

export interface ConfirmedProfile {
  facts: ProfileFact[];
}

/** Alias for ConfirmedProfile for convenience across codebase */
export type MergedProfile = ConfirmedProfile;

export interface ApplicationDetails {
  candidate_name?: string | null;
  availability?: string | null;
  uk_work_authorization?: "authorized" | "not_authorized" | null;
}

export interface ResumeFacts {
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
}

export interface ResumeContact {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
}

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
  suggested_contact?: ResumeContact;
  confirmed_contact?: ResumeContact | null;
  revision: number;
}

export interface ResumeReview {
  facts: ResumeFacts;
  revision: number;
  contact?: ResumeContact;
}

export interface RequirementMatch {
  label: string;
  status: "evidence_found" | "no_confirmed_evidence" | "needs_confirmation" | "not_met";
  evidence: ProfileFact[];
  kind: "required_skill" | "mentioned_skill" | "manual_check";
  confirmation_source?: "profile.uk_work_authorization" | null;
}

export interface ResumeRecommendation extends ProfileSource {
  covered_requirements: string[];
}

export interface JobMatch {
  has_confirmed_profile: boolean;
  requirements: RequirementMatch[];
  matched_skills: number;
  total_skills: number;
  recommended_resume: ResumeRecommendation | null;
  scope: "listed_requirements" | "description_mentions";
  eligibility_status:
    | "not_established"
    | "needs_confirmation"
    | "missing_evidence"
    | "listed_requirements_supported"
    | "not_met";
}

export type JobSource = "demo" | "greenhouse" | "lever" | "ashby";
export type Workplace = "remote" | "hybrid" | "onsite";
export type Employment = "internship" | "full_time" | "part_time" | "contract" | "temporary";
export type ExperienceLevel = "intern" | "entry" | "mid" | "senior";
export type PayPeriod = "hour" | "week" | "month" | "year" | "one_time";

export interface PayFloor {
  amount: number;
  currency: string;
  period: PayPeriod;
}

export interface CompensationRange {
  minimum: number;
  maximum: number;
  currency: string;
  period: PayPeriod;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  eligibility?: string | null;
  recommended_resume?: string | null;
  description?: string | null;
  posted_date?: string | null;
  match?: JobMatch | null;
  source: JobSource;
  application_mode: "demo" | "assisted";
  apply_url?: string | null;
  source_updated_at?: string | null;
  source_fetched_at?: string | null;
  workplace?: Workplace | null;
  employment?: Employment | null;
  experience_level?: ExperienceLevel | null;
  additional_locations: string[];
  compensation: CompensationRange[];
  application_deadline?: string | null;
}

export interface JobListResponse {
  total: number;
  jobs: Job[];
}

export interface JobListParams {
  source?: "demo" | "greenhouse" | "lever" | "ashby" | "live" | "all";
  market?: "india" | "all";
  q?: string;
  location?: string;
  internships_only?: boolean;
  workplace?: Workplace;
  employment?: Employment;
  experience_level?: ExperienceLevel;
  closing_within_days?: number;
  use_preferences?: boolean;
  sort?: "default" | "match";
  offset?: number;
  limit?: number;
}

export interface JobSearchPreferences {
  role_keywords: string[];
  location_keywords: string[];
  internships_only: boolean;
  workplace_modes: Workplace[];
  employment_types: Employment[];
  experience_levels: ExperienceLevel[];
  minimum_pay?: PayFloor | null;
  include_unknown: boolean;
}

export interface BoardRefresh {
  board: string;
  status: "refreshed" | "cached" | "failed";
  count: number;
}

export type ExternalSource = "greenhouse" | "lever" | "ashby";

export interface SourceRefresh extends BoardRefresh {
  source: ExternalSource;
}

export interface JobRefreshResult {
  sources: SourceRefresh[];
  new_alerts: number;
}

export interface JobDiscoveryRequest {
  message: string;
  resume_id?: string;
  limit?: number;
  refresh?: boolean;
  require_skill_match?: boolean;
}

export interface DiscoveryJob {
  job_id: string;
  title: string;
  company: string;
  location: string;
  source: ExternalSource;
  apply_url: string;
  application_deadline: string | null;
  match: JobMatch | null;
  applicant_location_check: {
    status: "not_requested" | "listed_location" | "needs_confirmation";
    evidence: string | null;
  };
}

export interface JobDiscoveryResult {
  status: "results" | "no_results" | "needs_clarification" | "out_of_scope";
  message: string;
  filters: {
    preferences: JobSearchPreferences;
    company_keywords: string[];
    skill_groups: string[][];
    applicant_location: string | null;
  } | null;
  selected_resume: ProfileSource | null;
  resume_options: ProfileSource[];
  jobs: DiscoveryJob[];
  total_matches: number;
  refresh_sources: SourceRefresh[];
  refresh_in_progress: boolean;
}

export interface JobAlert {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  apply_url: string | null;
  application_deadline: string | null;
  created_at: string;
  read_at: string | null;
}

export interface JobAlertListParams {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface AnalyzeJobRequest {
  use_semantic?: boolean;
}

export interface SemanticResumeMatch extends ProfileSource {
  similarity: number;
}

export interface JobAnalysis {
  job: Job;
  summary: string;
  semantic_status: "disabled" | "not_configured" | "insufficient_data" | "available" | "unavailable";
  semantic_resume_matches: SemanticResumeMatch[];
}

export * from "./application_types";


