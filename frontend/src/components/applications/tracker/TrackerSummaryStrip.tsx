"use client";

import React, { useMemo } from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import { useAllPersonalStatuses } from "@/lib/applications/personal-status";
import { Badge, Panel, Stat } from "@/components/ui";
import { TrendingUp } from "lucide-react";

export interface TrackerSummaryStripProps {
  applications: TrackedApplication[];
}

export function TrackerSummaryStrip({ applications }: TrackerSummaryStripProps) {
  const personalStatuses = useAllPersonalStatuses();

  const analytics = useMemo(() => {
    const realApps = applications.filter((a) => a.kind !== "test");
    const testSubmissions = applications.filter((a) => a.kind === "test").length;

    // Submission channels
    const employerConfirmed = realApps.filter((a) => a.confirmedStage === "submitted_direct").length;
    const sentViaGmail = realApps.filter((a) => a.confirmedStage === "submitted_email").length;
    const reportedSubmitted = realApps.filter((a) => a.confirmedStage === "submitted_reported").length;
    const totalSubmitted = employerConfirmed + sentViaGmail + reportedSubmitted;

    // Pipeline stages
    const inPreparation = realApps.filter(
      (a) => a.confirmedStage === "preparing" && !personalStatuses[a.key]?.stage
    ).length;
    const saved = realApps.filter((a) => personalStatuses[a.key]?.stage === "saved").length;
    const assessments = realApps.filter((a) => personalStatuses[a.key]?.stage === "assessment").length;
    const interviews = realApps.filter((a) => personalStatuses[a.key]?.stage === "interview").length;
    const offers = realApps.filter((a) => personalStatuses[a.key]?.stage === "offer").length;
    const rejected = realApps.filter((a) => personalStatuses[a.key]?.stage === "rejected").length;

    const pipelineActive = assessments + interviews + offers;
    const conversionRate = totalSubmitted > 0 ? Math.round(((interviews + offers) / totalSubmitted) * 100) : 0;

    return {
      totalReal: realApps.length,
      testSubmissions,
      employerConfirmed,
      sentViaGmail,
      reportedSubmitted,
      totalSubmitted,
      inPreparation,
      saved,
      assessments,
      interviews,
      offers,
      rejected,
      pipelineActive,
      conversionRate,
    };
  }, [applications, personalStatuses]);

  return (
    <Panel eyebrow="APPLICATION ANALYTICS" title="Search Funnel & Metrics">
      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3 border border-hairline/60"
          label="Total In Play"
          value={analytics.totalReal}
          caption={`${analytics.saved} saved · ${analytics.inPreparation} preparing`}
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3 border border-hairline/60"
          label="Submissions"
          value={analytics.totalSubmitted}
          caption={
            analytics.totalSubmitted > 0
              ? `${analytics.employerConfirmed} Greenhouse · ${analytics.sentViaGmail} Gmail · ${analytics.reportedSubmitted} Direct`
              : "No submissions yet"
          }
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3 border border-hairline/60"
          label="Active Pipeline"
          value={analytics.pipelineActive}
          caption={`${analytics.interviews} interviews · ${analytics.assessments} assessments`}
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3 border border-hairline/60"
          label="Offers Received"
          value={analytics.offers}
          caption={analytics.offers > 0 ? "Offer stage reached" : "Awaiting final decision"}
        />
      </div>

      {/* Visual Pipeline Funnel */}
      <div className="mt-4 pt-4 border-t border-hairline space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="eyebrow flex items-center gap-1.5 text-sage-deep">
            <TrendingUp size={13} aria-hidden="true" />
            Recruiting Pipeline Funnel
          </span>
          {analytics.totalSubmitted > 0 && (
            <Badge tone="verified" className="font-mono text-[11px]">
              {analytics.conversionRate}% interview conversion
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Saved */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-sage-deep">Saved</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.saved}</span>
            <span className="text-[10px] text-ink-soft">Bookmarked</span>
          </div>

          {/* Preparing */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-ochre">Preparing</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.inPreparation}</span>
            <span className="text-[10px] text-ink-soft">Drafts in progress</span>
          </div>

          {/* Submitted */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-moss">Submitted</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.totalSubmitted}</span>
            <span className="text-[10px] text-ink-soft">Verified delivery</span>
          </div>

          {/* Assessment */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-terracotta">Assessment</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.assessments}</span>
            <span className="text-[10px] text-ink-soft">Tests & take-homes</span>
          </div>

          {/* Interview */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-moss">Interview</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.interviews}</span>
            <span className="text-[10px] text-ink-soft">Active rounds</span>
          </div>

          {/* Offer */}
          <div className="flex flex-col rounded-lg border border-hairline bg-paper p-2.5 space-y-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-moss">Offer</span>
            <span className="font-display text-lg font-medium text-ink tabular-nums">{analytics.offers}</span>
            <span className="text-[10px] text-ink-soft">Decisions received</span>
          </div>
        </div>
      </div>

      {analytics.testSubmissions > 0 && (
        <p className="mt-3 text-[11px] text-sage-deep">
          Note: {analytics.testSubmissions} demo test submission{analytics.testSubmissions === 1 ? "" : "s"} is tracked separately in the local mock sandbox.
        </p>
      )}
    </Panel>
  );
}
