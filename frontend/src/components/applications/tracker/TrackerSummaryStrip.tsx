"use client";

import React from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import { Panel, Stat } from "@/components/ui";

export interface TrackerSummaryStripProps {
  applications: TrackedApplication[];
}

export function TrackerSummaryStrip({ applications }: TrackerSummaryStripProps) {
  const inPreparation = applications.filter((a) => a.confirmedStage === "preparing").length;
  const reportedSubmitted = applications.filter((a) => a.confirmedStage === "submitted_reported").length;
  const testSubmissions = applications.filter((a) => a.confirmedStage === "test_submitted").length;

  return (
    <div className="space-y-3">
      <Panel eyebrow="OVERVIEW" title="Application Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <Stat
            label="In Preparation"
            value={inPreparation}
            caption="Assisted drafts ready to complete"
          />
          <Stat
            label="Reported Submitted"
            value={reportedSubmitted}
            caption="Submitted on employer sites"
          />
          <Stat
            label="Test Submissions"
            value={testSubmissions}
            caption="Delivered to demo test inbox"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-hairline text-xs text-sage-deep leading-relaxed">
          Status shown here is what GetSwydd can confirm, plus notes you add yourself. Updates on employer sites aren&apos;t tracked automatically.
        </div>
      </Panel>
    </div>
  );
}
