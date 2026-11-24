"use client";

import { useState, type FormEvent } from "react";
import { confirmResume, factCategories, factLabels } from "@/app/resumes/resume-api";
import { Button, Field, InlineNotice, Input, Panel, Textarea } from "@/components/ui";
import { SkillTagEditor } from "./SkillTagEditor";
import { ProjectPreviewCards } from "./ProjectPreviewCards";
import type { ResumeContact, ResumeDetail, ResumeFacts, FactCategory } from "@/lib/api/types";

const contactFields = [
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone number", type: "tel" },
  { name: "linkedin", label: "LinkedIn profile URL", type: "url" },
  { name: "github", label: "GitHub profile URL", type: "url" },
] as const;

function editableFacts(facts: ResumeFacts): Record<FactCategory, string[]> {
  return Object.fromEntries(factCategories.map((category) => [category, [...facts[category]]])) as Record<FactCategory, string[]>;
}

interface ResumeReviewProps {
  resume: ResumeDetail;
  onConfirmed: (resume: ResumeDetail) => void;
}

export function ResumeReview({ resume, onConfirmed }: ResumeReviewProps) {
  const [fields, setFields] = useState<Record<FactCategory, string[]>>(() => editableFacts(resume.confirmed_facts ?? resume.suggested_facts));
  const [contact, setContact] = useState<ResumeContact>(resume.confirmed_contact ?? resume.suggested_contact ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const facts: ResumeFacts = {
      skills: fields.skills.map((s) => s.trim()).filter(Boolean),
      education: fields.education.map((s) => s.trim()).filter(Boolean),
      experience: fields.experience.map((s) => s.trim()).filter(Boolean),
      projects: fields.projects.map((s) => s.trim()).filter(Boolean),
      certifications: fields.certifications.map((s) => s.trim()).filter(Boolean),
    };

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
      const reviewedContact: ResumeContact = {};
      for (const { name } of contactFields) reviewedContact[name] = contact[name]?.trim() || null;
      onConfirmed(await confirmResume(resume, facts, reviewedContact));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not confirm the resume.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Review resume facts">
      <p className="break-words text-sm font-medium text-ink">{resume.filename}</p>
      <p className="mt-1 text-xs text-sage-deep">Review suggestions, adjust tags, and confirm the facts GetSwydd should use.</p>
      <details className="my-4 rounded-md border border-hairline p-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">View extracted text</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-soft">
          {resume.extracted_text}
        </pre>
      </details>
      <form onSubmit={save} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <div className="space-y-3 rounded-md border border-hairline p-3">
            <h4 className="text-sm font-medium text-ink">Contact and profile links</h4>
            <p className="text-xs text-sage-deep">Confirm the details you want GetSwydd to reuse in application drafts.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {contactFields.map(({ name, label, type }) => (
                <Field key={name} label={label}>
                  {({ id }) => (
                    <Input id={id} type={type} value={contact[name] ?? ""} onChange={(event) => {
                      const value = event.currentTarget.value;
                      setContact((previous) => ({ ...previous, [name]: value }));
                    }} />
                  )}
                </Field>
              ))}
            </div>
          </div>
          {resume.confirmed_facts && (
            <Button variant="secondary" size="sm" onClick={() => setFields(editableFacts(resume.suggested_facts))}>
              Use extracted fact suggestions
            </Button>
          )}

          {/* Interactive Skills Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-sage-deep">
              {factLabels.skills}
            </label>
            <SkillTagEditor
              skills={fields.skills}
              onChange={(next) => setFields((prev) => ({ ...prev, skills: next }))}
            />
          </div>

          {/* Structured Project Preview Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-sage-deep">
              {factLabels.projects}
            </label>
            <ProjectPreviewCards
              projectLines={fields.projects}
              onChange={(next) => setFields((prev) => ({ ...prev, projects: next }))}
            />
          </div>

          {/* Education, Experience, Certifications */}
          {(["education", "experience", "certifications"] as const).map((category) => (
            <Field
              key={category}
              label={`${factLabels[category]} (${fields[category].length} items)`}
              hint="One fact per line. Maximum 80 items."
            >
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={Math.max(3, Math.min(8, fields[category].length + 1))}
                  value={fields[category].join("\n")}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    const lines = value.split("\n").map((s) => s.trim()).filter(Boolean);
                    setFields((previous) => ({ ...previous, [category]: lines }));
                  }}
                  className="font-mono text-xs"
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
