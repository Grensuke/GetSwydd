"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { formatDeadline, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AlertsSlot() {
  const router = useRouter();
  const { alerts, unreadCount, isCountCapped, markRead } = useAlerts();
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const displayCount = isCountCapped ? "20+" : unreadCount > 0 ? String(unreadCount) : null;

  // Handle click on the alerts trigger
  const handleClick = useCallback(() => {
    // If mobile (<640px), navigate directly to /alerts
    if (window.innerWidth < 640) {
      router.push("/alerts");
      return;
    }
    setOpen((prev) => !prev);
  }, [router]);

  // Handle escape and click outside
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const recentAlerts = alerts.slice(0, 5);

  const handleAlertClick = (alertId: string) => {
    markRead(alertId).catch(() => {});
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Alerts (${unreadCount} unread)`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-ink hover:bg-cream/40 transition-colors cursor-pointer select-none"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-ink"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        <span className="hidden sm:inline font-sans">Alerts</span>

        {displayCount && (
          <span
            className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-cream text-ink border border-hairline-strong leading-tight tabular-nums"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Recent job alerts"
          className="absolute right-0 top-full mt-2 w-[380px] max-w-[92vw] bg-paper-raised border border-hairline rounded-md shadow-[0_4px_16px_rgba(43,47,39,0.08)] z-50 overflow-hidden text-xs"
        >
          <div className="p-3 border-b border-hairline flex items-center justify-between bg-paper">
            <span className="eyebrow">NEW OPPORTUNITIES</span>
            <span className="font-mono text-[11px] text-sage-deep">
              {unreadCount} unread
            </span>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="p-5 text-center text-ink-soft">
              <p className="font-medium text-ink">No new alerts.</p>
              <p className="text-[11px] text-sage-deep mt-1">
                Refreshed opportunities will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline max-h-[340px] overflow-y-auto">
              {recentAlerts.map((alert) => {
                const isUnread = !alert.read_at;
                const deadline = alert.application_deadline
                  ? formatDeadline(alert.application_deadline)
                  : null;

                return (
                  <li
                    key={alert.id}
                    className={cn(
                      "p-3 transition-colors hover:bg-cream/20",
                      isUnread && "border-l-2 border-l-ink bg-cream/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="eyebrow text-sage-deep block">{alert.company}</span>
                      <span className="font-mono text-[10px] text-sage-deep shrink-0">
                        {formatRelativeDate(alert.created_at)}
                      </span>
                    </div>

                    <Link
                      href={`/jobs/${encodeURIComponent(alert.job_id)}`}
                      onClick={() => handleAlertClick(alert.id)}
                      className={cn(
                        "font-display text-sm block mt-0.5 hover:underline",
                        isUnread ? "font-semibold text-ink" : "text-ink-soft"
                      )}
                    >
                      {alert.job_title}
                    </Link>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-sage-deep">
                      <span>{alert.location}</span>
                      {deadline && deadline.text && (
                        <span
                          className={cn(
                            deadline.isUrgent ? "text-ochre font-semibold" : "text-sage-deep"
                          )}
                        >
                          {deadline.text}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="p-2.5 border-t border-hairline bg-paper text-center">
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-ink hover:underline uppercase tracking-[0.06em]"
            >
              View all alerts &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
