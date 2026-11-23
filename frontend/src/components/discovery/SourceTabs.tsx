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
 * Editorial underline style (active = ink text + 2px ink rule; inactive = ink-soft).
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
        className="flex border-b border-hairline overflow-x-auto snap-x scrollbar-none gap-6"
      >
        {SOURCE_OPTIONS.map((opt, idx) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              role="tab"
              type="button"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "pb-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors duration-150 cursor-pointer snap-start shrink-0 relative",
                selected
                  ? "text-ink font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-ink"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-sage-deep italic">
        {currentOption.description}
      </p>
    </div>
  );
}
