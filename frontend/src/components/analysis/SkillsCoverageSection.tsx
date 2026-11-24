"use client";

import Link from "next/link";
import React, { useState } from "react";
import type { JobMatch, ResumeFacts } from "@/lib/api/types";
import { Panel } from "@/components/ui";
import { listResumes, getResume, confirmResumeFacts } from "@/lib/api/resumes";
import { Plus, Check, Loader2 } from "lucide-react";

export function SkillsCoverageSection({
  match,
  onSkillAdded,
}: {
  match: JobMatch | null | undefined;
  onSkillAdded?: () => void;
}) {
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  if (!match) return null;

  const matchRatio = match.total_skills > 0 ? match.matched_skills / match.total_skills : 0;
  const matchPercent = Math.min(100, Math.max(0, Math.round(matchRatio * 100)));

  const matched = match.requirements.filter((r) => r.status === "evidence_found");
  const unevidenced = match.requirements.filter((r) => r.status !== "evidence_found");

  const recommendation = match.recommended_resume;

  async function handleAddSkill(skillLabel: string) {
    if (addingSkill) return;
    setAddingSkill(skillLabel);
    setFeedbackError(null);

    try {
      const resumes = await listResumes();
      if (!resumes || resumes.length === 0) {
        setFeedbackError("Upload a resume first before adding skills.");
        return;
      }

      // Pick the recommended resume or the first available
      const targetResumeId = recommendation?.resume_id || resumes[0].id;
      const detail = await getResume(targetResumeId);
      if (!detail) {
        setFeedbackError("Could not retrieve resume details.");
        return;
      }

      const currentFacts: ResumeFacts = detail.confirmed_facts ?? detail.suggested_facts;
      const existingSkills = currentFacts.skills ?? [];

      // Check if skill is already present
      if (!existingSkills.some((s) => s.toLowerCase() === skillLabel.toLowerCase())) {
        const updatedFacts: ResumeFacts = {
          ...currentFacts,
          skills: [...existingSkills, skillLabel],
        };

        await confirmResumeFacts(
          detail,
          updatedFacts,
          undefined,
          detail.confirmed_contact ?? detail.suggested_contact
        );
      }

      setAddedSkills((prev) => new Set(prev).add(skillLabel));
      onSkillAdded?.();
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to add skill.");
    } finally {
      setAddingSkill(null);
    }
  }

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

      {feedbackError && (
        <div className="rounded-md border border-brick/30 bg-brick-tint/30 p-2 text-xs text-brick">
          {feedbackError}
        </div>
      )}

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
            <ul className="space-y-2 text-xs text-ink-soft">
              {unevidenced.map((r) => {
                const isAdded = addedSkills.has(r.label);
                const isLoading = addingSkill === r.label;

                return (
                  <li
                    key={r.label}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline/60 bg-paper p-1.5 transition-colors hover:border-hairline"
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="text-sage-deep select-none">&mdash;</span>
                      <span className="truncate font-medium text-ink">{r.label}</span>
                    </div>

                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-moss bg-moss-tint">
                        <Check size={11} aria-hidden="true" />
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAddSkill(r.label)}
                        className="inline-flex items-center gap-1 shrink-0 rounded border border-moss/30 bg-moss-tint/40 px-2 py-0.5 text-[11px] font-medium text-moss hover:bg-moss-tint transition-colors disabled:opacity-50"
                        title={`Confirm ${r.label} in your resume skills`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                            <span>Adding…</span>
                          </>
                        ) : (
                          <>
                            <Plus size={10} aria-hidden="true" />
                            <span>+ Add skill</span>
                          </>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-sage-deep pt-1">
            Click <strong>+ Add skill</strong> to confirm knowledge to your profile and re-calculate evidence in real time.
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
