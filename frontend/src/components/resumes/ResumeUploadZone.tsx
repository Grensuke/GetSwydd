"use client";

import { Field, InlineNotice, Input, Panel } from "@/components/ui";

interface ResumeUploadZoneProps {
  uploading: boolean;
  onFileSelected: (file: File) => void;
  validationError: string | null;
  actionError: string | null;
}

export function ResumeUploadZone({
  uploading,
  onFileSelected,
  validationError,
  actionError,
}: ResumeUploadZoneProps) {
  return (
    <Panel title="Upload a resume">
      <div
        className="space-y-3 rounded-md border border-dashed border-hairline-strong p-3"
        aria-busy={uploading}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files.item(0);
          if (file && !uploading) onFileSelected(file);
        }}
      >
        <Field
          label="Resume file"
          hint="Choose or drop a text-based PDF or DOCX up to 5 MB."
          error={validationError}
        >
          {({ id, ariaDescribedBy }) => (
            <Input
              id={id}
              type="file"
              accept=".pdf,.docx"
              disabled={uploading}
              aria-describedby={ariaDescribedBy}
              aria-invalid={Boolean(validationError)}
              onChange={(event) => {
                const file = event.currentTarget.files?.item(0);
                event.currentTarget.value = "";
                if (file) onFileSelected(file);
              }}
              className="file:mr-2 file:rounded-sm file:bg-cream file:px-2 file:py-1 file:text-on-cream"
            />
          )}
        </Field>
        {uploading && <p role="status" className="text-xs text-sage-deep">Uploading resume…</p>}
        {actionError && <InlineNotice role="alert" variant="problem">{actionError}</InlineNotice>}
      </div>
    </Panel>
  );
}
