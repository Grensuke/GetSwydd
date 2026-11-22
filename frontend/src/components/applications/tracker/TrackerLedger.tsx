"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import { CONFIRMED_STAGE_MAP, PERSONAL_STAGE_MAP } from "@/lib/applications/status";
import { useAllPersonalStatuses } from "@/lib/applications/personal-status";
import { Badge, Button, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { PersonalStatusEditor } from "./PersonalStatusEditor";
import { TrackerLedgerFilters } from "./TrackerLedgerFilters";
import { TrackerMobileCard } from "./TrackerMobileCard";

export interface TrackerLedgerProps {
  applications: TrackedApplication[];
}

export function TrackerLedger({ applications }: TrackerLedgerProps) {
  const personalStatuses = useAllPersonalStatuses();
  const [editingApp, setEditingApp] = useState<TrackedApplication | null>(null);

  // Filter state
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (kindFilter !== "all" && app.kind !== kindFilter) return false;
      if (stageFilter !== "all" && app.confirmedStage !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = app.jobTitle.toLowerCase().includes(q);
        const matchCompany = app.company.toLowerCase().includes(q);
        if (!matchTitle && !matchCompany) return false;
      }
      return true;
    });
  }, [applications, kindFilter, stageFilter, searchQuery]);

  const hasActiveFilters = kindFilter !== "all" || stageFilter !== "all" || Boolean(searchQuery.trim());

  function resetFilters() {
    setKindFilter("all");
    setStageFilter("all");
    setSearchQuery("");
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        eyebrow="NO APPLICATIONS"
        title="Nothing tracked yet."
        description="Prepare an application from a job listing to see it in your tracking ledger."
        action={
          <Button variant="secondary" size="sm" href="/">
            Explore Opportunities &rarr;
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <TrackerLedgerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-paper rounded-md border border-hairline space-y-2 text-xs">
          <p className="text-ink font-medium">No applications match your active filters.</p>
          <Button type="button" variant="quiet" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-hairline bg-paper-raised overflow-hidden shadow-[0_1px_0_rgba(43,47,39,0.04)]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-paper border-b border-hairline sticky top-16 z-10 text-[11px] font-semibold uppercase tracking-wider text-sage-deep">
                <tr>
                  <th scope="col" className="py-3 px-4">Company & Role</th>
                  <th scope="col" className="py-3 px-4">Resume</th>
                  <th scope="col" className="py-3 px-4">Confirmed Status</th>
                  <th scope="col" className="py-3 px-4">Your Note</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {filtered.map((app) => {
                  const confirmedInfo = CONFIRMED_STAGE_MAP[app.confirmedStage];
                  const personal = personalStatuses[app.key];
                  const personalInfo = personal?.stage ? PERSONAL_STAGE_MAP[personal.stage] : null;

                  return (
                    <tr key={app.key} className="hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={app.links.draft}
                          className="font-display text-sm font-medium text-ink hover:underline block leading-snug"
                        >
                          {app.jobTitle}
                        </Link>
                        <span className="text-[11px] text-sage-deep block mt-0.5">
                          {app.company}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-ink-soft max-w-[140px] truncate" title={app.resume}>
                        {app.resume}
                      </td>

                      <td className="py-3 px-4 space-y-1">
                        <Badge tone={confirmedInfo.tone}>{confirmedInfo.label}</Badge>
                        <span className="eyebrow block text-[10px] text-sage-deep">{app.confirmedSource}</span>
                      </td>

                      <td className="py-3 px-4">
                        {personal ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {personalInfo && <Badge tone="outline">{personalInfo.label}</Badge>}
                              <button
                                type="button"
                                onClick={() => setEditingApp(app)}
                                className="text-[10px] text-sage-deep hover:text-ink underline cursor-pointer"
                              >
                                Edit note
                              </button>
                            </div>
                            {personal.note && (
                              <p className="text-[11px] text-ink-soft line-clamp-1 italic max-w-xs">
                                &ldquo;{personal.note}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingApp(app)}
                            className="text-xs text-sage-deep hover:text-ink underline cursor-pointer"
                          >
                            + Add note
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-sage-deep whitespace-nowrap">
                        {formatDate(app.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        {app.confirmedStage === "preparing" && (
                          <Link
                            href={app.links.draft}
                            className="text-xs font-semibold text-ink underline hover:text-ink-soft"
                          >
                            Continue draft &rarr;
                          </Link>
                        )}
                        {app.applyUrl && (
                          <a
                            href={app.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sage-deep hover:text-ink underline"
                          >
                            Employer site &nearr;
                          </a>
                        )}
                        {app.kind === "test" && (
                          <Link
                            href={app.links.draft}
                            className="text-xs text-sage-deep hover:text-ink underline"
                          >
                            View receipt
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked View (< 768px) */}
          <div className="md:hidden divide-y divide-hairline">
            {filtered.map((app) => (
              <TrackerMobileCard
                key={app.key}
                app={app}
                personal={personalStatuses[app.key]}
                onEditNote={setEditingApp}
              />
            ))}
          </div>
        </div>
      )}

      <PersonalStatusEditor
        open={Boolean(editingApp)}
        onClose={() => setEditingApp(null)}
        app={editingApp}
      />
    </div>
  );
}
