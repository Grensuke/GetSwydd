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
        "rounded-lg border border-hairline bg-paper-raised p-5 shadow-[0_1px_0_rgba(43,47,39,0.04)]",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-hairline pb-3">
          <div>
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

