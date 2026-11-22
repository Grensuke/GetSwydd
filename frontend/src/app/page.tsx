"use client";

import React, { Suspense } from "react";
import { PageContainer } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { DiscoveryView } from "./discovery-view";

export default function Home() {
  usePageTitle("Discover Opportunities");

  return (
    <PageContainer>
      <PageHeader
        eyebrow="DISCOVER"
        title="Opportunities matched to what you've actually done."
        description="GetSwydd estimates role suitability based strictly on evidence from your confirmed profile facts. Match evaluations are honest qualification estimates, not guarantees of hiring odds."
      />
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
