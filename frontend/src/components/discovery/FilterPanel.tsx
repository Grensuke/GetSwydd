"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { Button, Checkbox, Select } from "@/components/ui";
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

function CheckboxGroup<T extends string>({
  label,
  options,
  selected,
  disabled = false,
  disabledHint,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  disabled?: boolean;
  disabledHint?: string;
  onChange: (values: T[]) => void;
}) {
  return (
    <fieldset className={cn("space-y-2", disabled && "opacity-50 pointer-events-none")}>
      <legend className="eyebrow mb-1.5">{label}</legend>
      {disabledHint && <p className="text-[11px] text-sage-deep mb-1">{disabledHint}</p>}
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <Checkbox
            key={opt.value}
            label={opt.label}
            checked={checked}
            disabled={disabled}
            onChange={() => {
              onChange(
                checked
                  ? selected.filter((v) => v !== opt.value)
                  : [...selected, opt.value]
              );
            }}
          />
        );
      })}
    </fieldset>
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
    <div className={cn("space-y-5 text-sm", className)}>
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <span className="eyebrow">REFINE RESULTS</span>
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

      <CheckboxGroup
        label="WORKPLACE"
        options={WORKPLACE_OPTIONS}
        selected={workplace}
        onChange={onWorkplaceChange}
      />

      <div className="border-t border-hairline pt-3">
        <Checkbox
          label="Internships only"
          checked={internshipsOnly}
          onChange={(e) => onInternshipsOnlyChange(e.target.checked)}
        />
      </div>

      <div className="border-t border-hairline pt-3">
        <CheckboxGroup
          label="EMPLOYMENT TYPE"
          options={EMPLOYMENT_OPTIONS}
          selected={employment}
          disabled={internshipsOnly}
          disabledHint={internshipsOnly ? "Disabled because 'Internships only' is checked." : undefined}
          onChange={onEmploymentChange}
        />
      </div>

      <div className="border-t border-hairline pt-3">
        <CheckboxGroup
          label="EXPERIENCE LEVEL"
          options={EXPERIENCE_OPTIONS}
          selected={experienceLevel}
          onChange={onExperienceLevelChange}
        />
      </div>

      <div className="border-t border-hairline pt-3 space-y-1.5">
        <label htmlFor="closing-filter" className="eyebrow block">
          CLOSING DEADLINE
        </label>
        <Select
          id="closing-filter"
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
      </div>

      <div className="border-t border-hairline pt-3 space-y-2">
        <Checkbox
          label="Use saved preferences"
          hint="Explicit workplace and level filters take precedence; saved role keywords, locations, and pay floors are merged."
          checked={usePreferences}
          onChange={(e) => onUsePreferencesChange(e.target.checked)}
        />
      </div>
    </div>
  );
}
