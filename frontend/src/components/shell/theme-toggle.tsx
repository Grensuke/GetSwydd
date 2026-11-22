"use client";

import React from "react";
import { type ThemeChoice, useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

export interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

const options: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle({ className, size = "sm" }: ThemeToggleProps) {
  const { theme, setTheme, mounted } = useTheme();

  const isSmall = size === "sm";

  return (
    <div
      role="radiogroup"
      aria-label="Color theme selection"
      className={cn(
        "inline-flex items-center rounded-md border border-hairline bg-paper p-0.5 select-none",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = mounted ? theme === opt.value : opt.value === "system";

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "rounded font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink",
              isSmall ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              isSelected
                ? "bg-cream text-[var(--color-on-cream,#2B2F27)] font-semibold shadow-[0_1px_0_rgba(43,47,39,0.06)]"
                : "text-sage-deep hover:text-ink hover:bg-paper-raised"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
