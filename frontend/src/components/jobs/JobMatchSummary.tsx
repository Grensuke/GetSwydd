import Link from "next/link";
import React from "react";
import type { JobMatch } from "@/lib/api/types";
import { Badge, SourceTag } from "@/components/ui";
import { ELIGIBILITY_STATUS_MAP, REQUIREMENT_STATUS_MAP } from "@/lib/labels";

export interface JobMatchSummaryProps {
  match: JobMatch;
  className?: string;
}

export function JobMatchSummary({ match }: JobMatchSummaryProps) {
  const recommendation = match.recommended_resume;
  const statusInfo = ELIGIBILITY_STATUS_MAP[match.eligibility_status] || ELIGIBILITY_STATUS_MAP.not_established;
  const matchRatio = match.total_skills > 0 ? match.matched_skills / match.total_skills : 0;
  const matchPercent = Math.min(100, Math.max(0, Math.round(matchRatio * 100)));

  return (
    <section className="mt-4 rounded-md border border-hairline bg-paper p-4 text-xs text-ink-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">PROFILE MATCH</span>
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
        </div>
        <p className="text-[11px] text-sage-deep italic">
          Estimated suitability, not a guarantee of hiring.
        </p>
      </div>

      {/* Match Meter Bar (4px thin bar in sage-soft with moss fill beside Fraunces numeral) */}
      <div className="mt-3 flex items-center gap-3">
        <div className="w-36 h-1 bg-sage-soft rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-moss transition-all duration-300"
            style={{ width: `${matchPercent}%` }}
            role="progressbar"
            aria-valuenow={match.matched_skills}
            aria-valuemin={0}
            aria-valuemax={match.total_skills}
          />
        </div>
        <div className="font-display font-medium text-sm text-ink tabular-nums">
          {match.matched_skills} of {match.total_skills} skills
        </div>
        {!match.has_confirmed_profile && (
          <span className="text-[11px] text-sage-deep">
            (
            <Link href="/resumes" className="underline text-ink hover:text-ink-soft">
              Confirm facts in your resumes
            </Link>{" "}
            to improve estimate)
          </span>
        )}
      </div>

      {recommendation && (
        <div className="mt-3 pt-2.5 border-t border-hairline text-xs">
          <p className="text-ink">
            <span className="font-medium text-ink">Recommended resume: </span>
            <span className="font-mono text-[12px] bg-paper-raised px-1.5 py-0.5 rounded border border-hairline">
              {recommendation.filename}
            </span>
          </p>
          <p className="mt-1 text-sage-deep">
            Supports: {recommendation.covered_requirements.join(", ")}
          </p>
        </div>
      )}

      {/* Breakdown Details */}
      <details className="mt-3 pt-2 border-t border-hairline">
        <summary className="cursor-pointer font-medium text-ink hover:underline select-none">
          Requirement Breakdown & Evidence ({match.requirements.length})
        </summary>
        <ul className="mt-2.5 divide-y divide-hairline">
          {match.requirements.map((req) => {
            const reqStatus = REQUIREMENT_STATUS_MAP[req.status] || REQUIREMENT_STATUS_MAP.needs_confirmation;
            return (
              <li key={req.label} className="py-2.5 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-medium text-ink">{req.label}</span>
                  <Badge tone={reqStatus.tone}>{reqStatus.label}</Badge>
                </div>
                {req.evidence && req.evidence.length > 0 ? (
                  <div className="space-y-1 pl-2 border-l border-hairline-strong">
                    {req.evidence.map((ev) => (
                      <div key={ev.value} className="text-[11px] text-ink-soft flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink">“{ev.value}”</span>
                        {ev.sources && ev.sources.length > 0 && (
                          <SourceTag
                            source="verified_profile"
                            filename={ev.sources.map((s) => s.filename).join(", ")}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-sage-deep">
                    <SourceTag source="missing" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}

