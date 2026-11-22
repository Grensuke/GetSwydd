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
        eyebrow="APPLICATIONS"
        title="A clear record of what was sent, and what wasn't."
        description="Track both confirmed backend submissions and assisted application drafts, augmented with your private personal notes."
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
          <div className="flex items-center justify-between gap-3">
            <span>Assisted applications could not be refreshed ({assistedError}).</span>
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
          <div className="flex items-center justify-between gap-3">
            <span>Test submissions could not be refreshed ({submissionsError}).</span>
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
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div
          role="tablist"
          aria-label="Tracker view modes"
          className="inline-flex rounded-md border border-hairline bg-paper p-0.5 text-xs select-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "ledger"}
            onClick={() => handleViewChange("ledger")}
            className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
              activeView === "ledger"
                ? "bg-cream text-[var(--color-on-cream,#2B2F27)] font-semibold shadow-[0_1px_0_rgba(43,47,39,0.06)]"
                : "text-sage-deep hover:text-ink hover:bg-paper-raised"
            }`}
          >
            Ledger View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "board"}
            onClick={() => handleViewChange("board")}
            className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
              activeView === "board"
                ? "bg-cream text-[var(--color-on-cream,#2B2F27)] font-semibold shadow-[0_1px_0_rgba(43,47,39,0.06)]"
                : "text-sage-deep hover:text-ink hover:bg-paper-raised"
            }`}
          >
            Board View
          </button>
        </div>

        <span className="font-mono text-xs text-sage-deep">
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
