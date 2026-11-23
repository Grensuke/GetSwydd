import React from "react";
import { Badge, type BadgeTone } from "./badge";

export type ProvenanceSource = "verified_profile" | "user_supplied" | "missing" | string | null;

export interface SourceTagProps {
  source?: ProvenanceSource;
  filename?: string | null;
  className?: string;
}

/**
 * Renders the provenance of an application answer or claimed credential.
 * Enforces Rule 1 (Verified Facts Only) by making evidence origins transparent.
 */
export function SourceTag({ source, filename, className }: SourceTagProps) {
  let label = "Needs your input";
  let tone: BadgeTone = "attention";

  if (source === "verified_profile") {
    tone = "verified";
    label = filename ? `Verified · ${filename}` : "Verified profile";
  } else if (source === "personal_note") {
    tone = "outline";
    label = "Your note, not verified";
  } else if (source === "user_supplied") {
    tone = "neutral";
    label = "Provided by you";
  } else if (!source || source === "missing") {
    tone = "attention";
    label = "Needs your input";
  } else {
    tone = "info";
    label = source;
  }

  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

