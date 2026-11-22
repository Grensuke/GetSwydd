"use client";

import Link from "next/link";
import React, { useId } from "react";
import type { ScreeningQuestionAnswer } from "@/lib/api/types";
import { Badge, Select, SourceTag, Textarea } from "@/components/ui";

export interface QuestionBlockProps {
  question: ScreeningQuestionAnswer;
  value: string;
  hasEdited: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function QuestionBlock({
  question,
  value,
  hasEdited,
  disabled = false,
  onChange,
}: QuestionBlockProps) {
  const inputId = `field-${question.id}`;
  const detailsId = useId();

  const isMissing = question.required && !value.trim();
  const hasChoices = Boolean(question.choices && question.choices.length > 0);

  // Check if saved value is out-of-range for choice questions
  const isOutOfRangeChoice =
    hasChoices &&
    value.trim() !== "" &&
    !question.choices.includes(value.trim());

  // Determine source tag provenance
  const sourceProvenance =
    hasEdited
      ? "user_supplied"
      : question.source === "verified_profile"
      ? "verified_profile"
      : value.trim()
      ? "user_supplied"
      : "missing";

  return (
    <div
      id={`container-${question.id}`}
      className={`p-4 rounded-md border transition-colors space-y-3 ${
        isMissing
          ? "border-ochre/60 bg-ochre-tint/20"
          : "border-hairline bg-paper"
      }`}
    >
      {/* Question Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-1">
          <label htmlFor={inputId} className="font-medium text-xs text-ink block leading-snug">
            {question.question}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {question.required ? (
              <span className="eyebrow text-ochre">MANDATORY QUESTION</span>
            ) : (
              <span className="eyebrow text-sage-deep">OPTIONAL</span>
            )}
            {hasEdited && (
              <Badge tone="info">Edited</Badge>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <SourceTag source={sourceProvenance} />
        </div>
      </div>

      {/* Input Control */}
      {hasChoices ? (
        <div className="space-y-1.5">
          <Select
            id={inputId}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.currentTarget.value)}
            className="text-xs"
          >
            <option value="">Select an option…</option>
            {isOutOfRangeChoice && (
              <option value={value} disabled>
                (Invalid saved choice: {value})
              </option>
            )}
            {question.choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </Select>
          {isOutOfRangeChoice && (
            <p className="text-[11px] text-brick">
              The currently saved value is not in the allowed options. Please select a valid choice.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Textarea
            id={inputId}
            rows={3}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder="Provide your verified answer..."
            className="text-xs"
          />
          <div className="flex items-center justify-between text-[11px] text-sage-deep px-0.5">
            <span>{isMissing ? "Answer required before submission" : "Verified answer"}</span>
            <span className="font-mono">{value.length} characters</span>
          </div>
        </div>
      )}

      {/* Collapsible Evidence Breakdown (Rule 1: Verified Facts Only) */}
      <details id={detailsId} className="pt-1 border-t border-hairline/60 text-xs group">
        <summary className="cursor-pointer text-[11px] text-sage-deep hover:text-ink font-medium select-none list-none flex items-center justify-between">
          <span>
            {question.evidence && question.evidence.length > 0
              ? `View provenance evidence (${question.evidence.length})`
              : "Provenance and profile context"}
          </span>
          <span className="text-[10px] text-sage-deep transition-transform group-open:rotate-180">
            &#9660;
          </span>
        </summary>

        <div className="mt-2.5 p-3 rounded bg-cream/30 border border-hairline/60 space-y-2 text-[11px]">
          {question.evidence && question.evidence.length > 0 ? (
            <div className="space-y-2">
              <span className="eyebrow block text-sage-deep">SUPPORTING EVIDENCE</span>
              {question.evidence.map((ev, idx) => (
                <div key={idx} className="p-2 bg-paper rounded border border-hairline/40 space-y-1">
                  <p className="text-ink font-mono text-[11px] break-words">
                    &ldquo;{ev.value}&rdquo;
                  </p>
                  {ev.resume && (
                    <div className="text-[10px] text-sage-deep flex items-center gap-1">
                      <span>Source:</span>
                      <Link
                        href="/resumes"
                        className="underline hover:text-ink font-mono"
                      >
                        {ev.resume.filename}
                      </Link>
                    </div>
                  )}
                  {ev.profile_field && (
                    <p className="text-[10px] text-sage-deep">
                      Source field: <span className="font-mono">{ev.profile_field}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 text-sage-deep">
              <p>
                No supporting facts were located in your confirmed resume or profile for this question.
              </p>
              <p className="text-ink-soft">
                Rule 1: Never fabricate credentials. Answer only what you can personally verify.
              </p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
