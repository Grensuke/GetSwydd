"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import type { Job } from "@/lib/api/types";
import { Panel } from "@/components/ui";
import { formatDeadline, formatDate } from "@/lib/format";

export interface DeadlineRadarProps {
  jobs: Job[];
  className?: string;
}

interface ClosingSoonItem {
  job: Job;
  daysRemaining: number;
  deadlineText: string;
}

/**
 * DeadlineRadar: derived from the currently loaded page of results.
 * Highlights roles closing within 14 days, sorted soonest first.
 *
 * Limitation note: This radar derives exclusively from the currently loaded
 * catalog results page rather than an unpaged backend query. To remain honest
 * with the user (Rule 1), the panel is clearly labelled "Closing soon on this page".
 */
export function DeadlineRadar({ jobs, className }: DeadlineRadarProps) {
  const closingSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: ClosingSoonItem[] = [];

    for (const job of jobs) {
      if (!job.application_deadline) continue;
      const target = new Date(job.application_deadline);
      if (isNaN(target.getTime())) continue;
      target.setHours(0, 0, 0, 0);

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      // Only include roles closing within the next 14 days that haven't passed
      if (diffDays >= 0 && diffDays <= 14) {
        const info = formatDeadline(job.application_deadline);
        items.push({
          job,
          daysRemaining: diffDays,
          deadlineText: info.text || `${diffDays} days`,
        });
      }
    }

    return items
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [jobs]);

  if (closingSoon.length === 0) return null;

  return (
    <Panel
      eyebrow="CLOSING SOON ON THIS PAGE"
      title="Upcoming deadlines"
      className={className}
    >
      <ul className="divide-y divide-hairline -my-2" role="list">
        {closingSoon.map(({ job, daysRemaining, deadlineText }) => (
          <li key={job.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded-sm shrink-0 ${
                  daysRemaining <= 7
                    ? "bg-ochre-tint text-ochre font-bold"
                    : "bg-paper text-ink-soft border border-hairline font-medium"
                }`}
              >
                {deadlineText}
              </span>
              <span className="eyebrow text-sage-deep shrink-0">{job.company}</span>
              <Link
                href={`/jobs/${encodeURIComponent(job.id)}`}
                className="font-medium text-ink hover:underline truncate"
              >
                {job.title}
              </Link>
            </div>
            <span className="font-mono text-[11px] text-sage-deep shrink-0 sm:text-right">
              {formatDate(job.application_deadline)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
