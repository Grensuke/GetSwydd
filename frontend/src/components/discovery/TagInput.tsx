"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";

export interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  className?: string;
}

/**
 * Keyboard-accessible tag input.
 * Enter or comma to add, Backspace to remove last, button to remove specific.
 * Includes an aria-live announcement region for screen readers.
 */
export function TagInput({
  label,
  tags,
  onChange,
  placeholder = "Type and press Enter...",
  maxTags = 10,
  maxLength = 120,
  className,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (raw: string) => {
      const value = raw.trim();
      // Backend pattern: r"\w"
      if (!value || tags.includes(value) || tags.length >= maxTags) return;
      onChange([...tags, value]);
      setAnnouncement(`Added term: ${value}`);
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (index: number) => {
      const removed = tags[index];
      onChange(tags.filter((_, i) => i !== index));
      if (removed) setAnnouncement(`Removed term: ${removed}`);
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(input);
        setInput("");
      } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [input, tags, addTag, removeTag]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    function handlePaste(e: ClipboardEvent) {
      e.preventDefault();
      const text = e.clipboardData?.getData("text") ?? "";
      const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
      const newTags = [...tags];
      for (const part of parts) {
        if (newTags.length >= maxTags) break;
        if (!newTags.includes(part)) newTags.push(part);
      }
      onChange(newTags);
      setAnnouncement(`Pasted ${parts.length} terms`);
    }
    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, [tags, onChange, maxTags]);

  return (
    <div className={className}>
      <label className="eyebrow block mb-1.5">{label}</label>

      {/* Screen reader live region */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      <div
        onClick={focusInput}
        className="flex flex-wrap gap-1.5 rounded-md border border-hairline bg-paper-raised px-2.5 py-1.5 cursor-text min-h-[38px] focus-within:border-ink focus-within:ring-1 focus-within:ring-ink"
      >
        {tags.map((tag, i) => (
          <Badge key={tag} tone="outline" className="gap-1.5">
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="text-sage-deep hover:text-ink transition-colors cursor-pointer"
              aria-label={`Remove ${tag}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          maxLength={maxLength}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[100px] border-0 bg-transparent text-sm text-ink placeholder:text-sage-deep/80 outline-none p-0 py-0.5"
          aria-label={label}
        />
      </div>
      <p className="text-[11px] text-sage-deep mt-1 font-mono">
        {tags.length} of {maxTags} terms &bull; Press Enter or comma to add
      </p>
    </div>
  );
}
