"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Edit3, Tags } from "lucide-react";

export interface SkillTagEditorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
}

export function SkillTagEditor({
  skills,
  onChange,
  maxSkills = 80,
}: SkillTagEditorProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"tags" | "raw">("tags");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      // Split by comma if user pasted multiple
      const parts = trimmed
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !skills.some((existing) => existing.toLowerCase() === s.toLowerCase()));
      if (parts.length > 0) {
        const next = [...skills, ...parts].slice(0, maxSkills);
        onChange(next);
      }
      setInput("");
    },
    [skills, onChange, maxSkills]
  );

  const removeSkill = useCallback(
    (index: number) => {
      onChange(skills.filter((_, i) => i !== index));
    },
    [skills, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === "Backspace" && !input && skills.length > 0) {
      removeSkill(skills.length - 1);
    }
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawLines = e.target.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(rawLines.slice(0, maxSkills));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-sage-deep">
          {skills.length} / {maxSkills} skills
        </span>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "tags" ? "raw" : "tags"))}
          className="inline-flex items-center gap-1 font-medium text-moss hover:underline"
        >
          {mode === "tags" ? (
            <>
              <Edit3 size={12} aria-hidden="true" />
              Edit as multiline text
            </>
          ) : (
            <>
              <Tags size={12} aria-hidden="true" />
              Switch to interactive pills
            </>
          )}
        </button>
      </div>

      {mode === "tags" ? (
        <div
          className="min-h-24 rounded-md border border-hairline bg-paper p-2.5 transition-colors focus-within:border-moss"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="inline-flex items-center gap-1 rounded-md border border-hairline bg-paper-raised px-2.5 py-1 text-xs font-medium text-ink shadow-xs transition-colors hover:border-moss/40"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSkill(index);
                  }}
                  className="rounded-full p-0.5 text-sage-deep hover:bg-brick-tint hover:text-brick"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}

            {skills.length < maxSkills && (
              <div className="inline-flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (input.trim()) addSkill(input);
                  }}
                  placeholder={skills.length === 0 ? "Type a skill and press Enter..." : "+ Add skill..."}
                  className="min-w-28 flex-1 bg-transparent px-1 py-1 text-xs text-ink placeholder:text-sage-deep focus:outline-hidden"
                />
              </div>
            )}
          </div>
          {skills.length === 0 && (
            <p className="mt-2 text-xs text-sage-deep italic">No skills listed yet. Type above and press Enter or comma.</p>
          )}
        </div>
      ) : (
        <textarea
          value={skills.join("\n")}
          onChange={handleRawChange}
          rows={Math.max(5, Math.min(12, skills.length + 1))}
          className="w-full rounded-md border border-hairline bg-paper p-2.5 font-mono text-xs text-ink focus:border-moss focus:outline-hidden"
          placeholder="One skill per line..."
        />
      )}
    </div>
  );
}
