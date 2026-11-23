"use client";

import React, { FormEvent } from "react";
import { Button, Input } from "@/components/ui";

export interface SearchBarProps {
  q: string;
  location: string;
  onQChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  className?: string;
}

/**
 * Dual text inputs for keyword and location search.
 * Includes visible labels, Search button, and Clear action when populated.
 */
export function SearchBar({
  q,
  location,
  onQChange,
  onLocationChange,
  onSubmit,
  onClear,
  className,
}: SearchBarProps) {
  const hasValue = Boolean(q || location);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className={className} role="search" aria-label="Job search">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <label htmlFor="search-q" className="eyebrow block mb-1">
            Role or keyword
          </label>
          <Input
            id="search-q"
            type="search"
            className="min-h-10"
            placeholder="e.g. Python developer"
            maxLength={120}
            value={q}
            onChange={(e) => onQChange(e.target.value)}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="search-location" className="eyebrow block mb-1">
            Location
          </label>
          <Input
            id="search-location"
            type="search"
            className="min-h-10"
            placeholder="e.g. Bengaluru"
            maxLength={120}
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
          <Button variant="primary" size="md" type="submit" className="min-h-10">
            Search
          </Button>
          {hasValue && onClear && (
            <Button variant="quiet" size="sm" type="button" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
