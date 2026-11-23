import type { CompensationRange } from "./api/types";

/**
 * Format an ISO date string to a human-readable date (e.g. "Nov 20, 2026").
 * Returns an empty string if null or invalid.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Format an ISO date string to a relative string (e.g. "today", "yesterday", "3d ago", "2w ago").
 */
export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffDays = Math.floor(diffSec / 86400);

    if (diffDays < 0) return formatDate(dateStr);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return "";
  }
}

export interface DeadlineInfo {
  text: string;
  isUrgent: boolean;
}

/**
 * Format an application deadline date string.
 * Returns text (e.g. "Closes in 3 days", "Closes Nov 28") and an urgency flag when <= 7 days.
 */
export function formatDeadline(dateStr: string | null | undefined): DeadlineInfo {
  if (!dateStr) return { text: "", isUrgent: false };
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return { text: "", isUrgent: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Closed", isUrgent: true };
    }
    if (diffDays === 0) {
      return { text: "Closes today", isUrgent: true };
    }
    if (diffDays === 1) {
      return { text: "Closes tomorrow", isUrgent: true };
    }
    if (diffDays <= 7) {
      return { text: `Closes in ${diffDays} days`, isUrgent: true };
    }

    const formatted = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { text: `Closes ${formatted}`, isUrgent: false };
  } catch {
    return { text: "", isUrgent: false };
  }
}

/**
 * Format a list of compensation ranges (e.g. "$60,000 – $80,000 / yr" or "£25 / hr").
 */
export function formatCompensation(ranges: CompensationRange[] | null | undefined): string {
  if (!ranges || ranges.length === 0) return "";
  const range = ranges[0];
  if (!range) return "";

  const periodLabel: Record<string, string> = {
    hour: "hr",
    week: "wk",
    month: "mo",
    year: "yr",
    one_time: "one-time",
  };

  const period = periodLabel[range.period] || range.period;

  try {
    const locale = range.currency === "INR" ? "en-IN" : "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: range.currency,
      maximumFractionDigits: 0,
    });

    if (range.minimum === range.maximum) {
      return `${formatter.format(range.minimum)} / ${period}`;
    }
    return `${formatter.format(range.minimum)} – ${formatter.format(range.maximum)} / ${period}`;
  } catch {
    // Fallback if currency code is unusual
    if (range.minimum === range.maximum) {
      return `${range.currency} ${range.minimum} / ${period}`;
    }
    return `${range.currency} ${range.minimum} – ${range.maximum} / ${period}`;
  }
}

/**
 * Convert snake_case or dash-case enum values to title case (e.g. "full_time" -> "Full time").
 */
export function titleCaseEnum(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Format a ratio or float (0-1 or 0-100) to a clean percentage string (e.g. "85%").
 */
export function percent(value: number | null | undefined, treatAsRatio = true): string {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  const pct = treatAsRatio && value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

