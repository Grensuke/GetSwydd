"use client";

import React, { useState } from "react";
import type { ApplicationDraft } from "@/lib/api/types";
import { Button } from "@/components/ui";

export interface AnswersToCopyProps {
  draft: ApplicationDraft;
  currentAnswers?: Record<string, string>;
}

export function AnswersToCopy({ draft, currentAnswers }: AnswersToCopyProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getAnswerText = (qId: string, fallback: string | null) => {
    if (currentAnswers && qId in currentAnswers) {
      return currentAnswers[qId];
    }
    return fallback ?? "";
  };

  async function copyToClipboard(key: string, text: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Fallback
    }
  }

  async function copyAllAnswers() {
    const formatted = draft.screening_questions
      .map((q) => {
        const ans = getAnswerText(q.id, q.answer);
        return `Q: ${q.question}\nA: ${ans || "[Needs your input]"}\n`;
      })
      .join("\n");

    await copyToClipboard("all", formatted);
  }

  return (
    <details className="p-3 bg-paper rounded-md border border-hairline text-xs group space-y-3">
      <summary className="cursor-pointer font-medium text-ink select-none list-none flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span>Answers to copy</span>
          <span className="text-sage-deep font-mono text-[11px]">
            ({draft.screening_questions.length})
          </span>
        </span>
        <span className="text-[10px] text-sage-deep transition-transform group-open:rotate-180">
          &#9660;
        </span>
      </summary>

      <div className="pt-2 space-y-3 border-t border-hairline">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-sage-deep">
            Copy answers one by one or all together to paste into the employer&apos;s form.
          </p>
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={copyAllAnswers}
            className="shrink-0"
          >
            {copiedKey === "all" ? "Copied all!" : "Copy all"}
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {draft.screening_questions.map((q) => {
            const ans = getAnswerText(q.id, q.answer);
            const isCopied = copiedKey === q.id;

            return (
              <div
                key={q.id}
                className="p-2 rounded bg-paper-raised border border-hairline/60 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink text-[11px] line-clamp-2">
                    {q.question}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(q.id, ans)}
                    disabled={!ans.trim()}
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-sage-deep hover:text-ink disabled:opacity-40 cursor-pointer"
                  >
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-ink-soft bg-paper p-1.5 rounded border border-hairline/40 break-words">
                  {ans.trim() || <span className="italic text-sage-deep">Needs your input</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
