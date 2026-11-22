"use client";

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui";
import { FilterPanel } from "@/components/discovery";
import type { Employment, ExperienceLevel, Workplace } from "@/lib/api/types";
import type { DiscoveryParams } from "@/lib/discovery/params";

export interface MobileFilterSheetProps {
  open: boolean;
  params: DiscoveryParams;
  onClose: () => void;
  setParam: <K extends keyof DiscoveryParams>(k: K, v: DiscoveryParams[K]) => void;
}

/**
 * Mobile sheet wrapper for the FilterPanel.
 * Extracted from DiscoveryView for file-size budget.
 */
export function MobileFilterSheet({ open, params, onClose, setParam }: MobileFilterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} side="left" title="Filters">
      <FilterPanel
        workplace={params.workplace}
        employment={params.employment}
        experienceLevel={params.experienceLevel}
        closingWithinDays={params.closingWithinDays}
        internshipsOnly={params.internshipsOnly}
        usePreferences={params.usePreferences}
        onWorkplaceChange={(v: Workplace[]) => setParam("workplace", v)}
        onEmploymentChange={(v: Employment[]) => setParam("employment", v)}
        onExperienceLevelChange={(v: ExperienceLevel[]) => setParam("experienceLevel", v)}
        onClosingChange={(v: number | null) => setParam("closingWithinDays", v)}
        onInternshipsOnlyChange={(v: boolean) => setParam("internshipsOnly", v)}
        onUsePreferencesChange={(v: boolean) => setParam("usePreferences", v)}
      />
      <div className="mt-5 pt-4 border-t border-hairline">
        <Button variant="primary" size="sm" onClick={onClose}>
          Apply filters
        </Button>
      </div>
    </Sheet>
  );
}
