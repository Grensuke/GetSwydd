"use client";

import React from "react";
import { PageContainer } from "@/components/shell";
import { ErrorState, PageHeader } from "@/components/ui";

export default function AlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="ALERTS"
        title="Could not load alerts"
      />
      <ErrorState
        title="Unable to retrieve job alerts"
        message={error.message || "An unexpected error occurred while loading your job alerts."}
        onRetry={reset}
      />
    </PageContainer>
  );
}
