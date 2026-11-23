"use client";

import React, { Suspense } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/shell";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { DiscoveryView } from "./discovery-view";

export default function Home() {
  usePageTitle("Discover Opportunities");

  return (
    <PageContainer className="space-y-6">
      <header className="relative isolate overflow-hidden rounded-3xl border border-[#326354] bg-[#13372f] px-6 py-8 shadow-sm sm:px-10 sm:py-11 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_95%_0%,#326354,transparent_70%)]"
        />
        <div className="relative max-w-2xl">
          <h1 className="text-balance text-[clamp(2.35rem,5.8vw,4.5rem)] leading-[1.02] tracking-tight text-[#f7f8ed]">
            Find work that fits.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#e0ebe2] sm:text-base">
            Explore live roles across India and compare them with the skills you’ve confirmed in your resume.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium">
            <a
              href="#ai-search"
              onClick={() => {
                const panel = document.getElementById("ai-search");
                if (panel instanceof HTMLDetailsElement) panel.open = true;
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#e3efca] px-4 text-[#18392e] transition-colors hover:bg-white focus-visible:outline-white"
            >
              <Sparkles size={16} aria-hidden="true" /> Search with AI
            </a>
            <a href="#job-catalog" className="inline-flex min-h-10 items-center gap-2 text-[#f7f8ed] hover:underline focus-visible:outline-white">
              Browse jobs <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>
      <Suspense fallback={<DiscoverySkeleton />}>
        <DiscoveryView />
      </Suspense>
    </PageContainer>
  );
}

function DiscoverySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-sage-soft/30 rounded-md w-full" />
      <div className="h-8 bg-sage-soft/30 rounded-md w-3/4" />
      <div className="h-40 bg-sage-soft/30 rounded-md w-full" />
    </div>
  );
}
