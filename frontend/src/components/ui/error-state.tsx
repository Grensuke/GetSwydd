import React from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Could not load content",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-brick/30 bg-brick-tint/40 p-5 sm:p-6 text-ink",
        className
      )}
    >
      <span className="eyebrow block mb-1 text-brick">SERVICE ERROR</span>
      <h3 className="font-display text-lg text-ink font-medium">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft leading-relaxed max-w-xl">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

