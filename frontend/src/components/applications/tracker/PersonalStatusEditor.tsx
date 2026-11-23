"use client";

import React, { useState } from "react";
import type { TrackedApplication } from "@/lib/applications/normalize";
import { type PersonalStage, PERSONAL_STAGE_MAP } from "@/lib/applications/status";
import { usePersonalStatus } from "@/lib/applications/personal-status";
import { Button, Field, InlineNotice, Input, Select, Sheet, Textarea } from "@/components/ui";

export interface PersonalStatusEditorProps {
  open: boolean;
  onClose: () => void;
  app: TrackedApplication | null;
  onAnnounce?: (msg: string) => void;
}

export function PersonalStatusEditor({
  open,
  onClose,
  app,
  onAnnounce,
}: PersonalStatusEditorProps) {
  if (!app) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Personal Application Note">
      {open && (
        <PersonalStatusForm
          key={app.key}
          app={app}
          onClose={onClose}
          onAnnounce={onAnnounce}
        />
      )}
    </Sheet>
  );
}

function PersonalStatusForm({
  app,
  onClose,
  onAnnounce,
}: {
  app: TrackedApplication;
  onClose: () => void;
  onAnnounce?: (msg: string) => void;
}) {
  const { status, updateStatus, clearStatus } = usePersonalStatus(app.key);

  const [stage, setStage] = useState<string>(status?.stage ?? "");
  const [note, setNote] = useState<string>(status?.note ?? "");
  const [relevantDate, setRelevantDate] = useState<string>(status?.relevantDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const finalStage = stage ? (stage as PersonalStage) : null;
    updateStatus({
      stage: finalStage,
      note: note.trim() || undefined,
      relevantDate: relevantDate || undefined,
    });
    const stageLabel = finalStage ? PERSONAL_STAGE_MAP[finalStage]?.label : "Cleared";
    onAnnounce?.(`Saved personal note for ${app.company}: ${stageLabel}`);
    onClose();
  }

  function handleRemove() {
    clearStatus();
    onAnnounce?.(`Removed personal note for ${app.company}`);
    onClose();
  }

  return (
    <div className="p-5 space-y-6">
      {/* App identity snippet */}
      <div className="p-3 bg-paper rounded-md border border-hairline space-y-1 text-xs">
        <span className="eyebrow block text-sage-deep">{app.company}</span>
        <p className="wrap-anywhere font-display text-base font-medium text-ink">{app.jobTitle}</p>
        <p className="text-sage-deep text-[11px] font-mono">Confirmed: {app.confirmedStage}</p>
      </div>

      {/* Privacy notice (Rule 1) */}
      <InlineNotice variant="info">
        Only you see this, and it&apos;s stored in this browser. It doesn&apos;t change the status on the employer&apos;s site.
      </InlineNotice>

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Personal Stage" hint="Private milestone tracking (never verified by GetSwydd)">
          {({ id }) => (
            <Select
              id={id}
              value={stage}
              onChange={(e) => setStage(e.currentTarget.value)}
            >
              <option value="">None (rely on confirmed stage)</option>
              <option value="saved">Saved / Bookmarked</option>
              <option value="assessment">Assessment / Take-Home</option>
              <option value="interview">Interview Process</option>
              <option value="offer">Offer Received</option>
              <option value="rejected">Rejected / Closed</option>
            </Select>
          )}
        </Field>

        <Field label="Personal Note" hint="Private reflections, interview prep, or contact notes">
          {({ id }) => (
            <div className="space-y-1">
              <Textarea
                id={id}
                rows={4}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                placeholder="e.g. Spoke with recruiter on Monday. Technical round scheduled for next week..."
              />
              <div className="text-right text-[11px] font-mono text-sage-deep">
                {note.length}/500
              </div>
            </div>
          )}
        </Field>

        <Field label="Relevant Date (Optional)" hint="e.g. Interview date, assignment deadline, or follow-up">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={relevantDate}
              onChange={(e) => setRelevantDate(e.currentTarget.value)}
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
          <div>
            {status && (
              confirmDelete ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleRemove}
                  >
                    Confirm remove
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-brick hover:text-brick/80 text-xs"
                >
                  Remove note
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="quiet" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save note
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
