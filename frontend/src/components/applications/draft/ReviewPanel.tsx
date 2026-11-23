"use client";

import React, { useMemo, useState } from "react";
import type { ApplicationDraft } from "@/lib/api/types";
import { markReportedSubmission, submitDraft } from "@/lib/api";
import { Badge, Button, Checkbox, InlineNotice, Panel } from "@/components/ui";
import { AssistedActionSection } from "./AssistedActionSection";
import { SubmissionReceiptCard } from "./SubmissionReceiptCard";

export interface ReviewPanelProps {
  draft: ApplicationDraft;
  hasUnsavedChanges: boolean;
  onRefreshDraft: () => void;
  onDraftUpdated: (updated: ApplicationDraft) => void;
  onScrollToQuestion: (questionId: string) => void;
}

export function ReviewPanel({
  draft,
  hasUnsavedChanges,
  onRefreshDraft,
  onDraftUpdated,
  onScrollToQuestion,
}: ReviewPanelProps) {
  const [approvedVersion, setApprovedVersion] = useState<string | null>(null);
  const [reportedApproved, setReportedApproved] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStaleConflict, setIsStaleConflict] = useState(false);

  const isAssisted = draft.mode === "assisted";
  const isPersonalized = draft.mode === "personalized";
  const isDemo = draft.mode === "demo";

  const isSubmitted = Boolean(draft.submission || draft.reported_submitted_at);
  const canApprove = draft.ready_for_review && !hasUnsavedChanges && !actionPending && !isSubmitted;

  const employerHostname = useMemo(() => {
    if (!draft.apply_url) return null;
    try {
      return new URL(draft.apply_url).hostname.replace(/^www\./, "");
    } catch {
      return "employer website";
    }
  }, [draft.apply_url]);

  async function handleDemoSubmit() {
    if (!canApprove || approvedVersion !== draft.updated_at) return;
    setActionPending(true);
    setActionError(null);
    setIsStaleConflict(false);

    try {
      const receipt = await submitDraft(draft.id, {
        approved: true,
        draft_updated_at: draft.updated_at,
      });
      onDraftUpdated({ ...draft, submission: receipt });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setActionError(msg);
      if (msg.toLowerCase().includes("changed") || msg.toLowerCase().includes("reload")) {
        setIsStaleConflict(true);
      }
    } finally {
      setActionPending(false);
    }
  }

  async function handleReportedSubmission() {
    if (!reportedApproved || actionPending || isSubmitted) return;
    setActionPending(true);
    setActionError(null);

    try {
      const assisted = await markReportedSubmission(draft.id, { submitted: true });
      onDraftUpdated({
        ...draft,
        reported_submitted_at: assisted.reported_submitted_at || new Date().toISOString(),
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Could not record submission.");
    } finally {
      setActionPending(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-20 space-y-5">
      <Panel eyebrow="SIGN-OFF & ACTION" title="Review & Approval">
        <div className="space-y-4">
          {/* Readiness Status Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <span className="text-xs text-ink-soft">Draft Readiness</span>
            <Badge
              tone={
                isSubmitted
                  ? "verified"
                  : draft.ready_for_review
                  ? "verified"
                  : "attention"
              }
            >
              {isSubmitted
                ? draft.reported_submitted_at
                  ? "Reported submitted"
                  : "Submitted"
                : draft.ready_for_review
                ? "Ready for review"
                : "Needs your input"}
            </Badge>
          </div>

          {/* Missing Questions Warning */}
          {draft.missing_required_questions && draft.missing_required_questions.length > 0 && (
            <div className="p-3 bg-ochre-tint/40 rounded-md border border-ochre/30 text-xs space-y-2">
              <span className="eyebrow block text-ochre font-semibold">
                MANDATORY QUESTIONS MISSING ({draft.missing_required_questions.length})
              </span>
              <p className="text-[11px] text-ink-soft">
                All required questions must have verified answers before approval:
              </p>
              <ul className="space-y-1">
                {draft.missing_required_questions.map((qId) => (
                  <li key={qId}>
                    <button
                      type="button"
                      onClick={() => onScrollToQuestion(qId)}
                      className="text-ink font-medium underline text-[11px] hover:text-ink-soft cursor-pointer text-left"
                    >
                      &bull; Answer question {qId}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unsaved Changes Notice */}
          {hasUnsavedChanges && (
            <InlineNotice variant="attention">
              You have unsaved edits in the form. Save your answers before approving.
            </InlineNotice>
          )}

          {/* Conflict Warning */}
          {isStaleConflict && (
            <div className="p-3 rounded-md bg-brick-tint/50 border border-brick/40 space-y-2 text-xs">
              <p className="text-brick font-medium">This draft has changed on the server.</p>
              <Button type="button" variant="quiet" size="sm" onClick={onRefreshDraft}>
                Reload draft answers
              </Button>
            </div>
          )}

          {/* Assisted Workflow */}
          {isAssisted && (
            <AssistedActionSection
              draft={draft}
              actionPending={actionPending}
              employerHostname={employerHostname}
              reportedApproved={reportedApproved}
              onToggleReportedApproved={setReportedApproved}
              onReportedSubmission={handleReportedSubmission}
            />
          )}

          {/* Demo Submission Workflow */}
          {isDemo && (
            <div className="space-y-4">
              {draft.submission ? (
                <SubmissionReceiptCard receipt={draft.submission} />
              ) : (
                <div className="space-y-3 pt-2 border-t border-hairline">
                  <span className="eyebrow block text-sage-deep">RULE 2: USER APPROVAL REQUIRED</span>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    GetSwydd never submits automatically. Inspect all answers above before approving test dispatch.
                  </p>

                  <Checkbox
                    id="checkbox-demo-approval"
                    checked={approvedVersion === draft.updated_at}
                    disabled={!canApprove}
                    onChange={(e) =>
                      setApprovedVersion(e.currentTarget.checked ? draft.updated_at : null)
                    }
                    label={
                      <span className="text-xs text-ink leading-snug">
                        I have reviewed this draft version and approve its test submission.
                      </span>
                    }
                  />

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={!canApprove || approvedVersion !== draft.updated_at}
                    loading={actionPending}
                    onClick={handleDemoSubmit}
                  >
                    Approve & Dispatch Submission
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Personalized Draft Notice */}
          {isPersonalized && !isSubmitted && (
            <div className="p-3 bg-paper rounded-md border border-hairline text-xs space-y-2">
              <span className="eyebrow block text-sage-deep">SAVED PERSONALIZED PACKAGE</span>
              <p className="text-ink-soft leading-relaxed">
                This draft is anchored in your verified resume facts and saved to your profile. The local test employer accepts demo drafts.
              </p>
              <Button variant="secondary" size="sm" href="/applications" className="w-full justify-center">
                View in Application Tracker &rarr;
              </Button>
            </div>
          )}

          {actionError && !isStaleConflict && (
            <p role="alert" className="text-xs text-brick font-medium">
              {actionError}
            </p>
          )}
        </div>
      </Panel>
    </aside>
  );
}
