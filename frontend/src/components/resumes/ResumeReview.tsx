"use client";

import { useState, type FormEvent } from "react";
import { confirmResume, factCategories, factLabels } from "@/app/resumes/resume-api";
import { Button, Field, InlineNotice, Panel, Textarea } from "@/components/ui";
import type { ResumeDetail } from "@/lib/api/types";

interface ResumeReviewProps {
  resume: ResumeDetail;
  onConfirmed: (resume: ResumeDetail) => void;
}

export function ResumeReview({ resume, onConfirmed }: ResumeReviewProps) {
  const [fields, setFields] = useState(() => {
    const facts = resume.confirmed_facts ?? resume.suggested_facts;
    return Object.fromEntries(factCategories.map((category) => [category, facts[category].join("\n")]));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const facts = { ...resume.suggested_facts };
    for (const category of factCategories) {
      facts[category] = fields[category].split("\n").map((item) => item.trim()).filter(Boolean);
    }
    const exceedsLimit = factCategories.some(
      (category) => facts[category].length > 80 || facts[category].some((item) => item.length > 350),
    );
    if (exceedsLimit) {
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
    <Panel title="Review resume facts">
      <p className="break-words text-sm font-medium text-ink">{resume.filename}</p>
      <p className="mt-1 text-xs text-sage-deep">Correct or remove any suggestion. Enter one confirmed fact per line.</p>
      <details className="my-4 rounded-md border border-hairline p-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">View extracted text</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-soft">
          {resume.extracted_text}
        </pre>
      </details>
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={saving} className="space-y-4">
          {factCategories.map((category) => (
            <Field key={category} label={factLabels[category]}>
              {({ id }) => (
                <Textarea
                  id={id}
                  value={fields[category]}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFields((previous) => ({ ...previous, [category]: value }));
                  }}
                />
              )}
            </Field>
          ))}
          <Button type="submit">{saving ? "Confirming…" : "Confirm facts"}</Button>
        </fieldset>
        {error && <InlineNotice role="alert" variant="problem">{error}</InlineNotice>}
      </form>
    </Panel>
  );
}
