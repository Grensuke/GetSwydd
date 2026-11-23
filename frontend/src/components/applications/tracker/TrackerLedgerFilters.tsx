"use client";

import React from "react";
import { Button, Input, Select } from "@/components/ui";

export interface TrackerLedgerFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  kindFilter: string;
  onKindFilterChange: (val: string) => void;
  stageFilter: string;
  onStageFilterChange: (val: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function TrackerLedgerFilters({
  searchQuery,
  onSearchChange,
  kindFilter,
  onKindFilterChange,
  stageFilter,
  onStageFilterChange,
  onReset,
  hasActiveFilters,
}: TrackerLedgerFiltersProps) {
  return (
    <div role="search" aria-label="Filter applications" className="grid min-w-0 gap-3 rounded-xl border border-hairline bg-paper-raised p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_11.5rem_auto]">
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <Input
          type="search"
          aria-label="Search by company or role"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by company or role..."
          className="min-h-10"
        />
      </div>

      <div className="min-w-0">
        <Select
          aria-label="Application kind"
          value={kindFilter}
          onChange={(e) => onKindFilterChange(e.target.value)}
          className="min-h-10"
        >
          <option value="all">All kinds</option>
          <option value="assisted">Assisted only</option>
          <option value="test">Test only</option>
        </Select>
      </div>

      <div className="min-w-0">
        <Select
          aria-label="Confirmed stage"
          value={stageFilter}
          onChange={(e) => onStageFilterChange(e.target.value)}
          className="min-h-10"
        >
          <option value="all">All confirmed stages</option>
          <option value="preparing">Preparing</option>
          <option value="submitted_reported">Submitted (reported)</option>
          <option value="submitted_direct">Employer confirmed</option>
          <option value="submission_pending">Confirmation pending</option>
          <option value="test_submitted">Test submission</option>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="min-h-10 justify-self-start sm:col-span-2 lg:col-span-1"
          onClick={onReset}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}
