import type { BadgeTone } from "@/components/ui/badge";
import type { JobMatch, RequirementMatch, JobAnalysis } from "@/lib/api/types";

/**
 * Shared status labels and badge tones across GetSwydd.
 * Enforces identical wording and visual tone across Discover, Job Analysis, Alerts, and Application screens.
 */

export const ELIGIBILITY_STATUS_MAP: Record<
  JobMatch["eligibility_status"],
  { label: string; tone: BadgeTone; description: string }
> = {
  not_established: {
    label: "Eligibility not established",
    tone: "neutral",
    description: "No confirmed profile facts available to evaluate role requirements.",
  },
  needs_confirmation: {
    label: "Needs your confirmation",
    tone: "attention",
    description: "Some required qualifications need manual verification from your profile.",
  },
  missing_evidence: {
    label: "Missing evidence",
    tone: "attention",
    description: "No evidence found in confirmed resume facts for some listed requirements.",
  },
  listed_requirements_supported: {
    label: "Listed requirements supported",
    tone: "verified",
    description: "All core requirements have supporting evidence in your confirmed profile facts.",
  },
  not_met: {
    label: "Requirement not met",
    tone: "problem",
    description: "One or more mandatory requirements conflict with your confirmed profile data.",
  },
};

export const REQUIREMENT_STATUS_MAP: Record<
  RequirementMatch["status"],
  { label: string; tone: BadgeTone }
> = {
  evidence_found: { label: "Evidence found", tone: "verified" },
  no_confirmed_evidence: { label: "No confirmed evidence", tone: "outline" },
  needs_confirmation: { label: "Needs confirmation", tone: "attention" },
  not_met: { label: "Requirement not met", tone: "problem" },
};

export const REQUIREMENT_KIND_LABELS: Record<RequirementMatch["kind"], string> = {
  required_skill: "Required skills",
  mentioned_skill: "Mentioned in description",
  manual_check: "Needs a manual check",
};

export const SEMANTIC_STATUS_MAP: Record<
  JobAnalysis["semantic_status"],
  { label: string; description: string; tone: BadgeTone }
> = {
  disabled: {
    label: "Semantic comparison off",
    description: "Semantic comparison is turned off.",
    tone: "neutral",
  },
  not_configured: {
    label: "Not configured",
    description: "Semantic comparison isn't set up on this server.",
    tone: "info",
  },
  insufficient_data: {
    label: "Insufficient data",
    description: "Not enough confirmed resume information to compare yet.",
    tone: "attention",
  },
  unavailable: {
    label: "Temporarily unavailable",
    description: "Semantic comparison is temporarily unavailable. The rest of this analysis is unaffected.",
    tone: "problem",
  },
  available: {
    label: "Semantic match available",
    description: "Similarity of meaning between your resume and this listing. Estimated, not a hiring predictor.",
    tone: "verified",
  },
};

export const DRAFT_MODE_MAP: Record<
  "demo" | "personalized" | "assisted",
  { label: string; tone: BadgeTone; description: string }
> = {
  demo: {
    label: "Demo Mode",
    tone: "neutral",
    description: "Sandbox draft evaluated against mock test employer.",
  },
  personalized: {
    label: "Personalized Draft",
    tone: "verified",
    description: "Anchored in your confirmed resume facts and profile.",
  },
  assisted: {
    label: "Assisted Application",
    tone: "attention",
    description: "Prepared for manual completion directly on the employer's website.",
  },
};

export const FORM_STATUS_MAP: Record<
  "loaded" | "partial" | "unavailable",
  { label: string; tone: BadgeTone; description: string }
> = {
  loaded: {
    label: "Questions loaded",
    tone: "verified",
    description: "Screening questions loaded from the employer's application form.",
  },
  partial: {
    label: "Partially parsed",
    tone: "attention",
    description: "Some employer screening questions could not be automatically extracted.",
  },
  unavailable: {
    label: "Form unavailable",
    tone: "problem",
    description: "Employer application questions could not be retrieved automatically.",
  },
};

