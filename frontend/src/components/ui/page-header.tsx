import React from "react";
import { cn } from "@/lib/cn";
import { Divider } from "./divider";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {eyebrow && <span className="eyebrow block mb-1.5">{eyebrow}</span>}
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink font-display">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-ink-soft max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <Divider variant="double" className="mt-5 mb-0" />
    </header>
  );
}

