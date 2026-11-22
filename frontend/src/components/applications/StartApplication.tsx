"use client";

import { useRouter } from "next/navigation";
import React, { useRef, useState, useTransition } from "react";
import type { Job } from "@/lib/api/types";
import { createDraft } from "@/lib/api";
import { Badge, Button, InlineNotice, Sheet } from "@/components/ui";
import { ResumeSelector } from "./ResumeSelector";
import { ELIGIBILITY_STATUS_MAP } from "@/lib/labels";

export interface StartApplicationProps {
  job: Job;
  className?: string;
  triggerVariant?: "primary" | "secondary" | "quiet";
  triggerSize?: "sm" | "md";
  fullWidth?: boolean;
}

export function StartApplication({
  job,
  className,
  triggerVariant,
  triggerSize = "sm",
  fullWidth = false,
}: StartApplicationProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const creatingRef = useRef(false);
  const isAssisted = job.application_mode === "assisted";
  const isPending = isSubmitting || isNavigating;

  const defaultTriggerVariant = triggerVariant ?? (isAssisted ? "secondary" : "primary");
  const triggerLabel = isAssisted ? "Prepare application" : "Draft demo application";

  const eligibility = job.match
    ? ELIGIBILITY_STATUS_MAP[job.match.eligibility_status] || ELIGIBILITY_STATUS_MAP.not_established
    : null;

  async function handleCreateDraft() {
    if (creatingRef.current || isPending) return;
    if (isAssisted && !selectedResumeId) {
      setError("Please select a reviewed resume before continuing with an assisted application.");
      return;
    }

    creatingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const draft = await createDraft({
        job_id: job.id,
        resume_id: selectedResumeId || undefined,
      });

      startNavigation(() => {
        setSheetOpen(false);
        router.push(`/applications/drafts/${encodeURIComponent(draft.id)}`);
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create application draft.");
      creatingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant={defaultTriggerVariant}
        size={triggerSize}
        onClick={() => {
          setError(null);
          setSheetOpen(true);
        }}
        className={fullWidth ? "w-full justify-center" : className}
      >
        {triggerLabel}
      </Button>

      <Sheet
        open={sheetOpen}
        onClose={() => {
          if (!isPending) setSheetOpen(false);
        }}
        title="Prepare your application"
      >
        <div className="p-5 space-y-6">
          {/* Target Job Summary */}
          <div className="p-4 rounded-md border border-hairline bg-paper space-y-2">
            <span className="eyebrow block text-sage-deep">{job.company}</span>
            <h3 className="font-display text-lg font-medium text-ink">{job.title}</h3>
            <p className="text-xs text-ink-soft">{job.location}</p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {job.application_mode === "assisted" ? (
                <Badge tone="attention">Assisted Mode</Badge>
              ) : (
                <Badge tone="neutral">Demo Sandbox</Badge>
              )}
              {job.match && (
                <Badge tone="info">
                  {job.match.matched_skills}/{job.match.total_skills} skills matched
                </Badge>
              )}
              {eligibility && (
                <Badge tone={eligibility.tone}>{eligibility.label}</Badge>
              )}
            </div>
          </div>

          {/* Mode Explainer Notice */}
          {isAssisted ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-md border border-hairline bg-paper text-xs space-y-1.5">
                <span className="eyebrow block text-sage-deep">HOW ASSISTED MODE WORKS</span>
                <p className="text-ink-soft leading-relaxed">
                  GetSwydd organizes verified screening answers from your profile. You review the package and copy the answers to complete your submission directly on the employer&apos;s site.
                </p>
                <p className="text-[11px] text-sage-deep italic">
                  Rule 3: GetSwydd never submits without you.
                </p>
              </div>

              {!job.apply_url && (
                <InlineNotice variant="attention">
                  This listing does not include a direct employer application URL. You will need to locate the application portal on their website.
                </InlineNotice>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-md border border-hairline bg-paper text-xs space-y-1.5">
              <span className="eyebrow block text-sage-deep">DEMO SANDBOX DRAFT</span>
              <p className="text-ink-soft leading-relaxed">
                This draft will be generated using verified facts. Once complete, you will review the full package before approving a test delivery to the local demo inbox.
              </p>
            </div>
          )}

          {/* Resume Selector */}
          <ResumeSelector
            selectedResumeId={selectedResumeId}
            onSelectResumeId={(id) => {
              setSelectedResumeId(id);
              setError(null);
            }}
            recommendedResumeId={
              job.match?.recommended_resume?.resume_id ?? job.recommended_resume
            }
            isAssisted={isAssisted}
            disabled={isPending}
          />

          {/* Error Message */}
          {error && (
            <InlineNotice variant="problem">
              {error}
            </InlineNotice>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-hairline">
            <Button
              type="button"
              variant="quiet"
              size="md"
              disabled={isPending}
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isPending}
              disabled={isPending || (isAssisted && !selectedResumeId)}
              onClick={handleCreateDraft}
            >
              {isPending ? "Creating draft…" : "Create application draft"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
