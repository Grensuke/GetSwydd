"use client";

import Link from "next/link";
import React from "react";
import type { JobMatch, RequirementMatch } from "@/lib/api/types";
import { Badge, Panel, SourceTag } from "@/components/ui";
import {
  ELIGIBILITY_STATUS_MAP,
  REQUIREMENT_KIND_LABELS,
  REQUIREMENT_STATUS_MAP,
} from "@/lib/labels";

export function EligibilitySection({ match }: { match: JobMatch | null | undefined }) {
  if (!match) {
    return (
      <Panel eyebrow="ELIGIBILITY & REQUIREMENTS" title="Requirements evaluation">
        <p className="text-sm text-sage-deep italic">
          No confirmed profile available to evaluate requirements for this role.
        </p>
      </Panel>
    );
  }

  const eligibility = ELIGIBILITY_STATUS_MAP[match.eligibility_status] || ELIGIBILITY_STATUS_MAP.not_established;

  // Group requirements by kind
  const kinds: RequirementMatch["kind"][] = ["required_skill", "mentioned_skill", "manual_check"];
  const grouped = kinds.map((k) => ({
    kind: k,
    label: REQUIREMENT_KIND_LABELS[k],
    items: match.requirements.filter((r) => r.kind === k),
  }));

  const scopeExplanation =
    match.scope === "listed_requirements"
      ? "Matching based on explicit requirements listed by the employer."
      : "Matching based on keywords and terms mentioned throughout the job description.";

  return (
    <Panel eyebrow="ELIGIBILITY & REQUIREMENTS" title="Qualification assessment" className="space-y-5">
      {/* Status banner */}
      <div className="p-4 bg-paper rounded-md border border-hairline space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-semibold text-ink text-sm">Overall Eligibility</span>
          <Badge tone={eligibility.tone}>{eligibility.label}</Badge>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">{eligibility.description}</p>
        <p className="text-[11px] font-mono text-sage-deep pt-1 border-t border-hairline/60">
          {scopeExplanation}
        </p>
      </div>

      {/* Grouped Requirements */}
      <div className="space-y-6 pt-2">
        {grouped.map(({ kind, label, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={kind} className="space-y-3">
              <div className="flex items-center justify-between border-b border-hairline pb-1.5">
                <span className="eyebrow text-ink font-bold">{label}</span>
                <span className="font-mono text-xs text-sage-deep">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="divide-y divide-hairline">
                {items.map((req) => {
                  const statusInfo = REQUIREMENT_STATUS_MAP[req.status] || REQUIREMENT_STATUS_MAP.needs_confirmation;
                  return (
                    <li key={req.label} className="py-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <span className="text-sm font-medium text-ink">{req.label}</span>
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </div>

                      {/* Evidence breakdown */}
                      {req.evidence && req.evidence.length > 0 ? (
                        <div className="space-y-1.5 pl-3 border-l-2 border-hairline">
                          {req.evidence.map((ev, i) => (
                            <div key={i} className="text-xs text-ink-soft flex flex-wrap items-center gap-1.5">
                              <span className="italic font-serif">“{ev.value}”</span>
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
                        <div className="text-xs text-sage-deep">
                          <SourceTag source="missing" />
                        </div>
                      )}

                      {/* Profile authorization source note */}
                      {req.confirmation_source === "profile.uk_work_authorization" && (
                        <p className="text-[11px] text-sage-deep mt-1">
                          Sourced from your personal profile details.{" "}
                          <Link href="/profile" className="underline text-ink hover:text-ink-soft">
                            Review in your profile
                          </Link>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
