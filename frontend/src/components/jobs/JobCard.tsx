"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/api/types";
import { formatCompensation, formatDeadline, titleCaseEnum } from "@/lib/format";
import { Badge } from "@/components/ui";
import { JobMatchSummary } from "./JobMatchSummary";
import { StartApplication } from "@/components/applications/StartApplication";

export interface JobCardProps {
  job: Job;
  className?: string;
}

// The detailed analysis page /jobs/[jobId] is implemented in Phase 2 Prompt 2.
const ENABLE_ANALYSIS_ROUTE = true;

function stripHtml(text: string): string {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function JobCard({ job }: JobCardProps) {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const descId = useId();

  const deadlineInfo = job.application_deadline ? formatDeadline(job.application_deadline) : null;
  const compText = job.compensation && job.compensation.length > 0 ? formatCompensation(job.compensation) : null;

  const rawDesc = job.description ? stripHtml(job.description) : "";
  const isDescLong = rawDesc.length > 240;
  const displayDesc = isDescLong && !showFullDesc ? `${rawDesc.slice(0, 240)}…` : rawDesc;

  return (
    <article className="py-6 first:pt-2 last:pb-2 border-b border-hairline last:border-b-0 space-y-4">
      {/* Top Header: Company eyebrow, title, and action */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="eyebrow block text-sage-deep">{job.company}</span>
          <h3 className="font-display text-xl sm:text-2xl font-medium text-ink tracking-tight">
            <Link
              href={`/jobs/${encodeURIComponent(job.id)}`}
              className="hover:underline hover:text-ink-soft transition-colors"
            >
              {job.title}
            </Link>
          </h3>
          <p className="text-xs text-ink-soft flex items-center gap-2">
            <span>{job.location}</span>
            {job.additional_locations && job.additional_locations.length > 0 && (
              <span className="text-sage-deep">
                (+{job.additional_locations.join(", ")})
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 sm:self-start">
          <div className="flex items-center gap-2">
            {ENABLE_ANALYSIS_ROUTE ? (
              <Link
                href={`/jobs/${encodeURIComponent(job.id)}`}
                className="text-xs text-ink underline hover:text-ink-soft"
              >
                View analysis
              </Link>
            ) : (
              <span className="text-[11px] text-sage-deep">
                {/* View analysis route available in Prompt 2 */}
              </span>
            )}
            <StartApplication job={job} />
          </div>

          {job.application_mode === "assisted" && (
            <p className="text-[11px] text-sage-deep text-left sm:text-right">
              Assisted application: you finish on the employer&apos;s site.
            </p>
          )}
        </div>
      </div>

      {/* Meta Badges Row */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {job.workplace && (
          <Badge tone="outline">{titleCaseEnum(job.workplace)}</Badge>
        )}
        {job.employment && (
          <Badge tone="outline">{titleCaseEnum(job.employment)}</Badge>
        )}
        {job.experience_level && (
          <Badge tone="outline">{titleCaseEnum(job.experience_level)}</Badge>
        )}
        {compText && (
          <Badge tone="neutral">{compText}</Badge>
        )}
        {deadlineInfo && deadlineInfo.text && (
          <Badge tone={deadlineInfo.isUrgent ? "attention" : "outline"}>
            {deadlineInfo.text}
          </Badge>
        )}
        <Badge tone="info">Source: {titleCaseEnum(job.source)}</Badge>
        {job.application_mode === "assisted" ? (
          <Badge tone="attention">Assisted Mode</Badge>
        ) : (
          <Badge tone="neutral">Demo Mode</Badge>
        )}
      </div>

      {/* Description */}
      {rawDesc && (
        <div className="text-xs text-ink-soft leading-relaxed space-y-1">
          <p id={descId}>{displayDesc}</p>
          {isDescLong && (
            <button
              type="button"
              onClick={() => setShowFullDesc((prev) => !prev)}
              aria-expanded={showFullDesc}
              aria-controls={descId}
              className="text-ink underline hover:text-ink-soft text-[11px] font-medium cursor-pointer"
            >
              {showFullDesc ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Eligibility excerpt */}
      {job.eligibility && (
        <div className="p-3 bg-paper rounded-md border border-hairline text-xs">
          <span className="eyebrow block mb-1">STATED ELIGIBILITY</span>
          <p className="text-ink leading-snug">{job.eligibility}</p>
        </div>
      )}

      {/* Match Panel */}
      {job.match && <JobMatchSummary match={job.match} />}
    </article>
  );
}
