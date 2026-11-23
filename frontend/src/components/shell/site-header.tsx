"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

import { AlertsSlot } from "./alerts-slot";
import { ThemeToggle } from "./theme-toggle";
export { AlertsSlot, ThemeToggle };

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/resumes", label: "Resumes" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

function DesktopNav() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="hidden md:flex items-center gap-6 h-full" aria-label="Main navigation">
      {navItems.map((item) => {
        const active = isItemActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative h-full flex items-center text-sm font-medium transition-colors select-none",
              active ? "text-ink font-semibold" : "text-ink-soft hover:text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            {active && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopNavFallback() {
  return (
    <nav className="hidden md:flex items-center gap-6 h-full" aria-label="Main navigation">
      {navItems.map((item) => (
        <span key={item.href} className="text-sm font-medium text-ink-soft select-none">
          {item.label}
        </span>
      ))}
    </nav>
  );
}

function MobileNavLinks({ onSelect }: { onSelect: () => void }) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-1">
      {navItems.map((item) => {
        const active = isItemActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onSelect}
            className={cn(
              "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
              active
                ? "bg-moss-tint text-moss font-semibold"
                : "text-ink-soft hover:bg-cream/30 hover:text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Return focus to the menu button when Escape closes navigation.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <header className="relative z-30 border-b border-hairline bg-paper-raised">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        {/* Left: Brand Monogram + Wordmark */}
        <Link href="/" className="group flex w-fit items-center gap-2.5">
          <svg
            className="w-7 h-7 text-ink"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Geometric monogram "G" formed from two concentric arcs */}
            <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M19 14H13.5M19 14C19 16.7614 16.7614 19 14 19C11.2386 19 9 16.7614 9 14C9 11.2386 11.2386 9 14 9C16.1 9 17.88 10.3 18.6 12.1"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            GetSwydd
          </span>
        </Link>

        {/* Desktop Nav in Suspense for Next.js Partial Prerendering */}
        <Suspense fallback={<DesktopNavFallback />}>
          <DesktopNav />
        </Suspense>

        {/* Right slot: ThemeToggle + AlertsSlot + Mobile Menu Button */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          <div className="hidden md:block">
            <ThemeToggle size="sm" />
          </div>
          <AlertsSlot />

          <button
            ref={menuButtonRef}
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-ink hover:bg-cream/40 cursor-pointer"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          ref={mobileMenuRef}
          className="md:hidden border-t border-hairline bg-paper-raised px-4 py-4 space-y-3 shadow-[0_4px_12px_rgba(43,47,39,0.06)]"
        >
          <Suspense fallback={null}>
            <MobileNavLinks onSelect={() => setMobileOpen(false)} />
          </Suspense>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2">
            <span className="text-xs text-sage-deep">Color Theme</span>
            <ThemeToggle size="sm" />
          </div>
        </div>
      )}
    </header>
  );
}
