"use client";

import React from "react";
import { Badge, Button } from "@/components/ui";
import { titleCaseEnum } from "@/lib/format";
import type { Employment, ExperienceLevel, Workplace } from "@/lib/api/types";
import { CLOSING_OPTIONS } from "@/lib/discovery/options";

export interface ActiveFiltersProps {
  q: string;
  location: string;
  internshipsOnly: boolean;
  workplace: Workplace[];
  employment: Employment[];
  experienceLevel: ExperienceLevel[];
  closingWithinDays: number | null;
  usePreferences: boolean;
  onRemove: (key: string, value?: string) => void;
  onClearAll: () => void;
}

interface FilterChip {
  key: string;
  label: string;
  value?: string;
}

/**
 * Horizontal strip of removable filter badges.
 * Only renders when there are active filters beyond defaults.
 */
export function ActiveFilters({
  q,
  location,
  internshipsOnly,
  workplace,
  employment,
  experienceLevel,
  closingWithinDays,
  usePreferences,
  onRemove,
  onClearAll,
}: ActiveFiltersProps) {
  const chips: FilterChip[] = [];

  if (q) chips.push({ key: "q", label: `"${q}"` });
  if (location) chips.push({ key: "location", label: `Location: ${location}` });
  for (const w of workplace) chips.push({ key: "workplace", label: titleCaseEnum(w), value: w });
  for (const e of employment) chips.push({ key: "employment", label: titleCaseEnum(e), value: e });
  for (const l of experienceLevel) chips.push({ key: "experienceLevel", label: titleCaseEnum(l), value: l });
  if (closingWithinDays !== null) {
    const opt = CLOSING_OPTIONS.find((o) => o.value === closingWithinDays);
    chips.push({ key: "closingWithinDays", label: opt?.label ?? `Within ${closingWithinDays}d` });
  }
  if (internshipsOnly) chips.push({ key: "internshipsOnly", label: "Internships only" });
  if (usePreferences) chips.push({ key: "usePreferences", label: "Saved preferences" });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Active filters">
      {chips.map((chip, i) => (
        <span key={`${chip.key}-${chip.value ?? i}`} role="listitem">
          <Badge tone="neutral" className="gap-1.5">
            {chip.label}
            <button
              type="button"
              onClick={() => onRemove(chip.key, chip.value)}
              className="ml-0.5 text-sage-deep hover:text-ink transition-colors"
              aria-label={`Remove filter: ${chip.label}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </Badge>
        </span>
      ))}
      <Button variant="quiet" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
