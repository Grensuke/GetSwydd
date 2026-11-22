"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { requestApplicationDraft } from "./application-drafts";

export default function DraftApplicationButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const creating = useRef(false);
  const [requestPending, setRequestPending] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pending = requestPending || navigating;

  async function createDraft() {
    if (creating.current || navigating) return;
    creating.current = true;
    setRequestPending(true);
    setError(null);

    try {
      const draft = await requestApplicationDraft("", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId }),
      });
      startNavigation(() => {
        router.push(`/applications/drafts/${encodeURIComponent(draft.id)}`);
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the draft.");
    } finally {
      creating.current = false;
      setRequestPending(false);
    }
  }

  return (
    <div className="self-end text-right sm:self-auto">
      <button
        type="button"
        onClick={createDraft}
        disabled={pending}
        className="whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creating draft…" : "Draft Application"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
