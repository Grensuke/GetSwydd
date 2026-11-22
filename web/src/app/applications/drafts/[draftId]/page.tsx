"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import {
  type ApplicationDraft,
  requestApplicationDraft,
  submitApplicationDraft,
} from "@/app/application-drafts";

const loadingMessage = <p role="status">Loading application draft…</p>;

export default function ApplicationDraftPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-medium text-indigo-700 hover:underline">
          Back to jobs
        </Link>
        <h1 className="mb-5 mt-4 text-2xl font-bold">Application draft</h1>
        <Suspense fallback={loadingMessage}>
          <DraftById />
        </Suspense>
      </div>
    </main>
  );
}

function DraftById() {
  const { draftId } = useParams<{ draftId: string }>();
  return <DraftEditor key={draftId} path={`/${encodeURIComponent(draftId)}`} />;
}

function DraftEditor({ path }: { path: string }) {
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [approvedVersion, setApprovedVersion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    requestApplicationDraft(path, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setDraft(result);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Could not load the draft.");
        }
      });

    return () => controller.abort();
  }, [path, retryCount]);

  if (loadError) {
    return (
      <div>
        <p role="alert" className="text-sm text-rose-700">{loadError}</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
          onClick={() => {
            setLoadError(null);
            setRetryCount((count) => count + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!draft) return loadingMessage;

  const changedAnswers = Object.fromEntries(
    draft.screening_questions
      .filter((question) =>
        question.id in edits && edits[question.id].trim() !== (question.answer ?? ""))
      .map((question) => [question.id, edits[question.id].trim()]),
  );
  const hasChanges = Object.keys(changedAnswers).length > 0;
  const canApprove = draft.ready_for_review && !hasChanges && !saving && !submitting;

  async function saveAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || saving || submitting) return;
    setSaving(true);
    setSaveError(null);

    try {
      const updated = await requestApplicationDraft(`${path}/answers`, {
        method: "PATCH",
        body: JSON.stringify({ answers: changedAnswers }),
      });
      setDraft(updated);
      setEdits({});
      setApprovedVersion(null);
      setSubmissionError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the answers.");
    } finally {
      setSaving(false);
    }
  }

  async function approveAndSubmit() {
    if (!draft || draft.submission || !canApprove || approvedVersion !== draft.updated_at) return;
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const receipt = await submitApplicationDraft(path, draft.updated_at);
      setDraft({ ...draft, submission: receipt });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Could not submit the test application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-900">{draft.job_title}</h2>
      <p className="mt-1 text-sm text-slate-600">{draft.company} · Sample candidate {draft.candidate_name}</p>
      <p className="mt-3 break-words text-sm text-slate-700">
        <span className="font-semibold">Selected resume </span>
        {draft.selected_resume}
      </p>
      <p role="status" className="mt-3 text-sm font-semibold text-indigo-700">
        {draft.submission
          ? "Submitted to local test employer"
          : hasChanges
            ? "Unsaved changes"
            : draft.ready_for_review
              ? "Ready for review"
              : "Required answers missing"}
      </p>

      <form onSubmit={saveAnswers} className="mt-6">
        <fieldset disabled={saving || submitting} className="space-y-4">
          <legend className="mb-3 font-semibold text-slate-900">Screening questions</legend>
          {draft.screening_questions.map((question) => (
            <div key={question.id}>
              <label htmlFor={question.id} className="block text-sm font-medium text-slate-800">
                {question.question}{question.required ? " (required)" : ""}
              </label>
              <p id={`${question.id}-source`} className="mt-1 text-xs text-slate-600">
                {question.source === "verified_profile"
                  ? "From the verified sample profile"
                  : question.source === "user_supplied"
                    ? "Saved answer"
                    : draft.missing_required_questions.includes(question.id)
                      ? "Answer needed"
                      : "Optional answer"}
              </p>
              <textarea
                id={question.id}
                aria-describedby={`${question.id}-source`}
                rows={3}
                readOnly={Boolean(draft.submission)}
                value={edits[question.id] ?? question.answer ?? ""}
                onChange={(event) => {
                  const answer = event.currentTarget.value;
                  setEdits((previous) => ({ ...previous, [question.id]: answer }));
                  setApprovedVersion(null);
                  setSubmissionError(null);
                }}
                className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
              />
            </div>
          ))}
          {!draft.submission && (
            <button
              type="submit"
              disabled={!hasChanges || saving || submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save answers"}
            </button>
          )}
        </fieldset>
        {saveError && <p role="alert" className="mt-3 text-sm text-rose-700">{saveError}</p>}
      </form>
      <div className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm">
        {draft.submission ? (
          <>
            <p className="break-all"><span className="font-semibold">Test receipt </span>{draft.submission.id}</p>
            <Link href="/applications" className="font-medium text-indigo-700 hover:underline">
              Open application tracker
            </Link>
          </>
        ) : (
          <>
            <h3 className="font-semibold">Submit to the local test employer</h3>
            <label className="flex items-start gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={approvedVersion === draft.updated_at}
                disabled={!canApprove}
                onChange={(event) => setApprovedVersion(event.currentTarget.checked ? draft.updated_at : null)}
                className="mt-0.5 accent-indigo-600"
              />
              I reviewed the saved answers and resume selection and approve this test submission.
            </label>
            <button
              type="button"
              disabled={!canApprove || approvedVersion !== draft.updated_at}
              onClick={approveAndSubmit}
              className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Approve and submit test application"}
            </button>
            {submissionError && <p role="alert" className="text-rose-700">{submissionError}</p>}
          </>
        )}
      </div>
    </section>
  );
}
