import type { BadgeTone } from "@/components/ui/badge";

/**
 * Two-Tier Application Status Model
 * Tier 1: Confirmed (derived from backend API records only).
 * Tier 2: Personal (manual client-side tracking, never verified by GetSwydd).
 */

export type ConfirmedStage = "preparing" | "submitted_reported" | "submitted_direct" | "submission_pending" | "test_submitted";

export interface ConfirmedStageInfo {
  stage: ConfirmedStage;
  label: string;
  sourceTag: string;
  tone: BadgeTone;
  description: string;
}

export const CONFIRMED_STAGE_MAP: Record<ConfirmedStage, ConfirmedStageInfo> = {
  preparing: {
    stage: "preparing",
    label: "Preparing",
    sourceTag: "Tracked by GetSwydd",
    tone: "attention",
    description: "Application package in preparation. Verified answers ready for manual review.",
  },
  submitted_reported: {
    stage: "submitted_reported",
    label: "Submitted (reported by you)",
    sourceTag: "Reported by you",
    tone: "verified",
    description: "You reported completing the application on the employer's website.",
  },
  submitted_direct: {
    stage: "submitted_direct",
    label: "Employer confirmed",
    sourceTag: "Accepted by Greenhouse",
    tone: "verified",
    description: "Greenhouse accepted the employer application.",
  },
  submission_pending: {
    stage: "submission_pending",
    label: "Confirmation pending",
    sourceTag: "Awaiting confirmation from Greenhouse",
    tone: "attention",
    description: "GetSwydd has yet to confirm receipt from Greenhouse.",
  },
  test_submitted: {
    stage: "test_submitted",
    label: "Test submission",
    sourceTag: "Recorded by GetSwydd (test inbox)",
    tone: "neutral",
    description: "Demo sandbox draft delivered to the local mock employer inbox.",
  },
};

export type PersonalStage = "saved" | "assessment" | "interview" | "offer" | "rejected";

export interface PersonalStageInfo {
  stage: PersonalStage;
  label: string;
  description: string;
}

export const PERSONAL_STAGE_MAP: Record<PersonalStage, PersonalStageInfo> = {
  saved: {
    stage: "saved",
    label: "Saved",
    description: "Bookmarked for your own reference.",
  },
  assessment: {
    stage: "assessment",
    label: "Assessment",
    description: "Online assessment, test, or take-home assignment in progress.",
  },
  interview: {
    stage: "interview",
    label: "Interview",
    description: "Conversations, screening calls, or interviews scheduled or held.",
  },
  offer: {
    stage: "offer",
    label: "Offer",
    description: "Received an offer of employment.",
  },
  rejected: {
    stage: "rejected",
    label: "Rejected",
    description: "Role closed or application unsuccessful.",
  },
};

export const PERSONAL_STAGES_LIST: PersonalStage[] = [
  "assessment",
  "interview",
  "offer",
  "rejected",
  "saved",
];
