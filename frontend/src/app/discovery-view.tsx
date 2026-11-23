"use client";

import React, { useCallback, useMemo, useState } from "react";
import { listJobs } from "@/lib/api";
import type { JobListResponse, Workplace } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/useAsync";
import { useDiscoveryParams, toApiParams } from "@/lib/discovery";
import { Panel, Select } from "@/components/ui";
import {
  SourceTabs,
  SearchBar,
  FilterPanel,
  ActiveFilters,
  PreferencesDrawer,
} from "@/components/discovery";
import { DiscoveryToolbar } from "@/components/discovery/DiscoveryToolbar";
import { AgentDiscovery } from "@/components/discovery/AgentDiscovery";
import { ResultsRegion } from "@/components/discovery/ResultsRegion";
import { MobileFilterSheet } from "@/components/discovery/MobileFilterSheet";

export function DiscoveryView() {
  const {
    params,
    draftQ,
    draftLocation,
    setParam,
    setPage,
    setTextDebounced,
    commitSearchImmediately,
    clearSearch,
    resetFilters,
    activeFilterCount,
  } = useDiscoveryParams();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);

  const apiParams = useMemo(() => toApiParams(params), [params]);
  const fetchJobs = useCallback(
    (signal: AbortSignal) => listJobs(apiParams, signal),
    [apiParams]
  );

  const {
    data: response,
    status,
    error,
    reload,
    isRefetching,
  } = useAsync<JobListResponse>(fetchJobs, [apiParams], { keepPreviousData: true });

  const jobs = useMemo(() => response?.jobs ?? [], [response]);
  const total = response?.total ?? 0;

  const hasProfile = useMemo(() => jobs.some((j) => j.match?.has_confirmed_profile), [jobs]);

  // Derive most recent source_fetched_at across visible jobs
  const lastRefreshedAt = useMemo(() => {
    let latest: string | null = null;
    for (const job of jobs) {
      if (job.source_fetched_at && (!latest || job.source_fetched_at > latest)) {
        latest = job.source_fetched_at;
      }
    }
    return latest;
  }, [jobs]);

  const handleRemoveFilter = useCallback(
    (key: string, value?: string) => {
      if (key === "q") setParam("q", "");
      else if (key === "location") setParam("location", "");
      else if (key === "workplace") setParam("workplace", params.workplace.filter((w) => w !== value));
      else if (key === "employment") setParam("employment", params.employment.filter((e) => e !== value));
      else if (key === "experienceLevel") setParam("experienceLevel", params.experienceLevel.filter((l) => l !== value));
      else if (key === "closingWithinDays") setParam("closingWithinDays", null);
      else if (key === "internshipsOnly") setParam("internshipsOnly", false);
      else if (key === "usePreferences") setParam("usePreferences", false);
    },
    [params, setParam]
  );

  return (
    <div>
      <AgentDiscovery onSourcesRefreshed={reload} />
      <SourceTabs
        value={params.source}
        onChange={(s) => setParam("source", s)}
        className="mb-4"
      />

      {params.source !== "demo" && (
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="discovery-market" className="eyebrow">Job market</label>
          <Select
            id="discovery-market"
            className="max-w-60"
            value={params.market}
            onChange={(event) => setParam("market", event.currentTarget.value === "all" ? "all" : "india")}
          >
            <option value="india">India and worldwide remote</option>
            <option value="all">All locations</option>
          </Select>
        </div>
      )}

      <SearchBar
        q={draftQ}
        location={draftLocation}
        onQChange={(v) => setTextDebounced("q", v)}
        onLocationChange={(v) => setTextDebounced("location", v)}
        onSubmit={commitSearchImmediately}
        onClear={clearSearch}
        className="mb-4"
      />

      <DiscoveryToolbar
        page={params.page}
        pageSize={params.pageSize}
        total={total}
        status={status}
        hasResponse={!!response}
        activeFilterCount={activeFilterCount}
        sort={params.sort}
        hasProfile={hasProfile}
        lastRefreshedAt={lastRefreshedAt}
        onSortChange={(s) => setParam("sort", s)}
        onToggleMobileFilters={() => setMobileFilters((p) => !p)}
        onOpenPrefs={() => setPrefsOpen(true)}
        onRefreshComplete={reload}
      />

      <ActiveFilters
        q={params.q}
        location={params.location}
        internshipsOnly={params.internshipsOnly}
        workplace={params.workplace}
        employment={params.employment}
        experienceLevel={params.experienceLevel}
        closingWithinDays={params.closingWithinDays}
        usePreferences={params.usePreferences}
        onRemove={handleRemoveFilter}
        onClearAll={resetFilters}
      />

      <div className="mt-4 flex gap-6">
        <aside className="hidden lg:block w-[260px] shrink-0">
          <Panel className="sticky top-24">
            <FilterPanel
              workplace={params.workplace}
              employment={params.employment}
              experienceLevel={params.experienceLevel}
              closingWithinDays={params.closingWithinDays}
              internshipsOnly={params.internshipsOnly}
              usePreferences={params.usePreferences}
              onWorkplaceChange={(v: Workplace[]) => setParam("workplace", v)}
              onEmploymentChange={(v) => setParam("employment", v)}
              onExperienceLevelChange={(v) => setParam("experienceLevel", v)}
              onClosingChange={(v) => setParam("closingWithinDays", v)}
              onInternshipsOnlyChange={(v) => setParam("internshipsOnly", v)}
              onUsePreferencesChange={(v) => setParam("usePreferences", v)}
              onReset={resetFilters}
              isResetDisabled={activeFilterCount === 0}
            />
          </Panel>
        </aside>

        <main className="flex-1 min-w-0">
          <ResultsRegion
            status={status}
            response={response}
            jobs={jobs}
            total={total}
            error={error}
            page={params.page}
            pageSize={params.pageSize}
            activeFilterCount={activeFilterCount}
            source={params.source}
            market={params.market}
            isRefetching={isRefetching}
            onRetry={reload}
            onClearFilters={resetFilters}
            onPageChange={setPage}
            onPageSizeChange={(sz) => setParam("pageSize", sz)}
          />
        </main>
      </div>

      <MobileFilterSheet
        open={mobileFilters}
        params={params}
        onClose={() => setMobileFilters(false)}
        setParam={setParam}
      />

      <PreferencesDrawer
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onSavedPreferences={() => {
          if (params.usePreferences) reload();
        }}
      />
    </div>
  );
}
