"use client";

import React from "react";
import type { ApplicationDraft } from "@/lib/api/types";
import { Button, Checkbox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AnswersToCopy } from "./AnswersToCopy";

export interface AssistedActionSectionProps {
  draft: ApplicationDraft;
  actionPending: boolean;
  employerHostname: string | null;
  reportedApproved: boolean;
  onToggleReportedApproved: (checked: boolean) => void;
  onReportedSubmission: () => void;
}

export function AssistedActionSection({
  draft,
  actionPending,
  employerHostname,
  reportedApproved,
  onToggleReportedApproved,
  onReportedSubmission,
}: AssistedActionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-xs">
        <span className="eyebrow block text-sage-deep">ASSISTED APPLICATION STEPS</span>
        <ol className="space-y-1.5 text-ink-soft list-decimal list-inside text-[11px] leading-relaxed">
          <li>Review prefilled facts and copy answers below.</li>
          <li>Complete submission on employer website.</li>
          <li>Confirm below to record in your tracker.</li>
        </ol>
      </div>

      {draft.apply_url && (
        <a
          href={draft.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full px-3 py-2 rounded-md border border-hairline-strong bg-paper-raised text-xs font-medium text-ink hover:bg-cream/40 transition-colors"
        >
          <span>Apply on employer site</span>
          <span className="font-mono text-[10px] text-sage-deep ml-1.5">
            ({employerHostname}) &nearr;
          </span>
        </a>
      )}

      <AnswersToCopy draft={draft} />

      {/* Reported Submission Gate */}
      {draft.reported_submitted_at ? (
        <div className="p-3.5 bg-moss-tint/40 rounded-md border border-moss/30 text-xs space-y-2">
          <span className="eyebrow block text-moss font-semibold">SUBMISSION RECORDED</span>
          <p className="text-ink font-medium">Application completed on employer site.</p>
          <p className="text-[11px] text-sage-deep">
            Reported on {formatDate(draft.reported_submitted_at)}
          </p>
          <Button variant="secondary" size="sm" href="/applications" className="w-full justify-center">
            View in Application Tracker &rarr;
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-hairline text-xs">
          <span className="eyebrow block">RECORD EXTERNAL SUBMISSION</span>
          <Checkbox
            id="checkbox-reported-submission"
            checked={reportedApproved}
            disabled={actionPending}
            onChange={(e) => onToggleReportedApproved(e.currentTarget.checked)}
            label={
              <span className="text-xs text-ink leading-snug">
                I have completed and submitted my application on the employer&apos;s site.
              </span>
            }
          />

          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            disabled={!reportedApproved || actionPending}
            loading={actionPending}
            onClick={onReportedSubmission}
          >
            Mark as submitted
          </Button>
        </div>
      )}
    </div>
  );
}
