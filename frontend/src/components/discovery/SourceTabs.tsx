"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { SOURCE_OPTIONS, type SourceValue } from "@/lib/discovery/options";

export interface SourceTabsProps {
  value: SourceValue;
  onChange: (source: SourceValue) => void;
  className?: string;
}

/**
 * Accessible tablist for switching job source.
 * Roving tabindex and explanatory label per selection.
 */
export function SourceTabs({ value, onChange, className }: SourceTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const count = SOURCE_OPTIONS.length;
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (idx + 1) % count;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (idx - 1 + count) % count;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = count - 1;
    } else {
      return;
    }
    const container = e.currentTarget.parentElement;
    const btn = container?.children[next] as HTMLElement | undefined;
    btn?.focus();
    onChange(SOURCE_OPTIONS[next].value);
  };

  const currentOption = SOURCE_OPTIONS.find((s) => s.value === value) || SOURCE_OPTIONS[0];

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="tablist"
        aria-label="Job source"
        className="inline-flex max-w-full snap-x gap-1 overflow-x-auto rounded-lg border border-hairline bg-paper p-1"
      >
        {SOURCE_OPTIONS.map((opt, idx) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              id={`source-tab-${opt.value}`}
              role="tab"
              type="button"
              aria-controls="catalog-results"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "min-h-8 shrink-0 snap-start cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-offset-[-2px] sm:px-3",
                selected
                  ? "bg-moss-tint text-moss"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-sage-deep">
        {currentOption.description}
      </p>
    </div>
  );
}
