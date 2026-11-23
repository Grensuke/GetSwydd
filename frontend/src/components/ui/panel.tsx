import React from "react";
import { cn } from "@/lib/cn";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title?: string;
  actions?: React.ReactNode;
}

export function Panel({ eyebrow, title, actions, className, children, ...props }: PanelProps) {
  const hasHeader = Boolean(eyebrow || title || actions);

  return (
    <div
      className={cn(
        "rounded-xl border border-hairline bg-paper-raised p-4 shadow-[0_2px_8px_rgba(43,47,39,0.04)] sm:p-5",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-3">
          <div className="min-w-0 break-words">
            {eyebrow && <span className="eyebrow block mb-1">{eyebrow}</span>}
            {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

