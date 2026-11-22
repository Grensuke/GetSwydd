"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { listResumes } from "@/lib/api";
import type { ResumeSummary } from "@/lib/api/types";
import { Badge, Button, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/format";

export interface ResumeSelectorProps {
  selectedResumeId: string | null;
  onSelectResumeId: (id: string | null) => void;
  recommendedResumeId?: string | null;
  isAssisted?: boolean;
  disabled?: boolean;
}

export function ResumeSelector({
  selectedResumeId,
  onSelectResumeId,
  recommendedResumeId,
  isAssisted = false,
  disabled = false,
}: ResumeSelectorProps) {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchResumes() {
      setLoading(true);
      setError(null);
      try {
        const list = await listResumes(controller.signal);
        if (active) {
          setResumes(list);
          // If assisted mode and no resume selected yet, auto-select recommended or first reviewed
          if (isAssisted && selectedResumeId === null) {
            const matchRec = list.find((r) => r.id === recommendedResumeId && r.reviewed);
            const firstReviewed = list.find((r) => r.reviewed);
            if (matchRec) {
              onSelectResumeId(matchRec.id);
            } else if (firstReviewed) {
              onSelectResumeId(firstReviewed.id);
            }
          }
        }
      } catch (err: unknown) {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Could not load resumes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchResumes();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryIndex, isAssisted, recommendedResumeId, onSelectResumeId, selectedResumeId]);

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading resumes">
        <span className="eyebrow block text-sage-deep">SELECT RESUME</span>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md border border-brick/30 bg-paper space-y-2 text-xs">
        <span className="eyebrow block text-brick">COULD NOT LOAD RESUMES</span>
        <p className="text-ink-soft">{error}</p>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={() => setRetryIndex((i) => i + 1)}
        >
          Try loading again
        </Button>
      </div>
    );
  }

  const items = resumes ?? [];

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-md border border-hairline bg-paper text-xs space-y-2">
        <span className="eyebrow block">RESUMES</span>
        <p className="text-ink-soft">
          No resumes have been uploaded yet. Upload a resume to anchor your application in verified facts.
        </p>
        <Link
          href="/resumes"
          className="inline-block text-ink underline font-medium hover:text-ink-soft"
        >
          Go to Resumes &rarr;
        </Link>
      </div>
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="eyebrow block mb-2 text-sage-deep">
        SELECT RESUME FOR THIS APPLICATION
      </legend>

      <div className="space-y-2" role="radiogroup" aria-label="Select resume">
        {/* Option: Let GetSwydd choose */}
        <label
          htmlFor="resume-auto"
          className={`flex items-start gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
            selectedResumeId === null && !isAssisted
              ? "border-ink bg-paper-raised"
              : isAssisted
              ? "border-hairline bg-paper/50 opacity-60 cursor-not-allowed"
              : "border-hairline bg-paper hover:bg-paper-raised"
          }`}
        >
          <input
            id="resume-auto"
            type="radio"
            name="selectedResume"
            value=""
            checked={selectedResumeId === null}
            disabled={disabled || isAssisted}
            onChange={() => onSelectResumeId(null)}
            className="mt-0.5 h-4 w-4 text-ink border-hairline focus:ring-ink"
          />
          <div className="flex-1 space-y-0.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink">Let GetSwydd choose the best fit</span>
              {!isAssisted && <Badge tone="neutral">Auto-match</Badge>}
            </div>
            <p className="text-sage-deep text-[11px] leading-relaxed">
              {isAssisted
                ? "Assisted mode requires choosing a confirmed resume."
                : "Automatically selects the most relevant confirmed resume for this job."}
            </p>
          </div>
        </label>

        {/* List of uploaded resumes */}
        {items.map((resume) => {
          const isSelected = selectedResumeId === resume.id;
          const isRecommended =
            recommendedResumeId === resume.id ||
            recommendedResumeId?.toLowerCase() === resume.filename.toLowerCase();
          const isReviewed = resume.reviewed;

          return (
            <label
              key={resume.id}
              htmlFor={`resume-${resume.id}`}
              className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                !isReviewed
                  ? "border-hairline bg-paper/40 opacity-75 cursor-not-allowed"
                  : isSelected
                  ? "border-ink bg-paper-raised cursor-pointer"
                  : "border-hairline bg-paper hover:bg-paper-raised cursor-pointer"
              }`}
            >
              <input
                id={`resume-${resume.id}`}
                type="radio"
                name="selectedResume"
                value={resume.id}
                checked={isSelected}
                disabled={disabled || !isReviewed}
                onChange={() => onSelectResumeId(resume.id)}
                className="mt-0.5 h-4 w-4 text-ink border-hairline focus:ring-ink"
              />
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-mono text-ink font-medium break-all">
                    {resume.filename}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRecommended && (
                      <Badge tone="outline">Recommended for this role</Badge>
                    )}
                    {isReviewed ? (
                      <Badge tone="verified">Facts confirmed</Badge>
                    ) : (
                      <Badge tone="attention">Awaiting review</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-sage-deep">
                  <span>Uploaded {formatDate(resume.uploaded_at)}</span>
                  {!isReviewed && (
                    <Link
                      href="/resumes"
                      className="text-ochre underline hover:text-ink font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Confirm this resume&apos;s facts first &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
