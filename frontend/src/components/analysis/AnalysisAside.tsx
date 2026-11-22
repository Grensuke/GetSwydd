"use client";

import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import type { Job } from "@/lib/api/types";
import { Badge, Panel } from "@/components/ui";
import { formatDeadline } from "@/lib/format";
import { ELIGIBILITY_STATUS_MAP } from "@/lib/labels";
import { StartApplication } from "@/components/applications/StartApplication";

export function AnalysisAside({ job }: { job: Job }) {
  const router = useRouter();
  const deadlineInfo = job.application_deadline ? formatDeadline(job.application_deadline) : null;

  const hostname = useMemo(() => {
    if (!job.apply_url) return null;
    try {
      return new URL(job.apply_url).hostname.replace(/^www\./, "");
    } catch {
      return "employer site";
    }
  }, [job.apply_url]);

  const eligibility = job.match
    ? ELIGIBILITY_STATUS_MAP[job.match.eligibility_status] || ELIGIBILITY_STATUS_MAP.not_established
    : ELIGIBILITY_STATUS_MAP.not_established;

  return (
    <aside className="space-y-4">
      <Panel eyebrow="NEXT STEPS" title="Application preparation" className="sticky top-24 space-y-5">
        {/* Eligibility Mini-Summary */}
        <div className="p-3 bg-paper rounded-md border border-hairline space-y-1">
          <span className="eyebrow block">STATUS EVALUATION</span>
          <div className="flex items-center gap-2 pt-0.5">
            <Badge tone={eligibility.tone}>{eligibility.label}</Badge>
          </div>
          <p className="text-[11px] text-sage-deep mt-1 leading-normal">
            {eligibility.description}
          </p>
        </div>

        {/* Action Button: Demo vs Assisted */}
        {job.application_mode === "demo" ? (
          <div className="space-y-2">
            <StartApplication job={job} fullWidth triggerSize="md" />
            <p className="text-[11px] text-sage-deep">
              Demo sandbox: delivers to local test endpoint only.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-paper rounded-md border border-hairline text-xs space-y-1.5">
              <span className="eyebrow block">ASSISTED MODE</span>
              <p className="text-ink-soft leading-relaxed">
                GetSwydd prepares and reviews your verified answers. You complete the final submission directly on the employer&apos;s site.
              </p>
            </div>

            <div className="space-y-1">
              <StartApplication job={job} fullWidth triggerSize="md" triggerVariant="secondary" />
            </div>
          </div>
        )}

        {/* Employer page external link */}
        {job.apply_url && (
          <div className="border-t border-hairline pt-4 space-y-1">
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-3 py-2 rounded-md border border-hairline-strong bg-paper-raised text-xs font-medium text-ink hover:bg-cream/40 transition-colors"
            >
              <span>Apply on employer site</span>
              <span className="font-mono text-[10px] text-sage-deep ml-1.5">
                ({hostname}) &nearr;
              </span>
            </a>
          </div>
        )}

        {/* Deadline Urgency block */}
        {deadlineInfo && deadlineInfo.text && (
          <div className="border-t border-hairline pt-4 text-xs space-y-1">
            <span className="eyebrow block">APPLICATION CLOSING</span>
            <p className={deadlineInfo.isUrgent ? "text-ochre font-semibold" : "text-ink"}>
              {deadlineInfo.text}
            </p>
            {deadlineInfo.isUrgent && (
              <p className="text-[11px] text-sage-deep">
                This listing closes in 7 days or less.
              </p>
            )}
          </div>
        )}

        {/* Back to discovery */}
        <div className="border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-sage-deep hover:text-ink underline cursor-pointer"
          >
            &larr; Back to results
          </button>
        </div>
      </Panel>
    </aside>
  );
}
