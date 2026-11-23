"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { Button, Select } from "@/components/ui";
import { PAGE_SIZE_OPTIONS } from "@/lib/discovery/options";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/**
 * Editorial pagination with page numbers, prev/next buttons, and page size selector.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Build page number range (first, last, current ±1, with ellipses)
  const range: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i);
  } else {
    range.push(1);
    if (page > 3) range.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) range.push(i);
    if (page < totalPages - 2) range.push("...");
    range.push(totalPages);
  }

  const handlePageClick = (p: number) => {
    onPageChange(p);
    // Scroll smoothly to results heading
    const el = document.getElementById("results-heading");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus();
    }
  };

  return (
    <div className={cn("pt-6 space-y-4", className)}>
      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="quiet"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageClick(page - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-sage-deep">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="quiet"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageClick(page + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {range.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-sage-deep select-none"
                  aria-hidden="true"
                >
                  &hellip;
                </span>
              );
            }
            const isCurrent = item === page;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handlePageClick(item)}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  "min-w-[28px] h-7 px-1.5 text-xs font-mono font-semibold rounded-sm transition-colors duration-150 cursor-pointer",
                  isCurrent
                    ? "bg-cream text-on-cream border border-hairline-strong font-bold"
                    : "text-ink-soft hover:text-ink hover:bg-cream/30"
                )}
              >
                {item}
              </button>
            );
          })}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-sage-deep">
            <span>Per page:</span>
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="py-0.5 text-xs w-20"
              aria-label="Select page size"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        )}
      </nav>
    </div>
  );
}
