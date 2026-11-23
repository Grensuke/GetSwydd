"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  type AssistedApplication,
  type SubmissionReceipt,
  listAssisted,
  listSubmissions,
} from "@/lib/api";
import { normalizeApplications } from "@/lib/applications/normalize";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { PageContainer } from "@/components/shell";
import { Button, InlineNotice, PageHeader, Skeleton } from "@/components/ui";
import { TrackerSummaryStrip } from "@/components/applications/tracker/TrackerSummaryStrip";
import { TrackerLedger } from "@/components/applications/tracker/TrackerLedger";
import { TrackerBoard } from "@/components/applications/tracker/TrackerBoard";

export default function ApplicationTrackerPage() {
  usePageTitle("Application Tracker");

  return (
    <PageContainer>
      <PageHeader
        title="Applications"
        description="Track drafts, reported submissions, and your personal updates."
      />
      <Suspense fallback={<TrackerSkeleton />}>
        <TrackerContent />
      </Suspense>
    </PageContainer>
  );
}

function TrackerSkeleton() {
  return (
    <div className="space-y-6 pt-2">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function TrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") === "board" ? "board" : "ledger";

  const [assistedList, setAssistedList] = useState<AssistedApplication[] | null>(null);
  const [assistedError, setAssistedError] = useState<string | null>(null);

  const [submissionsList, setSubmissionsList] = useState<SubmissionReceipt[] | null>(null);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const [retryAssistedCount, setRetryAssistedCount] = useState(0);
  const [retrySubmissionsCount, setRetrySubmissionsCount] = useState(0);

  // Parallel fetch: Assisted applications
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    listAssisted(controller.signal)
      .then((data) => {
        if (active) {
          setAssistedList(data);
          setAssistedError(null);
        }
      })
      .catch((err: unknown) => {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setAssistedError(err instanceof Error ? err.message : "Could not load assisted applications.");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryAssistedCount]);

  // Parallel fetch: Test submissions
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    listSubmissions(controller.signal)
      .then((data) => {
        if (active) {
          setSubmissionsList(data);
          setSubmissionsError(null);
        }
      })
      .catch((err: unknown) => {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setSubmissionsError(err instanceof Error ? err.message : "Could not load test submissions.");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [retrySubmissionsCount]);

  const isLoading = assistedList === null && submissionsList === null && !assistedError && !submissionsError;

  if (isLoading) {
    return <TrackerSkeleton />;
  }

  const applications = normalizeApplications(assistedList, submissionsList);

  function handleViewChange(view: "ledger" | "board") {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "board") {
      params.set("view", "board");
    } else {
      params.delete("view");
    }
    const query = params.toString();
    router.replace(`/applications${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Partial failure notices */}
      {assistedError && (
        <InlineNotice variant="attention">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="wrap-anywhere">Assisted applications could not be refreshed ({assistedError}).</span>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setRetryAssistedCount((c) => c + 1)}
            >
              Retry assisted
            </Button>
          </div>
        </InlineNotice>
      )}

      {submissionsError && (
        <InlineNotice variant="attention">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="wrap-anywhere">Test submissions could not be refreshed ({submissionsError}).</span>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setRetrySubmissionsCount((c) => c + 1)}
            >
              Retry submissions
            </Button>
          </div>
        </InlineNotice>
      )}

      {/* Summary Metrics Strip */}
      <TrackerSummaryStrip applications={applications} />

      {/* View Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline pb-3">
        <div
          role="group"
          aria-label="Application tracker view"
          className="inline-flex select-none rounded-lg border border-hairline bg-paper-raised p-0.5 text-xs"
        >
          <button
            type="button"
            aria-pressed={activeView === "ledger"}
            onClick={() => handleViewChange("ledger")}
            className={`min-h-9 cursor-pointer rounded-md px-3 font-medium transition-colors ${
              activeView === "ledger"
                ? "bg-cream text-on-cream font-semibold shadow-[0_1px_0_rgba(43,47,39,0.06)]"
                : "text-sage-deep hover:text-ink hover:bg-paper-raised"
            }`}
          >
            Ledger
          </button>
          <button
            type="button"
            aria-pressed={activeView === "board"}
            onClick={() => handleViewChange("board")}
            className={`min-h-9 cursor-pointer rounded-md px-3 font-medium transition-colors ${
              activeView === "board"
                ? "bg-cream text-on-cream font-semibold shadow-[0_1px_0_rgba(43,47,39,0.06)]"
                : "text-sage-deep hover:text-ink hover:bg-paper-raised"
            }`}
          >
            Board
          </button>
        </div>

        <span className="text-xs tabular-nums text-sage-deep">
          {applications.length} tracked record{applications.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Active View Display */}
      {activeView === "board" ? (
        <TrackerBoard applications={applications} />
      ) : (
        <TrackerLedger applications={applications} />
      )}
    </div>
  );
}
