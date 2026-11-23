"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/shell";
import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <PageContainer size="narrow">
      <div className="py-16 text-center space-y-4 rounded-lg border border-brick/40 bg-brick-tint/30 p-8 sm:p-12 shadow-[0_1px_0_rgba(43,47,39,0.04)]">
        <span className="eyebrow block text-brick">SYSTEM INTERRUPTION</span>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink">
          An unexpected error occurred.
        </h1>
        <p className="text-sm text-ink-soft max-w-md mx-auto leading-relaxed">
          {error.message || "A rendering or connectivity issue occurred while loading this page."}
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => reset()}>
            Retry Action
          </Button>
          <Button variant="secondary" size="md" href="/">
            Return Home
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

