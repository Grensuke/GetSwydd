"use client";

import React, { useId, useState } from "react";
import { Panel } from "@/components/ui";

function stripHtml(text: string): string {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function RoleDescriptionSection({ description }: { description?: string | null }) {
  const [showFull, setShowFull] = useState(false);
  const toggleId = useId();

  if (!description) return null;

  // Split into paragraphs after stripping html
  const cleaned = stripHtml(description);
  const paragraphs = cleaned.split(/\n{2,}|\r\n\r\n/).filter(Boolean);
  const isLong = cleaned.length > 500;
  const displayedText = isLong && !showFull ? `${cleaned.slice(0, 500)}…` : null;

  return (
    <Panel eyebrow="ABOUT THE ROLE" title="Role description" className="space-y-4">
      <div id={toggleId} className="text-xs text-ink leading-relaxed space-y-3 font-sans">
        {displayedText ? (
          <p className="whitespace-pre-line">{displayedText}</p>
        ) : (
          paragraphs.map((p, idx) => (
            <p key={idx} className="whitespace-pre-line">
              {p}
            </p>
          ))
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setShowFull((p) => !p)}
          aria-expanded={showFull}
          aria-controls={toggleId}
          className="text-xs text-ink font-semibold underline hover:text-ink-soft cursor-pointer block pt-1"
        >
          {showFull ? "Show less" : "Show full description"}
        </button>
      )}
    </Panel>
  );
}
