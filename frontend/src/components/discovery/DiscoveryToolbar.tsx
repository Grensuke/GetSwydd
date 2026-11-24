"use client";

import React from "react";
import { Button } from "@/components/ui";
import { RefreshButton } from "./RefreshButton";
import { SortControl } from "./SortControl";
import { Bookmark } from "lucide-react";

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
  savedCount?: number;
  showSavedOnly?: boolean;
  onToggleSavedOnly?: () => void;
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
  savedCount = 0,
  showSavedOnly = false,
  onToggleSavedOnly,
  onSortChange,
  onToggleMobileFilters,
  onOpenPrefs,
  onRefreshComplete,
}: DiscoveryToolbarProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const countLabel =
    showSavedOnly
      ? `${savedCount} saved ${savedCount === 1 ? "opportunity" : "opportunities"}`
      : status === "loading" && !hasResponse
      ? "Scanning..."
      : start > end
      ? `${total} opportunit${total === 1 ? "y" : "ies"}`
      : `${start} to ${end} of ${total}`;

  const liveAnnouncement = showSavedOnly
    ? `${savedCount} saved jobs`
    : `${total} opportunit${total === 1 ? "y" : "ies"}`;

  return (
    <div className="mb-4 flex flex-col justify-between gap-3 border-b border-hairline pb-3 xl:flex-row xl:items-start">
      {/* Result Count and Live Region */}
      <div className="flex min-h-9 flex-wrap items-center gap-3">
        <span className="eyebrow">{showSavedOnly ? "SAVED" : "CATALOG"}</span>
        <span className="font-mono text-xs font-semibold text-ink">
          {countLabel}
        </span>
        <span className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </span>
        {!showSavedOnly && activeFilterCount > 0 && (
          <span className="text-[11px] text-sage-deep">
            ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active)
          </span>
        )}
      </div>

      {/* Toolbar Actions: Saved Jobs, Sort, Mobile Filters, Preferences, Refresh */}
      <div className="flex flex-wrap items-start gap-2">
        {onToggleSavedOnly && (
          <Button
            variant={showSavedOnly ? "secondary" : "quiet"}
            size="sm"
            className="min-h-9 !text-xs gap-1.5"
            onClick={onToggleSavedOnly}
          >
            <Bookmark size={13} className={showSavedOnly ? "fill-current" : undefined} aria-hidden="true" />
            <span>Saved ({savedCount})</span>
          </Button>
        )}
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
