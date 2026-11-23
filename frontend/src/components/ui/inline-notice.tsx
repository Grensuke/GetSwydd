import React from "react";
import { cn } from "@/lib/cn";

export type NoticeVariant = "info" | "attention" | "problem";

export interface InlineNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NoticeVariant;
  title?: string;
}

const variantStyles: Record<NoticeVariant, { border: string; bg: string; text: string }> = {
  info: {
    border: "border-l-slate",
    bg: "bg-slate-tint/30",
    text: "text-slate",
  },
  attention: {
    border: "border-l-ochre",
    bg: "bg-ochre-tint/40",
    text: "text-ochre",
  },
  problem: {
    border: "border-l-brick",
    bg: "bg-brick-tint/40",
    text: "text-brick",
  },
};

export function InlineNotice({
  variant = "info",
  title,
  className,
  children,
  ...props
}: InlineNoticeProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="status"
      className={cn(
        "border-l-2 p-3 text-xs leading-relaxed rounded-r-md border-hairline border-t border-r border-b",
        styles.border,
        styles.bg,
        className
      )}
      {...props}
    >
      {title && <span className={cn("font-semibold block mb-0.5", styles.text)}>{title}</span>}
      <div className="text-ink-soft">{children}</div>
    </div>
  );
}

