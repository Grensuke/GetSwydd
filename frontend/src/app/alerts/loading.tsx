import React from "react";
import { PageContainer } from "@/components/shell";
import { PageHeader, Panel, Skeleton } from "@/components/ui";

export default function AlertsLoading() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="ALERTS"
        title="New listings that fit your preferences."
        description="Alerts appear when a feed refresh discovers listings you haven't seen before that match your saved preferences."
      />
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Panel className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-hairline last:border-0">
                <div className="space-y-2 w-1/2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
