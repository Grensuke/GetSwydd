import React from "react";
import { cn } from "@/lib/cn";

export interface StatProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  className?: string;
}

export function Stat({ label, value, caption, className }: StatProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <span className="eyebrow block">{label}</span>
      <div className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink tabular-nums">
        {value}
      </div>
      {caption && <p className="text-xs text-sage-deep leading-snug">{caption}</p>}
    </div>
  );
}

