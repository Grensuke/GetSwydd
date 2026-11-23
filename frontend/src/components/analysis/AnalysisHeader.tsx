"use client";

import React from "react";
import type { Job } from "@/lib/api/types";
import { Badge, Divider } from "@/components/ui";
import { formatCompensation, formatDeadline, formatRelativeDate, titleCaseEnum } from "@/lib/format";

export function AnalysisHeader({ job }: { job: Job }) {
  const deadlineInfo = job.application_deadline ? formatDeadline(job.application_deadline) : null;
  const compText = job.compensation && job.compensation.length > 0 ? formatCompensation(job.compensation) : null;

  return (
    <header className="space-y-4">
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
