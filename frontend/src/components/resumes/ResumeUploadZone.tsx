"use client";

import { useState } from "react";
import { Field, InlineNotice, Input, Panel } from "@/components/ui";
import { UploadCloud } from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Panel title="Upload a resume">
      <div
        className={`space-y-3 rounded-lg border-2 border-dashed p-4 text-center transition-all ${
          isDragging
            ? "border-moss bg-moss-tint/30 scale-[1.01]"
            : "border-hairline-strong bg-paper/50 hover:border-moss/50"
        }`}
        aria-busy={uploading}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files.item(0);
          if (file && !uploading) onFileSelected(file);
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <span className={`flex size-10 items-center justify-center rounded-full transition-colors ${
            isDragging ? "bg-moss text-on-moss" : "bg-moss-tint text-moss"
          }`}>
            <UploadCloud size={20} aria-hidden="true" />
          </span>
          <p className="text-xs font-medium text-ink">
            {isDragging ? "Drop your resume file here" : "Choose or drag & drop your resume"}
          </p>
        </div>

        <Field
          label="Resume file"
          hint="Supports text-based PDF or DOCX up to 5 MB."
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
              className="file:mr-2 file:rounded-sm file:bg-cream file:px-2 file:py-1 file:text-on-cream cursor-pointer text-xs"
            />
          )}
        </Field>
        {uploading && <p role="status" className="text-xs text-moss font-medium animate-pulse">Uploading and extracting facts…</p>}
        {actionError && <InlineNotice role="alert" variant="problem">{actionError}</InlineNotice>}
      </div>
    </Panel>
  );
}
