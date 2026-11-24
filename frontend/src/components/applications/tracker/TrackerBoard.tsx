"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import {
  type ConfirmedStage,
  CONFIRMED_STAGE_MAP,
  type PersonalStage,
  PERSONAL_STAGE_MAP,
} from "@/lib/applications/status";
import {
  setPersonalStatus,
  useAllPersonalStatuses,
} from "@/lib/applications/personal-status";
import { Badge, EmptyState, SourceTag } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { MoveStageMenu } from "./MoveStageMenu";
import { PersonalStatusEditor } from "./PersonalStatusEditor";
import { GripVertical } from "lucide-react";

export interface TrackerBoardProps {
  applications: TrackedApplication[];
}

type BoardColumnKey = ConfirmedStage | PersonalStage;

interface BoardColumnDef {
  key: BoardColumnKey;
  label: string;
  kind: "confirmed" | "personal";
  description: string;
}

export function TrackerBoard({ applications }: TrackerBoardProps) {
  const personalStatuses = useAllPersonalStatuses();
  const [editingApp, setEditingApp] = useState<TrackedApplication | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [draggedAppKey, setDraggedAppKey] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumnKey | null>(null);

  // Define columns in standard recruiting pipeline order
  const columns: BoardColumnDef[] = useMemo(() => {
    return [
      { key: "saved", label: "Saved", kind: "personal", description: "Bookmarked roles" },
      { key: "preparing", label: "Preparing", kind: "confirmed", description: "In preparation" },
      { key: "submitted_reported", label: "Submitted", kind: "confirmed", description: "Employer-confirmed & sent" },
      { key: "assessment", label: "Assessment", kind: "personal", description: "Tests & assignments" },
      { key: "interview", label: "Interview", kind: "personal", description: "Conversations & rounds" },
      { key: "offer", label: "Offer", kind: "personal", description: "Offers received" },
      { key: "rejected", label: "Rejected", kind: "personal", description: "Closed / unfulfilled" },
    ];
  }, []);

  // Group applications into board columns (excluding test submissions, which have their own lane)
  const { columnBuckets, testSubmissions } = useMemo(() => {
    const buckets: Record<string, TrackedApplication[]> = {};
    columns.forEach((c) => {
      buckets[c.key] = [];
    });
    const tests: TrackedApplication[] = [];

    applications.forEach((app) => {
      if (app.kind === "test") {
        tests.push(app);
        return;
      }
      const personal = personalStatuses[app.key];
      if (personal?.stage && buckets[personal.stage]) {
        buckets[personal.stage].push(app);
      } else {
        const stage =
          app.confirmedStage === "submitted_direct" || app.confirmedStage === "submitted_email"
            ? "submitted_reported"
            : app.confirmedStage === "submission_pending"
            ? "preparing"
            : app.confirmedStage;
        buckets[stage]?.push(app);
      }
    });

    return { columnBuckets: buckets, testSubmissions: tests };
  }, [applications, personalStatuses, columns]);

  function handleMove(app: TrackedApplication, nextStage: PersonalStage | null) {
    const prev = personalStatuses[app.key];
    setPersonalStatus(app.key, {
      stage: nextStage,
      note: prev?.note,
      relevantDate: prev?.relevantDate,
    });
    const targetLabel = nextStage ? PERSONAL_STAGE_MAP[nextStage]?.label : "Confirmed stage";
    const msg = `Moved ${app.company}, ${app.jobTitle} to ${targetLabel}`;
    setAnnouncement(msg);
  }

  function handleDragStart(e: React.DragEvent<HTMLElement>, appKey: string) {
    e.dataTransfer.setData("text/plain", appKey);
    e.dataTransfer.effectAllowed = "move";
    setDraggedAppKey(appKey);
  }

  function handleDragEnd() {
    setDraggedAppKey(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, colKey: BoardColumnKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>, colKey: BoardColumnKey) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, col: BoardColumnDef) {
    e.preventDefault();
    const appKey = e.dataTransfer.getData("text/plain") || draggedAppKey;
    setDraggedAppKey(null);
    setDragOverColumn(null);

    if (!appKey) return;
    const targetApp = applications.find((a) => a.key === appKey);
    if (!targetApp) return;

    if (col.kind === "personal") {
      handleMove(targetApp, col.key as PersonalStage);
    } else {
      // Revert to confirmed status by clearing personal override
      handleMove(targetApp, null);
    }
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        eyebrow="NO APPLICATIONS"
        title="Nothing tracked yet."
        description="Prepare an application from a job listing to see your board populate."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen reader live announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Main Board Horizontal Scroll Container */}
      <div
        role="region"
        aria-label="Application stages"
        tabIndex={0}
        className="grid min-w-0 snap-x grid-flow-col auto-cols-[min(16rem,86%)] gap-3 overflow-x-auto pb-3"
      >
        {columns.map((col) => {
          const cards = columnBuckets[col.key] || [];
          const isOverThisCol = dragOverColumn === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col)}
              className={`flex min-w-0 snap-start flex-col gap-3 rounded-xl border p-3 transition-all duration-150 ${
                isOverThisCol
                  ? "border-moss bg-moss-tint/30 ring-2 ring-moss/30 shadow-md"
                  : "border-hairline bg-paper-raised"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-2 border-b border-hairline pb-2">
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs text-ink block">{col.label}</span>
                  <span className="text-[10px] text-sage-deep block">{col.description}</span>
                </div>
                <span className="font-mono text-xs bg-paper px-2 py-0.5 rounded border border-hairline text-ink">
                  {cards.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 min-h-[140px]">
                {cards.length === 0 && !isOverThisCol ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-sage-deep italic border border-dashed border-hairline rounded bg-paper/30">
                    No roles in this stage
                  </div>
                ) : (
                  cards.map((app) => {
                    const personal = personalStatuses[app.key];
                    const confirmedInfo = CONFIRMED_STAGE_MAP[app.confirmedStage];
                    const isPersonalColumn = col.kind === "personal";
                    const isBeingDragged = draggedAppKey === app.key;

                    return (
                      <article
                        key={app.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.key)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 rounded-md border bg-paper space-y-2 text-xs shadow-[0_1px_0_rgba(43,47,39,0.03)] transition-all cursor-grab active:cursor-grabbing ${
                          isBeingDragged
                            ? "opacity-30 border-dashed border-moss ring-1 ring-moss/40"
                            : "border-hairline hover:border-hairline-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="block wrap-anywhere font-medium text-sage-deep">{app.company}</span>
                          <span title="Drag card to move between stages" className="text-sage-deep/50 hover:text-ink shrink-0 pt-0.5">
                            <GripVertical size={13} aria-hidden="true" />
                          </span>
                        </div>

                        <Link
                          href={app.links.draft}
                          className="block wrap-anywhere text-sm font-medium leading-snug text-ink hover:underline"
                        >
                          {app.jobTitle}
                        </Link>

                        {/* Provenance note in personal column */}
                        {isPersonalColumn && (
                          <div className="text-[10px] text-sage-deep border-l border-sage/40 pl-1.5 py-0.5">
                            Confirmed: {confirmedInfo.label}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Badge tone={confirmedInfo.tone} className="max-w-full whitespace-normal">{confirmedInfo.label}</Badge>
                          {personal?.stage && (
                            <Badge tone="outline">{PERSONAL_STAGE_MAP[personal.stage].label}</Badge>
                          )}
                          {personal?.note && (
                            <SourceTag source="personal_note" />
                          )}
                        </div>

                        {personal?.note && (
                          <p className="line-clamp-2 wrap-anywhere rounded border border-hairline bg-paper-raised p-1.5 text-xs text-ink-soft">
                            &ldquo;{personal.note}&rdquo;
                          </p>
                        )}

                        <MoveStageMenu
                          currentPersonalStage={personal?.stage ?? null}
                          onSelectStage={(next) => handleMove(app, next)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2 text-xs text-sage-deep">
                          <span className="min-w-0 wrap-anywhere">
                            {app.resume}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingApp(app)}
                            className="text-ink underline hover:text-ink-soft cursor-pointer text-[11px]"
                          >
                            {personal ? "Edit note" : "+ Note"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}

                {/* Drop placeholder */}
                {isOverThisCol && (
                  <div className="rounded-md border-2 border-dashed border-moss/60 bg-moss-tint/40 p-2 text-center text-xs font-medium text-moss animate-pulse">
                    Drop to move into {col.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Submissions Lane (Quietly Separated) */}
      {testSubmissions.length > 0 && (
        <div className="p-4 rounded-lg border border-hairline bg-paper space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="eyebrow block text-sage-deep">LOCAL SANDBOX</span>
              <h4 className="font-display text-sm font-medium text-ink">
                Test Submissions ({testSubmissions.length})
              </h4>
            </div>
            <span className="text-xs text-sage-deep">Delivered to the demo inbox</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {testSubmissions.map((test) => (
              <div
                key={test.key}
                className="p-3 rounded-md border border-hairline bg-paper-raised text-xs space-y-1"
              >
                <span className="eyebrow block text-sage-deep">{test.company}</span>
                <Link
                  href={test.links.draft}
                  className="block wrap-anywhere font-medium text-ink hover:underline"
                >
                  {test.jobTitle}
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-sage-deep">
                  <span className="font-mono">{formatDate(test.updatedAt)}</span>
                  <Badge tone="neutral">Test Receipt</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PersonalStatusEditor
        open={Boolean(editingApp)}
        onClose={() => setEditingApp(null)}
        app={editingApp}
        onAnnounce={setAnnouncement}
      />
    </div>
  );
}
