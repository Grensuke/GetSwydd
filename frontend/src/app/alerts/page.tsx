"use client";

import React, { useCallback, useMemo, useState } from "react";
import { PageContainer } from "@/components/shell";
import { Button, EmptyState, ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui";
import { Pagination } from "@/components/discovery/Pagination";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useAsync } from "@/lib/hooks/useAsync";
import { listAlerts } from "@/lib/api";
import type { JobAlert } from "@/lib/api/types";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { AlertMobileCard, AlertTableRow } from "./alert-rows";

const PAGE_SIZE = 20;

export default function AlertsPage() {
  usePageTitle("Job Alerts");
  const { markRead: contextMarkRead, refresh: refreshContext } = useAlerts();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const fetchAlerts = useCallback(
    async (signal: AbortSignal) => {
      return listAlerts({ unread_only: unreadOnly, limit: 100 }, signal);
    },
    [unreadOnly]
  );

  const { data: alertsList, status, error, reload } = useAsync<JobAlert[]>(
    fetchAlerts,
    [unreadOnly]
  );

  const alerts = useMemo(() => alertsList ?? [], [alertsList]);
  const total = alerts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagedAlerts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return alerts.slice(start, start + PAGE_SIZE);
  }, [alerts, page]);

  const handleMarkRead = async (alertId: string) => {
    try {
      await contextMarkRead(alertId);
      reload();
    } catch {
      // Error handled by context rollback
    }
  };

  const handleToggleFilter = (unread: boolean) => {
    setUnreadOnly(unread);
    setPage(1);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="ALERTS"
        title="New listings that fit your preferences."
        description="Alerts appear when a feed refresh discovers listings you haven't seen before. They strictly respect your saved search keywords and criteria."
      />

      {/* Toolbar: Unread/All segmented control and count */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="inline-flex rounded-md border border-hairline overflow-hidden self-start">
          <button
            type="button"
            onClick={() => handleToggleFilter(false)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors cursor-pointer",
              !unreadOnly ? "bg-cream text-on-cream font-bold" : "bg-paper-raised text-ink-soft hover:bg-cream/40"
            )}
          >
            All alerts
          </button>
          <button
            type="button"
            onClick={() => handleToggleFilter(true)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors cursor-pointer",
              unreadOnly ? "bg-cream text-on-cream font-bold" : "bg-paper-raised text-ink-soft hover:bg-cream/40"
            )}
          >
            Unread only
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-soft">
            {status === "loading" ? "Loading..." : `${total} alert${total === 1 ? "" : "s"}`}
          </span>
          <Button variant="quiet" size="sm" onClick={() => { reload(); refreshContext(); }}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {status === "loading" && (
        <Panel className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-hairline last:border-0">
                <div className="space-y-2 w-1/2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-56" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Error state */}
      {status === "error" && (
        <ErrorState
          title="Could not load alerts"
          message={error || "An error occurred while fetching your alerts."}
          onRetry={reload}
        />
      )}

      {/* Empty state */}
      {status === "ready" && alerts.length === 0 && (
        <EmptyState
          eyebrow="NO ALERTS"
          title={unreadOnly ? "No unread alerts" : "No alerts yet"}
          description={
            unreadOnly
              ? "All your current job alerts have been read."
              : "No alerts yet. Refresh your sources from Discover to look for new listings that fit your preferences."
          }
          action={
            unreadOnly ? (
              <Button variant="secondary" size="sm" onClick={() => handleToggleFilter(false)}>
                Show all alerts
              </Button>
            ) : (
              <Button variant="primary" size="sm" href="/">
                Go to Discover
              </Button>
            )
          }
        />
      )}

      {/* Editorial Ledger */}
      {status === "ready" && alerts.length > 0 && (
        <div>
          <Panel className="p-0 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-hairline text-ink-soft">
                  <tr>
                    <th scope="col" className="px-4 py-3 eyebrow">Company & Role</th>
                    <th scope="col" className="px-4 py-3 eyebrow">Location</th>
                    <th scope="col" className="px-4 py-3 eyebrow">Deadline</th>
                    <th scope="col" className="px-4 py-3 eyebrow">Found</th>
                    <th scope="col" className="px-4 py-3 eyebrow">Status</th>
                    <th scope="col" className="px-4 py-3 eyebrow text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {pagedAlerts.map((alert) => (
                    <AlertTableRow key={alert.id} alert={alert} onMarkRead={handleMarkRead} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden divide-y divide-hairline">
              {pagedAlerts.map((alert) => (
                <AlertMobileCard key={alert.id} alert={alert} onMarkRead={handleMarkRead} />
              ))}
            </div>
          </Panel>

          {totalPages > 1 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}
