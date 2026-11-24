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
import { JobCard } from "@/components/jobs/JobCard";
import { useSavedJobs } from "@/lib/hooks/useSavedJobs";

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
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const { savedJobs, savedCount } = useSavedJobs();

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
      <section id="job-catalog" aria-labelledby="catalog-title" className="scroll-mt-5">
        <h2 id="catalog-title" className="mb-4 text-2xl sm:text-3xl">Browse jobs</h2>
        <Panel className="mb-4 grid gap-4 sm:mb-5">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <SourceTabs
              value={params.source}
              onChange={(s) => setParam("source", s)}
              className="min-w-0"
            />

            {params.source !== "demo" && (
              <div className="grid w-full gap-1.5 sm:w-64 xl:shrink-0">
                <label htmlFor="discovery-market" className="eyebrow">Job market</label>
                <Select
                  id="discovery-market"
                  className="min-h-10"
                  value={params.market}
                  onChange={(event) => setParam("market", event.currentTarget.value === "all" ? "all" : "india")}
                >
                  <option value="india">India and worldwide remote</option>
                  <option value="all">All locations</option>
                </Select>
              </div>
            )}
          </div>

          <SearchBar
            q={draftQ}
            location={draftLocation}
            onQChange={(v) => setTextDebounced("q", v)}
            onLocationChange={(v) => setTextDebounced("location", v)}
            onSubmit={commitSearchImmediately}
            onClear={clearSearch}
          />
        </Panel>

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
          savedCount={savedCount}
          showSavedOnly={showSavedOnly}
          onToggleSavedOnly={() => setShowSavedOnly((s) => !s)}
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

        <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)]">
          <aside aria-label="Job filters" className="hidden min-w-0 lg:block">
            <Panel className="sticky top-5 max-h-[calc(100dvh-2.5rem)] overflow-y-auto">
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

          <div id="catalog-results" role="tabpanel" aria-labelledby={`source-tab-${params.source}`} className="min-w-0">
            {showSavedOnly ? (
              savedJobs.length === 0 ? (
                <Panel className="p-8 text-center space-y-2">
                  <p className="font-display text-lg text-ink font-medium">No saved opportunities yet</p>
                  <p className="text-xs text-sage-deep">
                    Click the bookmark icon on any job card to save it for quick reference later.
                  </p>
                </Panel>
              ) : (
                <div className="space-y-4">
                  {savedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )
            ) : (
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
            )}
          </div>
        </div>
      </section>

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
