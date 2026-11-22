import React from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AlertsProvider } from "@/lib/context/AlertsContext";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AlertsProvider>
      <div className="min-h-screen flex flex-col bg-paper text-ink">
        {/* Accessible skip-to-content link */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3.5 focus:py-1.5 focus:bg-ink focus:text-paper focus:rounded-md focus:shadow-md focus:text-xs focus:font-semibold uppercase tracking-wider"
        >
          Skip to main content
        </a>

        <SiteHeader />

        <main id="content" className="flex-1">
          {children}
        </main>

        <SiteFooter />
      </div>
    </AlertsProvider>
  );
}

