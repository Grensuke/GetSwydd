"use client";

import Link from "next/link";
import React from "react";
import { cn } from "@/lib/cn";

export interface SortControlProps {
  value: "default" | "match";
  onChange: (sort: "default" | "match") => void;
  matchDisabled?: boolean;
  matchDisabledReason?: string;
  className?: string;
}

/**
 * Segmented control for sort order: Default order / Best match.
 * If matchDisabled, shows explanation with link to /resumes.
 */
export function SortControl({
  value,
  onChange,
  matchDisabled = false,
  className,
}: SortControlProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label="Sort order"
        className="inline-flex rounded-md border border-hairline overflow-hidden self-start"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === "default"}
          onClick={() => onChange("default")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors duration-150 cursor-pointer",
            value === "default"
              ? "bg-cream text-ink font-bold"
              : "bg-paper-raised text-ink-soft hover:text-ink hover:bg-cream/40"
          )}
        >
          Default order
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === "match"}
          disabled={matchDisabled}
          onClick={() => !matchDisabled && onChange("match")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors duration-150",
            value === "match"
              ? "bg-cream text-ink font-bold"
              : "bg-paper-raised text-ink-soft hover:text-ink hover:bg-cream/40",
            matchDisabled && "opacity-40 cursor-not-allowed hover:bg-paper-raised"
          )}
        >
          Best match
        </button>
      </div>

      {matchDisabled && (
        <span className="text-[11px] text-sage-deep">
          <Link href="/resumes" className="underline hover:text-ink">
            Confirm a resume
          </Link>{" "}
          to rank by match
        </span>
      )}
    </div>
  );
}
