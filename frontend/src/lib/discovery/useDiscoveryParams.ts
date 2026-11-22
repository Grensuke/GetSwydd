"use client";

/**
 * Hook for URL-synced discovery state.
 * Uses router.replace with { scroll: false } for typing and filter changes,
 * and router.push for page changes so pagination preserves history while filter edits don't flood it.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PARAMS,
  type DiscoveryParams,
  parseSearchParams,
  toSearchParams,
} from "./params";

const DEBOUNCE_MS = 350;

export function useDiscoveryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  // Debounced text state for q and location
  const [draftQ, setDraftQ] = useState(params.q);
  const [draftLocation, setDraftLocation] = useState(params.location);
  const [prevQ, setPrevQ] = useState(params.q);
  const [prevLocation, setPrevLocation] = useState(params.location);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft state when URL params change (e.g. back/forward navigation or external reset)
  if (params.q !== prevQ) {
    setPrevQ(params.q);
    setDraftQ(params.q);
  }
  if (params.location !== prevLocation) {
    setPrevLocation(params.location);
    setDraftLocation(params.location);
  }

  // Replace URL for filter/search/sort changes (does not flood history)
  const replaceParams = useCallback(
    (next: DiscoveryParams) => {
      const sp = toSearchParams(next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  // Push URL for page changes (allows back/forward through pages)
  const pushParams = useCallback(
    (next: DiscoveryParams) => {
      const sp = toSearchParams(next);
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const setParam = useCallback(
    <K extends keyof DiscoveryParams>(key: K, value: DiscoveryParams[K]) => {
      const next = { ...params, [key]: value, page: 1 };
      replaceParams(next);
    },
    [params, replaceParams]
  );

  const setParams = useCallback(
    (updates: Partial<DiscoveryParams>) => {
      const next = { ...params, ...updates, page: 1 };
      replaceParams(next);
    },
    [params, replaceParams]
  );

  const setPage = useCallback(
    (page: number) => {
      pushParams({ ...params, page });
    },
    [params, pushParams]
  );

  const setTextDebounced = useCallback(
    (key: "q" | "location", value: string) => {
      if (key === "q") setDraftQ(value);
      else setDraftLocation(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = { ...params, [key]: value, page: 1 };
        replaceParams(next);
      }, DEBOUNCE_MS);
    },
    [params, replaceParams]
  );

  const commitSearchImmediately = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    replaceParams({ ...params, q: draftQ, location: draftLocation, page: 1 });
  }, [params, draftQ, draftLocation, replaceParams]);

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftQ("");
    setDraftLocation("");
    replaceParams({ ...params, q: "", location: "", page: 1 });
  }, [params, replaceParams]);

  const resetFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftQ("");
    setDraftLocation("");
    replaceParams({ ...DEFAULT_PARAMS, source: params.source });
  }, [params.source, replaceParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (params.q) count++;
    if (params.location) count++;
    if (params.internshipsOnly) count++;
    count += params.workplace.length;
    count += params.employment.length;
    count += params.experienceLevel.length;
    if (params.closingWithinDays !== null) count++;
    if (params.usePreferences) count++;
    return count;
  }, [params]);

  return {
    params,
    draftQ,
    draftLocation,
    setParam,
    setParams,
    setPage,
    setTextDebounced,
    commitSearchImmediately,
    clearSearch,
    resetFilters,
    activeFilterCount,
  };
}
