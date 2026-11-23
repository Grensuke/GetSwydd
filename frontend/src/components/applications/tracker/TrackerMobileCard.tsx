"use client";

import Link from "next/link";
import React from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import { CONFIRMED_STAGE_MAP, PERSONAL_STAGE_MAP } from "@/lib/applications/status";
import type { PersonalStatusRecord } from "@/lib/applications/personal-status";
import { Badge, SourceTag } from "@/components/ui";
import { formatDate } from "@/lib/format";

export interface TrackerMobileCardProps {
  app: TrackedApplication;
  personal: PersonalStatusRecord | undefined;
  onEditNote: (app: TrackedApplication) => void;
}

export function TrackerMobileCard({ app, personal, onEditNote }: TrackerMobileCardProps) {
  const confirmedInfo = CONFIRMED_STAGE_MAP[app.confirmedStage];
  const personalInfo = personal?.stage ? PERSONAL_STAGE_MAP[personal.stage] : null;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-paper-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-44">
          <span className="block wrap-anywhere text-xs font-medium text-sage-deep">{app.company}</span>
          <Link
            href={app.links.draft}
            className="mt-0.5 block wrap-anywhere text-base font-medium leading-snug text-ink hover:underline"
          >
            {app.jobTitle}
          </Link>
        </div>
        <Badge tone={confirmedInfo.tone} className="max-w-full whitespace-normal">{confirmedInfo.label}</Badge>
      </div>

      <div className="space-y-1 wrap-anywhere text-xs text-sage-deep">
        <p>{app.confirmedSource}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="min-w-0">{app.resume}</span>
          <span className="tabular-nums">{formatDate(app.updatedAt)}</span>
        </div>
      </div>

      {/* Personal note row */}
      <div className="p-2.5 rounded bg-paper border border-hairline/60 space-y-1 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SourceTag source="personal_note" />
            {personalInfo && <Badge tone="outline">{personalInfo.label}</Badge>}
          </div>
          <button
            type="button"
            onClick={() => onEditNote(app)}
            className="text-[11px] text-ink underline cursor-pointer"
          >
            {personal ? "Edit" : "+ Add note"}
          </button>
        </div>
        {personal?.note && (
          <p className="wrap-anywhere text-xs leading-snug text-ink-soft">
            &ldquo;{personal.note}&rdquo;
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-xs">
        {app.confirmedStage === "preparing" && (
          <Link href={app.links.draft} className="font-medium text-ink underline">
            Continue draft &rarr;
          </Link>
        )}
        {app.applyUrl && (
          <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className="text-sage-deep underline">
            Employer site &nearr;
          </a>
        )}
        {app.kind === "test" && (
          <Link href={app.links.draft} className="text-sage-deep underline">
            View receipt
          </Link>
        )}
      </div>
    </article>
  );
}
