"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PersonalStage } from "@/lib/applications/status";
import { PERSONAL_STAGE_MAP, PERSONAL_STAGES_LIST } from "@/lib/applications/status";

export interface MoveStageMenuProps {
  currentPersonalStage: PersonalStage | null;
  onSelectStage: (stage: PersonalStage | null) => void;
  disabled?: boolean;
}

export function MoveStageMenu({
  currentPersonalStage,
  onSelectStage,
  disabled = false,
}: MoveStageMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-2 py-0.5 rounded border border-hairline bg-paper-raised text-[11px] font-medium text-ink hover:bg-cream/40 transition-colors cursor-pointer select-none"
      >
        Move &hellip;
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1 w-48 rounded-md bg-paper-raised border border-hairline shadow-[0_4px_12px_rgba(43,47,39,0.08)] py-1 z-30 text-xs"
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sage-deep border-b border-hairline/60">
            Set Personal Stage
          </div>

          {PERSONAL_STAGES_LIST.map((stage) => {
            const isCurrent = currentPersonalStage === stage;
            const info = PERSONAL_STAGE_MAP[stage];

            return (
              <button
                key={stage}
                type="button"
                role="menuitem"
                disabled={isCurrent}
                onClick={() => {
                  onSelectStage(stage);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? "bg-cream/40 font-semibold text-ink cursor-default"
                    : "text-ink hover:bg-cream/30"
                }`}
              >
                <span>{info.label}</span>
                {isCurrent && <span className="text-sage-deep text-[10px]">&bull;</span>}
              </button>
            );
          })}

          <div className="border-t border-hairline/60 my-1" />

          {currentPersonalStage && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onSelectStage(null);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="w-full text-left px-3 py-1.5 text-sage-deep hover:text-ink hover:bg-cream/30 transition-colors cursor-pointer"
            >
              Clear personal stage
            </button>
          )}

          <div className="px-2.5 py-1 text-[10px] text-sage-deep italic border-t border-hairline/40">
            Confirmed stages cannot be moved manually.
          </div>
        </div>
      )}
    </div>
  );
}
