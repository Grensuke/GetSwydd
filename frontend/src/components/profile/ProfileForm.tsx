"use client";

import React from "react";
import type { ApplicationDetails } from "@/lib/api/types";
import { Button, Field, Input, Panel, SourceTag, Textarea } from "@/components/ui";

export interface ProfileFormProps {
  initialData: ApplicationDetails | null;
  candidateName: string;
  onCandidateNameChange: (val: string) => void;
  availability: string;
  onAvailabilityChange: (val: string) => void;
  isDirty: boolean;
  saving: boolean;
  saveError: string | null;
  fieldErrors: { candidateName?: string; availability?: string };
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDiscard: () => void;
}

export function ProfileForm({
  initialData,
  candidateName,
  onCandidateNameChange,
  availability,
  onAvailabilityChange,
  isDirty,
  saving,
  saveError,
  fieldErrors,
  onSubmit,
  onDiscard,
}: ProfileFormProps) {
  return (
    <Panel title="Application details">
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        {/* 1. Candidate Full Name (Required) */}
        <div className="space-y-2 p-4 rounded-md border border-hairline bg-paper">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
            <span className="eyebrow">LEGAL IDENTITY</span>
            <SourceTag source={initialData?.candidate_name ? "user_supplied" : "missing"} />
          </div>
          <Field
            label="Full name"
            required
            hint="Used on the application drafts you prepare."
            error={fieldErrors.candidateName}
          >
            {({ id, ariaDescribedBy }) => (
              <Input
                id={id}
                aria-describedby={ariaDescribedBy}
                value={candidateName}
                onChange={(e) => onCandidateNameChange(e.currentTarget.value)}
                placeholder="e.g. Alex Morgan"
                maxLength={120}
                error={Boolean(fieldErrors.candidateName)}
              />
            )}
          </Field>
        </div>

        {/* 2. Availability (Optional) */}
        <div className="space-y-2 p-4 rounded-md border border-hairline bg-paper">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
            <span className="eyebrow">SCHEDULE & AVAILABILITY</span>
            {initialData?.availability && <SourceTag source="user_supplied" />}
          </div>
          <Field
            label="Availability (optional)"
            hint="Used when screening asks for your earliest start date and weekly commitment."
            error={fieldErrors.availability}
          >
            {({ id, ariaDescribedBy }) => (
              <Textarea
                id={id}
                rows={2}
                aria-describedby={ariaDescribedBy}
                value={availability}
                onChange={(e) => onAvailabilityChange(e.currentTarget.value)}
                placeholder="e.g. From 1 June, 20 hours per week"
                maxLength={350}
                error={Boolean(fieldErrors.availability)}
              />
            )}
          </Field>
        </div>

        {saveError && (
          <p role="alert" className="text-xs font-medium text-brick" aria-live="polite">
            {saveError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!isDirty || saving}
            loading={saving}
          >
            Save details
          </Button>
          {isDirty && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onDiscard}
            >
              Discard edits
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
