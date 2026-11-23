import React from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "verified" | "attention" | "problem" | "info" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-cream text-on-cream border-hairline",
  verified: "bg-moss-tint text-moss border-moss/30",
  attention: "bg-ochre-tint text-ochre border-ochre/30",
  problem: "bg-brick-tint text-brick border-brick/30",
  info: "bg-slate-tint text-slate border-slate/30",
  outline: "bg-transparent text-ink border-hairline-strong",
};

export function Badge({ tone = "neutral", icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] rounded-sm border shrink-0",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

