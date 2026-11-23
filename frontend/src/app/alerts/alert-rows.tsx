"use client";

import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui";
import type { JobAlert } from "@/lib/api/types";
import { formatDeadline, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AlertTableRow({ alert, onMarkRead }: { alert: JobAlert; onMarkRead: (id: string) => void }) {
  const isUnread = !alert.read_at;
  const deadline = alert.application_deadline ? formatDeadline(alert.application_deadline) : null;

  return (
    <tr className={cn("hover:bg-cream/20 transition-colors", isUnread && "bg-cream/10")}>
      <td className="px-4 py-3.5">
        <span className="eyebrow block text-sage-deep mb-0.5">{alert.company}</span>
        <Link
          href={`/jobs/${encodeURIComponent(alert.job_id)}`}
          className={cn("font-display text-sm hover:underline", isUnread ? "font-semibold text-ink" : "text-ink-soft")}
        >
          {alert.job_title}
        </Link>
      </td>
      <td className="px-4 py-3.5 text-ink-soft">{alert.location}</td>
      <td className="px-4 py-3.5">
        {deadline && deadline.text ? (
          <Badge tone={deadline.isUrgent ? "attention" : "outline"}>{deadline.text}</Badge>
        ) : (
          <span className="text-sage-deep">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-3.5 font-mono text-[11px] text-sage-deep">
        {formatRelativeDate(alert.created_at)}
      </td>
      <td className="px-4 py-3.5">
        {isUnread ? <Badge tone="attention">Unread</Badge> : <Badge tone="neutral">Read</Badge>}
      </td>
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/jobs/${encodeURIComponent(alert.job_id)}`}
            className="text-xs text-ink underline hover:text-ink-soft font-medium"
          >
            View analysis
          </Link>
          {alert.apply_url && (
            <a
              href={alert.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sage-deep underline hover:text-ink"
            >
              Employer page
            </a>
          )}
          {isUnread && (
            <button
              type="button"
              onClick={() => onMarkRead(alert.id)}
              className="text-xs text-sage-deep hover:text-ink underline cursor-pointer"
            >
              Mark read
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AlertMobileCard({ alert, onMarkRead }: { alert: JobAlert; onMarkRead: (id: string) => void }) {
  const isUnread = !alert.read_at;
  const deadline = alert.application_deadline ? formatDeadline(alert.application_deadline) : null;

  return (
    <div className={cn("p-4 space-y-2", isUnread && "bg-cream/10 border-l-2 border-l-ink")}>
      <div className="flex justify-between items-start gap-2">
        <span className="eyebrow text-sage-deep">{alert.company}</span>
        <span className="font-mono text-[10px] text-sage-deep">{formatRelativeDate(alert.created_at)}</span>
      </div>

      <Link
        href={`/jobs/${encodeURIComponent(alert.job_id)}`}
        className={cn("font-display text-base block hover:underline", isUnread ? "font-semibold text-ink" : "text-ink-soft")}
      >
        {alert.job_title}
      </Link>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ink-soft">{alert.location}</span>
        {deadline && deadline.text && (
          <Badge tone={deadline.isUrgent ? "attention" : "outline"}>{deadline.text}</Badge>
        )}
        {isUnread ? <Badge tone="attention">Unread</Badge> : <Badge tone="neutral">Read</Badge>}
      </div>

      <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-hairline/60">
        <Link href={`/jobs/${encodeURIComponent(alert.job_id)}`} className="text-ink underline font-medium">
          View analysis
        </Link>
        <div className="flex items-center gap-3">
          {alert.apply_url && (
            <a href={alert.apply_url} target="_blank" rel="noopener noreferrer" className="text-sage-deep underline">
              Employer page
            </a>
          )}
          {isUnread && (
            <button type="button" onClick={() => onMarkRead(alert.id)} className="text-sage-deep underline cursor-pointer">
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
