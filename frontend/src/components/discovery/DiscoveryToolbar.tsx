"use client";

import React from "react";
import { Button } from "@/components/ui";
import { RefreshButton } from "./RefreshButton";
import { SortControl } from "./SortControl";

export interface DiscoveryToolbarProps {
  page: number;
  pageSize: number;
  total: number;
  status: string;
  hasResponse: boolean;
  activeFilterCount: number;
  sort: "default" | "match";
  hasProfile: boolean;
  lastRefreshedAt?: string | null;
  onSortChange: (sort: "default" | "match") => void;
  onToggleMobileFilters: () => void;
  onOpenPrefs: () => void;
  onRefreshComplete: () => void;
}

export function DiscoveryToolbar({
  page,
  pageSize,
  total,
  status,
  hasResponse,
  activeFilterCount,
  sort,
  hasProfile,
  lastRefreshedAt,
  onSortChange,
  onToggleMobileFilters,
  onOpenPrefs,
  onRefreshComplete,
}: DiscoveryToolbarProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const countLabel =
    status === "loading" && !hasResponse
      ? "Scanning..."
      : start > end
      ? `${total} opportunit${total === 1 ? "y" : "ies"}`
      : `${start} to ${end} of ${total}`;

  const liveAnnouncement = `${total} opportunit${total === 1 ? "y" : "ies"}`;

  return (
    <div className="mb-4 flex flex-col justify-between gap-3 border-b border-hairline pb-3 xl:flex-row xl:items-start">
      {/* Result Count and Live Region */}
      <div className="flex min-h-9 flex-wrap items-center gap-3">
        <span className="eyebrow">CATALOG</span>
        <span className="font-mono text-xs font-semibold text-ink">
          {countLabel}
        </span>
        <span className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </span>
        {activeFilterCount > 0 && (
          <span className="text-[11px] text-sage-deep">
            ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active)
          </span>
        )}
      </div>

      {/* Toolbar Actions: Sort, Mobile Filters, Preferences, Refresh */}
      <div className="flex flex-wrap items-start gap-2">
        <SortControl
          value={sort}
          onChange={onSortChange}
          matchDisabled={!hasProfile && status === "ready"}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleMobileFilters}
          className="min-h-9 lg:hidden"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
        <Button variant="quiet" size="sm" className="min-h-9 !text-xs" onClick={onOpenPrefs}>
          Search preferences
        </Button>
        <RefreshButton
          onRefreshComplete={onRefreshComplete}
          lastRefreshedAt={lastRefreshedAt}
        />
      </div>
    </div>
  );
}
