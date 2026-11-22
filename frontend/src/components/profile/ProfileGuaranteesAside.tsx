import React from "react";
import { Panel } from "@/components/ui";

export function ProfileGuaranteesAside() {
  return (
    <aside className="space-y-6">
      <Panel eyebrow="HOW THIS IS USED" title="Three Foundational Guarantees">
        <div className="space-y-4 text-xs text-ink-soft leading-relaxed">
          <div>
            <h4 className="font-semibold text-ink mb-1">1. Verified Facts Only</h4>
            <p>
              Every qualification, start date, and eligibility declaration is anchored exclusively in details you have confirmed. GetSwydd never estimates or exaggerates answers.
            </p>
          </div>
          <div className="border-t border-hairline pt-3">
            <h4 className="font-semibold text-ink mb-1">2. Explicit Review & Sign-Off</h4>
            <p>
              No application is ever dispatched without your manual inspection. You review the exact generated draft and tick an approval checkbox before delivery.
            </p>
          </div>
          <div className="border-t border-hairline pt-3">
            <h4 className="font-semibold text-ink mb-1">3. Assisted Fallback Mode</h4>
            <p>
              When an employer ATS lacks an authorized direct submission API, GetSwydd compiles pre-filled answers and guides you to finish safely on the employer&apos;s official portal.
            </p>
          </div>
        </div>
      </Panel>
    </aside>
  );
}
