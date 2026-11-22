"use client";

import React from "react";
import type { SubmissionReceipt } from "@/lib/api/types";
import { Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";

export interface SubmissionReceiptCardProps {
  receipt: SubmissionReceipt;
}

export function SubmissionReceiptCard({ receipt }: SubmissionReceiptCardProps) {
  return (
    <div className="p-4 rounded-md bg-moss-tint/40 border border-moss/30 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-moss font-semibold">DISPATCH RECEIPT</span>
        <Badge tone="verified">Delivered</Badge>
      </div>

      <div className="space-y-1 text-ink">
        <p className="font-medium">
          Delivered to Local Test Employer Inbox
        </p>
        <p className="text-[11px] text-sage-deep">
          Submitted on {formatDate(receipt.submitted_at)}
        </p>
        <p className="font-mono text-[10px] text-ink-soft break-all bg-paper/60 p-1.5 rounded border border-moss/20">
          Receipt ID: {receipt.id}
        </p>
      </div>

      <div className="pt-1">
        <Button variant="secondary" size="sm" href="/applications" className="w-full justify-center">
          View in Application Tracker &rarr;
        </Button>
      </div>
    </div>
  );
}
