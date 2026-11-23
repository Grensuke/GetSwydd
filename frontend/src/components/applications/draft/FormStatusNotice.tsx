"use client";

import React from "react";
import type { ApplicationDraft } from "@/lib/api/types";
import { InlineNotice } from "@/components/ui";
import { FORM_STATUS_MAP } from "@/lib/labels";

export interface FormStatusNoticeProps {
  draft: ApplicationDraft;
}

export function FormStatusNotice({ draft }: FormStatusNoticeProps) {
  if (draft.mode !== "assisted" || !draft.form_status) {
    return null;
  }

  const info = FORM_STATUS_MAP[draft.form_status];
  if (!info) return null;

  if (draft.form_status === "loaded") {
    return (
      <InlineNotice variant="info">
        <span className="font-medium">{info.label}:</span> {info.description} All screening answers have been anchored in verified facts from your selected resume.
      </InlineNotice>
    );
  }

  if (draft.form_status === "partial") {
    return (
      <InlineNotice variant="attention">
        <span className="font-medium">{info.label}:</span> {info.description} Review each answer below; you may need to fill remaining fields manually on the employer&apos;s site.
      </InlineNotice>
    );
  }

  return (
    <InlineNotice variant="problem">
      <span className="font-medium">{info.label}:</span> {info.description} You will need to complete screening questions directly on the employer&apos;s application portal.
    </InlineNotice>
  );
}
