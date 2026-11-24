"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/api/types";
import { formatCompensation, formatDeadline, titleCaseEnum } from "@/lib/format";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { JobMatchSummary } from "./JobMatchSummary";
import { StartApplication } from "@/components/applications/StartApplication";
import { useSavedJobs } from "@/lib/hooks/useSavedJobs";
import { Bookmark } from "lucide-react";

export interface JobCardProps {
  job: Job;
  className?: string;
}

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

export function JobCard({ job, className }: JobCardProps) {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const descId = useId();
  const { isSaved, toggleSave } = useSavedJobs();
  const saved = isSaved(job.id);

  const deadlineInfo = job.application_deadline ? formatDeadline(job.application_deadline) : null;
  const compText = job.compensation && job.compensation.length > 0 ? formatCompensation(job.compensation) : null;

  const rawDesc = job.description ? stripHtml(job.description) : "";
  const isDescLong = rawDesc.length > 240;
  const displayDesc = isDescLong && !showFullDesc ? `${rawDesc.slice(0, 240)}…` : rawDesc;
  const analysisUrl = `/jobs/${encodeURIComponent(job.id)}`;

  return (
    <article className={cn("min-w-0 space-y-4 rounded-xl border border-hairline bg-paper-raised p-4 sm:p-5", className)}>
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div className="min-w-0 space-y-1">
          <span className="block wrap-anywhere text-xs font-semibold text-moss">{job.company}</span>
          <h3 className="wrap-anywhere font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
            <Link
              href={analysisUrl}
              className="hover:underline hover:text-ink-soft transition-colors"
            >
              {job.title}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 wrap-anywhere text-sm text-ink-soft">
            <span>{job.location}</span>
            {job.additional_locations && job.additional_locations.length > 0 && (
              <span className="text-sage-deep">
                (+{job.additional_locations.join(", ")})
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleSave(job)}
            aria-label={saved ? "Remove from saved jobs" : "Save job for later"}
            title={saved ? "Saved" : "Save for later"}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border transition-colors",
              saved
                ? "border-ochre bg-ochre-tint text-ochre"
                : "border-hairline bg-paper text-sage-deep hover:border-moss/40 hover:text-ink"
            )}
          >
            <Bookmark size={15} className={saved ? "fill-current" : undefined} aria-hidden="true" />
          </button>
          <Button href={analysisUrl} variant="quiet" size="sm" className="min-h-9 px-2 !text-xs">
            View analysis
          </Button>
          <StartApplication job={job} />
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
          <Badge tone="outline">Review required</Badge>
        ) : (
          <Badge tone="neutral">Demo Mode</Badge>
        )}
      </div>

      {/* Description */}
      {rawDesc && (
        <div className="space-y-1 wrap-anywhere text-sm leading-relaxed text-ink-soft">
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
