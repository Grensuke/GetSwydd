"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type SubmissionReceipt, listSubmissions } from "@/app/application-drafts";

export default function ApplicationTracker() {
  const [receipts, setReceipts] = useState<SubmissionReceipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listSubmissions(controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) setReceipts(results);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : "Could not load submissions.");
        }
      });
    return () => controller.abort();
  }, [retryCount]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-medium text-indigo-700 hover:underline">Back to jobs</Link>
        <h1 className="mb-5 mt-4 text-2xl font-bold">Application tracker</h1>
        {error ? (
          <>
            <p role="alert" className="text-sm text-rose-700">{error}</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
              onClick={() => {
                setError(null);
                setRetryCount((count) => count + 1);
              }}
            >
              Retry
            </button>
          </>
        ) : receipts === null ? (
          <p role="status">Loading test submissions…</p>
        ) : receipts.length === 0 ? (
          <p className="text-slate-600">No test applications submitted yet.</p>
        ) : (
          <ul className="space-y-4">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-xs">
                <Link
                  href={`/applications/drafts/${encodeURIComponent(receipt.draft_id)}`}
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  {receipt.job_title}
                </Link>
                <p className="mt-1 text-slate-600">{receipt.company}</p>
                <p className="mt-2">
                  Submitted to local test employer · <time dateTime={receipt.submitted_at}>
                    {new Date(receipt.submitted_at).toLocaleString()}
                  </time>
                </p>
                <p className="mt-2 break-words">{receipt.selected_resume}</p>
                <p className="mt-1 break-all text-slate-600">Receipt {receipt.id}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
