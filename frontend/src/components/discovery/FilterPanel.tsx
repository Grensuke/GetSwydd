"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { Button, Checkbox, Field, Select } from "@/components/ui";
import type { Employment, ExperienceLevel, Workplace } from "@/lib/api/types";
import {
  CLOSING_OPTIONS,
  EMPLOYMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  WORKPLACE_OPTIONS,
} from "@/lib/discovery/options";

export interface FilterPanelProps {
  workplace: Workplace[];
  employment: Employment[];
  experienceLevel: ExperienceLevel[];
  closingWithinDays: number | null;
  internshipsOnly: boolean;
  usePreferences: boolean;
  onWorkplaceChange: (v: Workplace[]) => void;
  onEmploymentChange: (v: Employment[]) => void;
  onExperienceLevelChange: (v: ExperienceLevel[]) => void;
  onClosingChange: (v: number | null) => void;
  onInternshipsOnlyChange: (v: boolean) => void;
  onUsePreferencesChange: (v: boolean) => void;
  onReset?: () => void;
  isResetDisabled?: boolean;
  className?: string;
}

function CatalogFilter<T extends string>({
  label,
  placeholder,
  options,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: { value: T; label: string }[];
  value?: T;
  disabled?: boolean;
  onChange: (values: T[]) => void;
}) {
  return (
    <Field label={label}>
      {({ id }) => (
        <Select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          className="min-h-9 disabled:opacity-60"
          onChange={(event) => {
            const option = options.find(({ value }) => value === event.currentTarget.value);
            onChange(option ? [option.value] : []);
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/**
 * Filter controls for discovery.
 * Disables employment types when internships-only is active.
 * Explains preference merge behavior (explicit filters take precedence).
 */
export function FilterPanel({
  workplace,
  employment,
  experienceLevel,
  closingWithinDays,
  internshipsOnly,
  usePreferences,
  onWorkplaceChange,
  onEmploymentChange,
  onExperienceLevelChange,
  onClosingChange,
  onInternshipsOnlyChange,
  onUsePreferencesChange,
  onReset,
  isResetDisabled = true,
  className,
}: FilterPanelProps) {
  return (
    <div className={cn("space-y-4 text-sm", className)}>
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <span className="font-medium text-ink">Refine results</span>
        {onReset && (
          <Button
            variant="quiet"
            size="sm"
            onClick={onReset}
            disabled={isResetDisabled}
            className="text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      <CatalogFilter
        label="Workplace"
        placeholder="Any workplace"
        options={WORKPLACE_OPTIONS}
        value={workplace[0]}
        onChange={onWorkplaceChange}
      />
      <CatalogFilter
        label="Employment type"
        placeholder="Any employment type"
        options={EMPLOYMENT_OPTIONS}
        value={internshipsOnly ? "internship" : employment[0]}
        disabled={internshipsOnly}
        onChange={onEmploymentChange}
      />
      <div>
        <Checkbox
          label="Internships only"
          checked={internshipsOnly}
          onChange={(e) => onInternshipsOnlyChange(e.target.checked)}
        />
      </div>

      <CatalogFilter
        label="Experience level"
        placeholder="Any experience level"
        options={EXPERIENCE_OPTIONS}
        value={experienceLevel[0]}
        onChange={onExperienceLevelChange}
      />

      <Field label="Closing deadline">
        {({ id }) => (
          <Select
            id={id}
            className="min-h-9"
            value={closingWithinDays ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onClosingChange(val ? parseInt(val, 10) : null);
            }}
          >
            <option value="">Any time</option>
            {CLOSING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="border-t border-hairline pt-3 space-y-2">
        <Checkbox
          label="Use saved preferences"
          hint="Include your saved roles, locations, and pay preferences."
          checked={usePreferences}
          onChange={(e) => onUsePreferencesChange(e.target.checked)}
        />
      </div>
    </div>
  );
}
