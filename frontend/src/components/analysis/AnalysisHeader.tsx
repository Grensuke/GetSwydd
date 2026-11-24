"use client";

import React from "react";
import type { Job } from "@/lib/api/types";
import { Badge, Divider } from "@/components/ui";
import { formatCompensation, formatDeadline, formatRelativeDate, titleCaseEnum } from "@/lib/format";
import { useSavedJobs } from "@/lib/hooks/useSavedJobs";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";

export function AnalysisHeader({ job }: { job: Job }) {
  const deadlineInfo = job.application_deadline ? formatDeadline(job.application_deadline) : null;
  const compText = job.compensation && job.compensation.length > 0 ? formatCompensation(job.compensation) : null;
  const { isSaved, toggleSave } = useSavedJobs();
  const saved = isSaved(job.id);

  return (
    <header className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <span className="eyebrow block text-sage-deep mb-1">{job.company}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink tracking-tight">
            {job.title}
          </h1>
          <p className="text-sm text-ink-soft mt-1.5 flex flex-wrap items-center gap-2">
            <span>{job.location}</span>
            {job.additional_locations && job.additional_locations.length > 0 && (
              <span className="text-sage-deep">
                (+{job.additional_locations.join(", ")})
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleSave(job)}
          aria-label={saved ? "Remove from saved jobs" : "Save job for later"}
          title={saved ? "Saved" : "Save for later"}
          className={cn(
            "flex size-10 items-center justify-center rounded-lg border transition-colors shrink-0",
            saved
              ? "border-ochre bg-ochre-tint text-ochre"
              : "border-hairline bg-paper text-sage-deep hover:border-moss/40 hover:text-ink"
          )}
        >
          <Bookmark size={18} className={saved ? "fill-current" : undefined} aria-hidden="true" />
        </button>
      </div>

      {/* Meta Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {job.workplace && <Badge tone="outline">{titleCaseEnum(job.workplace)}</Badge>}
        {job.employment && <Badge tone="outline">{titleCaseEnum(job.employment)}</Badge>}
        {job.experience_level && <Badge tone="outline">{titleCaseEnum(job.experience_level)}</Badge>}
        {compText && <Badge tone="neutral">{compText}</Badge>}
        {deadlineInfo && deadlineInfo.text && (
          <Badge tone={deadlineInfo.isUrgent ? "attention" : "outline"}>
            {deadlineInfo.text}
          </Badge>
        )}
        <Badge tone="info">Source: {titleCaseEnum(job.source)}</Badge>
        {job.application_mode === "assisted" ? (
          <Badge tone="outline">Review required</Badge>
        ) : (
          <Badge tone="neutral">Demo Mode</Badge>
        )}
      </div>

      {/* Data Freshness Timestamps (Rule 1: Show provenance & freshness) */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-sage-deep pt-1">
        {job.source_updated_at && (
          <span>Listing updated {formatRelativeDate(job.source_updated_at)}</span>
        )}
        {job.source_fetched_at && (
          <span>Fetched from source {formatRelativeDate(job.source_fetched_at)}</span>
        )}
      </div>

      <Divider variant="double" className="my-6" />
    </header>
  );
}
