"use client";

import Link from "next/link";
import React from "react";
import type { JobMatch } from "@/lib/api/types";
import { Panel } from "@/components/ui";

export function SkillsCoverageSection({ match }: { match: JobMatch | null | undefined }) {
  if (!match) return null;

  const matchRatio = match.total_skills > 0 ? match.matched_skills / match.total_skills : 0;
  const matchPercent = Math.min(100, Math.max(0, Math.round(matchRatio * 100)));

  const matched = match.requirements.filter((r) => r.status === "evidence_found");
  const unevidenced = match.requirements.filter((r) => r.status !== "evidence_found");

  const recommendation = match.recommended_resume;

  return (
    <Panel eyebrow="SKILLS COVERAGE" title="Evidence analysis" className="space-y-6">
      {/* 4px thin rule-style meter beside Fraunces numeral */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="w-48 h-1 bg-sage-soft rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-moss transition-all duration-300"
              style={{ width: `${matchPercent}%` }}
              role="progressbar"
              aria-valuenow={match.matched_skills}
              aria-valuemin={0}
              aria-valuemax={match.total_skills}
            />
          </div>
          <span className="font-display font-medium text-lg text-ink tabular-nums">
            {match.matched_skills} of {match.total_skills} skills evidenced
          </span>
        </div>
        <p className="text-xs text-sage-deep italic">
          Based strictly on confirmed facts across your uploaded resumes.
        </p>
      </div>

      {/* Two columns: Matched vs Not Evidenced Yet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-2">
          <span className="eyebrow text-moss block">MATCHED SKILLS ({matched.length})</span>
          {matched.length === 0 ? (
            <p className="text-xs text-sage-deep italic">No skills with verified evidence yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-ink">
              {matched.map((r) => (
                <li key={r.label} className="flex items-start gap-1.5">
                  <span className="text-moss font-bold select-none">&bull;</span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <span className="eyebrow text-ink-soft block">NOT EVIDENCED YET ({unevidenced.length})</span>
          {unevidenced.length === 0 ? (
            <p className="text-xs text-sage-deep italic">All listed skills have verified evidence.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-ink-soft">
              {unevidenced.map((r) => (
                <li key={r.label} className="flex items-start gap-1.5">
                  <span className="text-sage-deep select-none">&mdash;</span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-sage-deep pt-1">
            No confirmed evidence in your resumes. If you have this skill, you can add it by confirming it in a{" "}
            <Link href="/resumes" className="underline text-ink hover:text-ink-soft font-medium">
              resume review
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Best-Fit Resume Recommendation */}
      <div className="border-t border-hairline pt-4 space-y-2">
        <span className="eyebrow block">RECOMMENDED RESUME</span>
        {recommendation ? (
          <div className="p-3 bg-paper rounded-md border border-hairline text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Primary recommendation:</span>
              <span className="font-mono bg-paper-raised px-1.5 py-0.5 rounded border border-hairline">
                {recommendation.filename}
              </span>
            </div>
            {recommendation.covered_requirements && recommendation.covered_requirements.length > 0 && (
              <p className="text-sage-deep mt-1">
                Supports: {recommendation.covered_requirements.join(", ")}
              </p>
            )}
            <div className="pt-1">
              <Link
                href={`/resumes`}
                className="text-[11px] text-ink underline hover:text-ink-soft font-medium"
              >
                Inspect resume facts &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-xs text-sage-deep italic">
            No recommendation yet.{" "}
            <Link href="/resumes" className="underline text-ink hover:text-ink-soft">
              Confirm a resume
            </Link>{" "}
            to get one.
          </p>
        )}
      </div>
    </Panel>
  );
}
