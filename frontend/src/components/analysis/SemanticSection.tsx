"use client";

import React from "react";
import Link from "next/link";
import type { JobAnalysis, SemanticResumeMatch } from "@/lib/api/types";
import { Button, Checkbox, InlineNotice, Panel } from "@/components/ui";
import { percent } from "@/lib/format";
import { SEMANTIC_STATUS_MAP } from "@/lib/labels";

export interface SemanticSectionProps {
  analysis: JobAnalysis;
  useSemantic: boolean;
  onToggleSemantic: (enabled: boolean) => void;
  onRetry: () => void;
  loading?: boolean;
}

export function SemanticSection({
  analysis,
  useSemantic,
  onToggleSemantic,
  onRetry,
  loading = false,
}: SemanticSectionProps) {
  const { semantic_status, semantic_resume_matches } = analysis;
  const statusInfo = SEMANTIC_STATUS_MAP[semantic_status] || SEMANTIC_STATUS_MAP.disabled;

  return (
    <Panel eyebrow="AI SEMANTIC COMPARISON" title="Conceptual suitability" className="space-y-4">
      <div className="space-y-1">
        <Checkbox
          label="Include AI semantic comparison"
          checked={useSemantic}
          onChange={(e) => onToggleSemantic(e.target.checked)}
        />
        <p className="text-xs text-sage-deep pl-6">
          Compares contextual meaning and career trajectory rather than exact keyword matches. Optional and estimated.
        </p>
      </div>

      {/* When enabled, render by semantic_status */}
      {useSemantic && (
        <div className="border-t border-hairline pt-4 space-y-3">
          {semantic_status === "disabled" && (
            <p className="text-xs text-sage-deep italic">{statusInfo.description}</p>
          )}

          {semantic_status === "not_configured" && (
            <InlineNotice variant="info" title="Server feature note">
              {statusInfo.description}
            </InlineNotice>
          )}

          {semantic_status === "insufficient_data" && (
            <InlineNotice variant="attention" title="More profile details needed">
              <span>{statusInfo.description} </span>
              <Link href="/resumes" className="underline font-medium hover:text-ink">
                Review and confirm resumes
              </Link>
            </InlineNotice>
          )}

          {semantic_status === "unavailable" && (
            <InlineNotice variant="problem" title="Semantic check unavailable">
              <div className="flex items-center justify-between gap-3">
                <span>{statusInfo.description}</span>
                <Button variant="secondary" size="sm" onClick={onRetry} loading={loading}>
                  Retry
                </Button>
              </div>
            </InlineNotice>
          )}

          {semantic_status === "available" && (
            <div className="space-y-3">
              <p className="text-xs text-sage-deep italic">
                {statusInfo.description}
              </p>

              {semantic_resume_matches && semantic_resume_matches.length > 0 ? (
                <ul className="divide-y divide-hairline">
                  {semantic_resume_matches.map((item: SemanticResumeMatch) => (
                    <li key={item.resume_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-ink font-medium">{item.filename}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1 bg-sage-soft rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate"
                            style={{ width: `${Math.round(item.similarity * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-ink font-semibold tabular-nums w-12 text-right">
                          {percent(item.similarity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-sage-deep italic">No semantic resume matches recorded.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
