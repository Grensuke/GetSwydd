"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { listAlerts, markAlertRead } from "@/lib/api";
import type { JobAlert } from "@/lib/api/types";

export interface AlertsContextValue {
  alerts: JobAlert[];
  unreadCount: number;
  isCountCapped: boolean;
  loading: boolean;
  error: string | null;
  markRead: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const UNREAD_LIMIT = 21; // Cap at 20+
const POLL_INTERVAL_MS = 60_000;

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isCountCapped, setIsCountCapped] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fetch up to 21 unread alerts to derive unread count (displays "20+" if capped)
      const unreadList = await listAlerts({ unread_only: true, limit: UNREAD_LIMIT }, controller.signal);
      const isCapped = unreadList.length >= UNREAD_LIMIT;
      setIsCountCapped(isCapped);
      setUnreadCount(isCapped ? 20 : unreadList.length);

      // Also store the most recent alerts for the popover
      setAlerts(unreadList);
      setError(null);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Could not fetch job alerts.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Optimistic mark read with rollback on failure
  const markRead = useCallback(
    async (alertId: string) => {
      // Find previous state for rollback
      const prevAlerts = [...alerts];
      const prevCount = unreadCount;
      const target = alerts.find((a) => a.id === alertId);

      // Optimistically update
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a))
      );
      if (target && !target.read_at && unreadCount > 0) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      try {
        await markAlertRead(alertId);
      } catch (err) {
        // Rollback on failure
        setAlerts(prevAlerts);
        setUnreadCount(prevCount);
        throw err;
      }
    },
    [alerts, unreadCount]
  );

  useEffect(() => {
    queueMicrotask(() => {
      fetchAlerts();
    });

    function onFocusOrVisible() {
      if (document.visibilityState === "visible") {
        fetchAlerts();
      }
    }

    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAlerts();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAlerts]);

  const value: AlertsContextValue = {
    alerts,
    unreadCount,
    isCountCapped,
    loading,
    error,
    markRead,
    refresh: fetchAlerts,
  };

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return ctx;
}
