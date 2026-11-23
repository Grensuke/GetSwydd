"use client";

import React from "react";
import { PageContainer } from "@/components/shell";
import { Button, EmptyState } from "@/components/ui";

export default function JobAnalysisError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <EmptyState
        eyebrow="LISTING UNAVAILABLE"
        title="This listing is no longer available."
        description="The opportunity could not be retrieved. Listings can change or disappear when live sources refresh."
        action={
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" size="sm" href="/">
              Back to Discover
            </Button>
            <Button variant="secondary" size="sm" onClick={reset}>
              Try again
            </Button>
          </div>
        }
      />
    </PageContainer>
  );
}
