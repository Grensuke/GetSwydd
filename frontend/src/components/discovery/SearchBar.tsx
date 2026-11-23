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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="search-q" className="eyebrow block mb-1">
            Role or keyword
          </label>
          <Input
            id="search-q"
            type="search"
            placeholder="Python developer, data analyst"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="search-location" className="eyebrow block mb-1">
            Location
          </label>
          <Input
            id="search-location"
            type="search"
            placeholder="Bengaluru, Hyderabad, Pune"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <Button variant="primary" size="md" type="submit">
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
