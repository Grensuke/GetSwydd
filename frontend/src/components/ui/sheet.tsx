"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Accessible slide-in sheet (modal dialog). Focus-trapped, Escape to close, aria-modal.
 * Used for mobile filter panel and preferences drawer.
 */
export function Sheet({ open, onClose, side = "right", title, className, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    panel.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panel) {
        const focusable = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const slideFrom = side === "right" ? "right-0" : "left-0";

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className="absolute inset-0 bg-ink/30" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Drawer"}
        tabIndex={-1}
        className={cn(
          "absolute top-0 bottom-0 w-full sm:w-[480px] max-w-[92vw] bg-paper-raised border-hairline shadow-[0_1px_0_rgba(43,47,39,0.04)] overflow-y-auto",
          slideFrom,
          side === "right" ? "border-l" : "border-r",
          className
        )}
      >
        <div className="sticky top-0 z-10 bg-paper-raised border-b border-hairline px-5 py-4 flex items-center justify-between">
          {title && (
            <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-sage-deep hover:text-ink transition-colors p-1 -mr-1 cursor-pointer"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
