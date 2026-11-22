"use client";

import { type FormEvent, useState } from "react";
import { confirmResume, factCategories, factLabels, type ResumeDetail, type ResumeFacts } from "./resume-api";

export default function ResumeReview({
  resume,
  onConfirmed,
}: {
  resume: ResumeDetail;
  onConfirmed: (resume: ResumeDetail) => void;
}) {
  const [fields, setFields] = useState(() => {
    const facts = resume.confirmed_facts ?? resume.suggested_facts;
    return Object.fromEntries(factCategories.map((category) => [category, facts[category].join("\n")]));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const facts = Object.fromEntries(factCategories.map((category) => [
      category,
      fields[category].split("\n").map((item) => item.trim()).filter(Boolean),
    ])) as ResumeFacts;
    if (factCategories.some((category) => facts[category].length > 80 || facts[category].some((item) => item.length > 350))) {
      setError("Use up to 80 facts per section and keep each line to 350 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onConfirmed(await confirmResume(resume, facts));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not confirm the resume.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="break-words text-lg font-semibold">Review {resume.filename}</h2>
      <p className="mt-1 text-sm text-slate-600">
        Check the extracted text, correct the suggestions, and enter one fact per line.
        Only confirmed facts appear in your profile.
      </p>
      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-indigo-700">View extracted text</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-slate-700">{resume.extracted_text}</pre>
      </details>
      <form onSubmit={save} className="mt-5">
        <fieldset disabled={saving} className="space-y-4">
          {factCategories.map((category) => (
            <label key={category} className="block text-sm font-medium">
              {factLabels[category]}
              <textarea
                rows={3}
                value={fields[category]}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFields((current) => ({ ...current, [category]: value }));
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal"
              />
            </label>
          ))}
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Confirming…" : "Confirm facts"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      </form>
    </section>
  );
}
