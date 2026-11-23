import React from "react";
import { PageContainer } from "@/components/shell";
import { Panel, Skeleton } from "@/components/ui";

export default function JobAnalysisLoading() {
  return (
    <PageContainer>
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
          <div className="space-y-6">
            <Panel className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full" />
            </Panel>
            <Panel className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-32 w-full" />
            </Panel>
          </div>
          <div>
            <Panel className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </Panel>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
