"use client";

import React from "react";
import type { Job, JobListParams, JobListResponse } from "@/lib/api/types";
import { Button, EmptyState, ErrorState, Panel, Skeleton } from "@/components/ui";
import { JobCard } from "@/components/jobs/JobCard";
import { DeadlineRadar } from "./DeadlineRadar";
import { Pagination } from "./Pagination";
import { RefreshButton } from "./RefreshButton";
import { cn } from "@/lib/cn";

export interface ResultsRegionProps {
  status: string;
  response: JobListResponse | null;
  jobs: Job[];
  total: number;
  error: string | null;
  page: number;
  pageSize: number;
  activeFilterCount: number;
  source: string;
  market: NonNullable<JobListParams["market"]>;
  isRefetching: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ResultsRegion({
  status,
  response,
  jobs,
  total,
  error,
  page,
  pageSize,
  activeFilterCount,
  source,
  market,
  isRefetching,
  onRetry,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
}: ResultsRegionProps) {
  // Initial loading skeleton (no previous data)
  if (status === "loading" && !response) {
    return (
      <Panel className="divide-y divide-hairline">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-6 first:pt-2 last:pb-2 space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2 w-3/4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-3/5" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-28 shrink-0" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </Panel>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <ErrorState
        title="Could not retrieve job catalog"
        message={error || "An unexpected error occurred while communicating with the API."}
        onRetry={onRetry}
      />
    );
  }

  // Empty state
  if (status === "empty" || (response && jobs.length === 0)) {
    const isLive = source !== "demo";
    if (activeFilterCount > 0) {
      return (
        <EmptyState
          eyebrow="NO MATCHES"
          title="Nothing matches these filters."
          description="Try broadening your search terms or clearing some filters to see more opportunities."
          action={
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Reset filters
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        eyebrow="NO LISTINGS"
        title="No listings yet."
        description={
          isLive
            ? market === "india"
              ? "Refresh the configured job boards or select All locations to broaden your search."
              : "Refresh the configured job boards to import listings."
            : "No demo postings were found."
        }
        action={isLive && <RefreshButton onRefreshComplete={onRetry} />}
      />
    );
  }

  // Ready state: job cards list with keep-previous-data reduced opacity during refetching
  return (
    <div>
      <h2 id="results-heading" tabIndex={-1} className="sr-only">
        Job Opportunities
      </h2>

      <DeadlineRadar jobs={jobs} className="mb-4" />

      <div
        className={cn(
          "transition-opacity duration-150",
          isRefetching && "opacity-60 pointer-events-none"
        )}
        aria-busy={isRefetching}
      >
        <Panel className="p-6">
          <div className="divide-y divide-hairline">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </Panel>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
