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
    <div className="p-3 bg-paper rounded-md border border-hairline flex flex-wrap items-center gap-3 text-xs">
      <div className="flex-1 min-w-[180px]">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by company or role..."
          className="text-xs"
        />
      </div>

      <div className="w-36">
        <Select
          value={kindFilter}
          onChange={(e) => onKindFilterChange(e.target.value)}
          className="text-xs"
        >
          <option value="all">All kinds</option>
          <option value="assisted">Assisted only</option>
          <option value="test">Test only</option>
        </Select>
      </div>

      <div className="w-48">
        <Select
          value={stageFilter}
          onChange={(e) => onStageFilterChange(e.target.value)}
          className="text-xs"
        >
          <option value="all">All confirmed stages</option>
          <option value="preparing">Preparing</option>
          <option value="submitted_reported">Submitted (reported)</option>
          <option value="test_submitted">Test submission</option>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="quiet"
          size="sm"
          onClick={onReset}
        >
          Reset filters
        </Button>
      )}
    </div>
  );
}
