"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";
import type { Job } from "@/lib/api/types";

const STORAGE_KEY = "getswydd_saved_jobs_v1";
const EVENT_NAME = "getswydd_saved_jobs_changed";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(STORAGE_KEY) || "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

export function useSavedJobs() {
  const rawString = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const savedJobs = useMemo<Job[]>(() => {
    try {
      const parsed = JSON.parse(rawString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [rawString]);

  const isSaved = useCallback(
    (jobId: string) => {
      return savedJobs.some((j) => j.id === jobId);
    },
    [savedJobs]
  );

  const toggleSave = useCallback(
    (job: Job) => {
      if (typeof window === "undefined") return;
      try {
        const current = [...savedJobs];
        const index = current.findIndex((j) => j.id === job.id);
        let updated: Job[];
        if (index >= 0) {
          updated = current.filter((j) => j.id !== job.id);
        } else {
          updated = [job, ...current];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event(EVENT_NAME));
      } catch (e) {
        console.error("Failed to update saved jobs in localStorage", e);
      }
    },
    [savedJobs]
  );

  return {
    savedJobs,
    savedCount: savedJobs.length,
    isSaved,
    toggleSave,
  };
}
