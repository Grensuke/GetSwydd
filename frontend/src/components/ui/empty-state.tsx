import React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  eyebrow = "NOTHING FOUND",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-hairline-strong bg-paper-raised/60 p-8 sm:p-12 text-center",
        className
      )}
    >
      <span className="eyebrow block mb-2">{eyebrow}</span>
      <h3 className="font-display text-xl sm:text-2xl text-ink font-medium">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

