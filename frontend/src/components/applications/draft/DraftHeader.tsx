"use client";

import Link from "next/link";
import React from "react";
import type { ApplicationDraft } from "@/lib/api/types";
import { Badge, Divider, SourceTag } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { DRAFT_MODE_MAP } from "@/lib/labels";

export interface DraftHeaderProps {
  draft: ApplicationDraft;
}

export function DraftHeader({ draft }: DraftHeaderProps) {
  const modeInfo = DRAFT_MODE_MAP[draft.mode] || DRAFT_MODE_MAP.demo;

  return (
    <div className="space-y-4">
      {/* Eyebrow & Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow text-sage-deep">{draft.company}</span>
        <div className="flex items-center gap-2">
          <Badge tone={modeInfo.tone}>{modeInfo.label}</Badge>
          {draft.submission && <Badge tone="verified">Submitted</Badge>}
          {draft.reported_submitted_at && <Badge tone="verified">Reported Submitted</Badge>}
        </div>
      </div>

      {/* Main Title */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink tracking-tight">
          {draft.job_title}
        </h1>
        <p className="text-xs text-ink-soft">
          Application draft package &bull; Created {formatDate(draft.created_at)}
          {draft.updated_at !== draft.created_at && ` &bull; Updated ${formatDate(draft.updated_at)}`}
        </p>
      </div>

      {/* Metadata Row: Candidate & Resume */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-paper rounded-md border border-hairline text-xs">
        <div className="space-y-1">
          <span className="eyebrow block text-sage-deep">CANDIDATE OF RECORD</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{draft.candidate_name}</span>
            <SourceTag source="verified_profile" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="eyebrow block text-sage-deep">ATTACHED RESUME</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink text-[11px] truncate" title={draft.selected_resume}>
              {draft.selected_resume}
            </span>
            <Link
              href="/resumes"
              className="text-sage-deep hover:text-ink underline text-[11px] shrink-0"
            >
              View in resumes &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Editorial Double Rule */}
      <Divider variant="double" />
    </div>
  );
}
