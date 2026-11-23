"use client";

import Link from "next/link";
import React, { useCallback, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { refreshJobs } from "@/lib/api";
import type { JobRefreshResult, SourceRefresh } from "@/lib/api/types";
import { formatRelativeDate, titleCaseEnum } from "@/lib/format";

export interface RefreshButtonProps {
  onRefreshComplete?: () => void;
  lastRefreshedAt?: string | null;
  className?: string;
}

/**
 * Unified refresh button that calls POST /api/v1/jobs/refresh.
 * Shows per-source outcomes with counts, errors, and alert notifications.
 */
export function RefreshButton({
  onRefreshComplete,
  lastRefreshedAt,
  className,
}: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobRefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await refreshJobs();
      setResult(res);
      onRefreshComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refresh failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onRefreshComplete]);

  const dismiss = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={loading}
          aria-busy={loading}
        >
          Refresh sources
        </Button>
        {lastRefreshedAt && !loading && (
          <span className="font-mono text-[11px] text-sage-deep hidden sm:inline">
            Updated {formatRelativeDate(lastRefreshedAt)}
          </span>
        )}
      </div>

      {error && (
        <InlineNotice variant="problem" title="Source refresh error" className="mt-2">
          <span>{error}</span>
          <button type="button" onClick={dismiss} className="ml-2 underline text-xs">
            Dismiss
          </button>
        </InlineNotice>
      )}

      {result && (
        <div className="mt-3 p-3 bg-paper-raised border border-hairline rounded-md text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">FEED REFRESH RESULTS</span>
            <button
              type="button"
              onClick={dismiss}
              className="text-sage-deep hover:text-ink underline text-[11px]"
            >
              Dismiss
            </button>
          </div>

          <ul className="divide-y divide-hairline">
            {result.sources.map((s: SourceRefresh) => (
              <li
                key={`${s.source}-${s.board}`}
                className="py-1 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{titleCaseEnum(s.source)}</span>
                  <span className="text-sage-deep font-mono">({s.board})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      s.status === "failed"
                        ? "text-brick font-medium"
                        : s.status === "refreshed"
                        ? "text-moss font-medium"
                        : "text-sage-deep"
                    }
                  >
                    {s.status === "failed" ? "Could not be reached" : titleCaseEnum(s.status)}
                  </span>
                  <span className="font-mono text-ink-soft">{s.count} listings</span>
                </div>
              </li>
            ))}
          </ul>

          {result.new_alerts > 0 ? (
            <p className="pt-1 text-ink font-medium">
              <Link href="/alerts" className="underline hover:text-ink-soft">
                {result.new_alerts} new alert{result.new_alerts === 1 ? "" : "s"} discovered
              </Link>
              .
            </p>
          ) : (
            <p className="pt-1 text-sage-deep text-[11px]">No new alerts discovered.</p>
          )}
        </div>
      )}
    </div>
  );
}
