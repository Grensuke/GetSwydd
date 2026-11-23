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
  const employerConfirmed = applications.filter((a) => a.confirmedStage === "submitted_direct").length;
  const testSubmissions = applications.filter((a) => a.confirmedStage === "test_submitted").length;

  return (
    <Panel title="Application summary">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3"
          label="Employer confirmed"
          value={employerConfirmed}
          caption="Accepted through Greenhouse"
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3"
          label="In preparation"
          value={inPreparation}
          caption="Assisted drafts ready to complete"
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3"
          label="Reported submitted"
          value={reportedSubmitted}
          caption="Submitted on employer sites"
        />
        <Stat
          className="rounded-lg bg-paper px-3 py-2 sm:px-4 sm:py-3"
          label="Test submissions"
          value={testSubmissions}
          caption="Delivered to demo test inbox"
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-sage-deep">
        Add updates from the employer to your personal notes.
      </p>
    </Panel>
  );
}
