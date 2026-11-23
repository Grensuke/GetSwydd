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
        <>
          <div className="hidden overflow-hidden rounded-xl border border-hairline bg-paper-raised lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Tracked applications</caption>
              <thead className="border-b border-hairline bg-paper text-xs font-semibold text-ink-soft">
                <tr>
                  <th scope="col" className="w-[26%] px-4 py-3">Role and company</th>
                  <th scope="col" className="w-[16%] px-3 py-3">Resume</th>
                  <th scope="col" className="w-[19%] px-3 py-3">Confirmed status</th>
                  <th scope="col" className="w-[14%] px-3 py-3">Your note</th>
                  <th scope="col" className="w-[11%] px-3 py-3">Updated</th>
                  <th scope="col" className="w-[14%] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {filtered.map((app) => {
                  const confirmedInfo = CONFIRMED_STAGE_MAP[app.confirmedStage];
                  const personal = personalStatuses[app.key];
                  const personalInfo = personal?.stage ? PERSONAL_STAGE_MAP[personal.stage] : null;

                  return (
                    <tr key={app.key} className="align-top transition-colors hover:bg-paper">
                      <td className="px-4 py-4">
                        <Link
                          href={app.links.draft}
                          className="block wrap-anywhere font-medium leading-snug text-ink hover:underline"
                        >
                          {app.jobTitle}
                        </Link>
                        <span className="mt-1 block wrap-anywhere text-xs text-sage-deep">
                          {app.company}
                        </span>
                      </td>

                      <td className="px-3 py-4 wrap-anywhere text-xs text-ink-soft">
                        {app.resume}
                      </td>

                      <td className="space-y-1 px-3 py-4">
                        <Badge tone={confirmedInfo.tone} className="max-w-full whitespace-normal">{confirmedInfo.label}</Badge>
                        <span className="block wrap-anywhere text-xs text-sage-deep">{app.confirmedSource}</span>
                      </td>

                      <td className="px-3 py-4">
                        {personal ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {personalInfo && <Badge tone="outline">{personalInfo.label}</Badge>}
                              <button
                                type="button"
                                onClick={() => setEditingApp(app)}
                                className="cursor-pointer text-xs text-sage-deep underline hover:text-ink"
                              >
                                Edit note
                              </button>
                            </div>
                            {personal.note && (
                              <p className="line-clamp-2 wrap-anywhere text-xs text-ink-soft">
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

                      <td className="px-3 py-4 text-xs text-sage-deep tabular-nums">
                        {formatDate(app.updatedAt)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.map((app) => (
              <TrackerMobileCard
                key={app.key}
                app={app}
                personal={personalStatuses[app.key]}
                onEditNote={setEditingApp}
              />
            ))}
          </div>
        </>
      )}

      <PersonalStatusEditor
        open={Boolean(editingApp)}
        onClose={() => setEditingApp(null)}
        app={editingApp}
      />
    </div>
  );
}
