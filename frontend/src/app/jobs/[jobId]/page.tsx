"use client";

import React, { use, useCallback, useState } from "react";
import { PageContainer } from "@/components/shell";
import { Button, EmptyState, Panel, Skeleton } from "@/components/ui";
import { analyzeJob } from "@/lib/api";
import type { JobAnalysis } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/useAsync";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { AnalysisHeader } from "@/components/analysis/AnalysisHeader";
import { AnalysisAside } from "@/components/analysis/AnalysisAside";
import { EligibilitySection } from "@/components/analysis/EligibilitySection";
import { SkillsCoverageSection } from "@/components/analysis/SkillsCoverageSection";
import { SemanticSection } from "@/components/analysis/SemanticSection";
import { RoleDescriptionSection } from "@/components/analysis/RoleDescriptionSection";

export default function JobAnalysisPage({
  params: paramsPromise,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(paramsPromise);
  const decodedId = decodeURIComponent(jobId);

  const [useSemantic, setUseSemantic] = useState(false);

  const fetchAnalysis = useCallback(
    async (signal: AbortSignal) => {
      return analyzeJob(decodedId, { use_semantic: useSemantic }, signal);
    },
    [decodedId, useSemantic]
  );

  const {
    data: analysis,
    status,
    error,
    reload,
    isRefetching,
  } = useAsync<JobAnalysis>(fetchAnalysis, [decodedId, useSemantic], {
    keepPreviousData: true,
  });

  const job = analysis?.job;
  usePageTitle(job ? `${job.title} at ${job.company}` : "Job Analysis");

  // Initial loading skeleton
  if (status === "loading" && !analysis) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
            <div className="space-y-6">
              <Panel className="p-6 space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-20 w-full" />
              </Panel>
              <Panel className="p-6 space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-32 w-full" />
              </Panel>
            </div>
            <div>
              <Panel className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
              </Panel>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Error state or listing not found (e.g. 404 from backend)
  if (status === "error" || (status === "ready" && !analysis)) {
    return (
      <PageContainer>
        <EmptyState
          eyebrow="LISTING UNAVAILABLE"
          title="This listing is no longer available."
          description={error || "Listings can disappear after a live source refresh. Check back in Discover for newer postings."}
          action={
            <div className="flex items-center justify-center gap-3">
              <Button variant="primary" size="sm" href="/">
                Back to Discover
              </Button>
              <Button variant="secondary" size="sm" onClick={reload}>
                Retry analysis
              </Button>
            </div>
          }
        />
      </PageContainer>
    );
  }

  if (!job) return null;

  return (
    <PageContainer>
      <div
        className={isRefetching ? "opacity-60 transition-opacity duration-150" : undefined}
        aria-busy={isRefetching}
      >
        <AnalysisHeader job={job} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Main Column */}
          <main className="space-y-8 min-w-0">
            {/* 1. Summary Section */}
            <Panel eyebrow="SUMMARY" title="Suitability overview" className="space-y-3">
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line font-sans">
                {analysis.summary}
              </p>
              <p className="text-xs text-sage-deep italic pt-2 border-t border-hairline">
                This is an estimate of suitability based on facts you&apos;ve confirmed. It is not a prediction of hiring outcomes.
              </p>
            </Panel>

            {/* Stated Eligibility if present */}
            {job.eligibility && (
              <Panel eyebrow="STATED ELIGIBILITY" title="Employer criteria">
                <p className="text-xs text-ink leading-relaxed">{job.eligibility}</p>
              </Panel>
            )}

            {/* 2. Eligibility & Requirements breakdown */}
            <EligibilitySection match={job.match} />

            {/* 3. Skills Coverage & Best-fit resume */}
            <SkillsCoverageSection match={job.match} />

            {/* 4. AI Semantic Comparison */}
            <SemanticSection
              analysis={analysis}
              useSemantic={useSemantic}
              onToggleSemantic={(enabled) => setUseSemantic(enabled)}
              onRetry={reload}
              loading={isRefetching}
            />

            {/* 5. About the Role Description */}
            <RoleDescriptionSection description={job.description} />
          </main>

          {/* Sticky Aside */}
          <AnalysisAside job={job} />
        </div>
      </div>
    </PageContainer>
  );
}
