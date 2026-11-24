"use client";

import React, { useEffect, useState } from "react";
import type { ApplicationDraft, GmailConnection } from "@/lib/api/types";
import { getGmailConnection, disconnectGmail, getGmailAuthorization, submitByEmail } from "@/lib/api/applications";
import { Button, Checkbox, InlineNotice } from "@/components/ui";
import { Mail, Paperclip, Send, CheckCircle2, ExternalLink, Unlink } from "lucide-react";

export interface GmailApplicationModalProps {
  draft: ApplicationDraft;
  canApprove: boolean;
  onDraftUpdated: (updated: ApplicationDraft) => void;
}

export function GmailApplicationModal({
  draft,
  canApprove,
  onDraftUpdated,
}: GmailApplicationModalProps) {
  const emailInfo = draft.application_email;
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [approved, setApproved] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getGmailConnection()
      .then((conn) => {
        if (active) setConnection(conn);
      })
      .catch(() => {
        if (active) setConnection({ configured: false, email: null });
      })
      .finally(() => {
        if (active) setLoadingConn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!emailInfo) return null;

  const isConnected = Boolean(connection?.email);
  const isSubmitted = draft.employer_submission_status === "submitted" || Boolean(draft.reported_submitted_at);

  async function handleConnect() {
    try {
      const auth = await getGmailAuthorization(draft.id);
      if (auth?.authorization_url) {
        window.location.href = auth.authorization_url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to obtain Gmail authorization.");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectGmail();
      setConnection({ configured: connection?.configured ?? false, email: null });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Gmail.");
    }
  }

  async function handleSendEmail() {
    if (!approved || !connection?.email || !canApprove) return;
    setSending(true);
    setError(null);

    try {
      const updated = await submitByEmail(draft.id, {
        approved: true,
        draft_updated_at: draft.updated_at,
        sender: connection.email,
      });
      onDraftUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gmail sending failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-paper-raised p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-moss-tint text-moss">
          <Mail size={16} aria-hidden="true" />
        </span>
        <h4 className="font-display text-base font-medium text-ink">
          Application by Email
        </h4>
      </div>

      <p className="text-xs text-ink-soft">
        The employer requested applications directly via email:{" "}
        <span className="font-mono font-medium text-ink">{emailInfo.instruction}</span>
      </p>

      {/* Email Packet Details Box */}
      <div className="space-y-2 rounded-lg border border-hairline bg-paper p-3 text-xs">
        <div className="grid gap-1 sm:grid-cols-[80px_1fr]">
          <span className="font-semibold text-sage-deep">To:</span>
          <span className="font-mono text-ink font-medium select-all">{emailInfo.recipient}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[80px_1fr]">
          <span className="font-semibold text-sage-deep">Subject:</span>
          <span className="text-ink font-medium">{emailInfo.subject}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-[80px_1fr] items-center">
          <span className="font-semibold text-sage-deep">Attachment:</span>
          <span className="inline-flex items-center gap-1 font-mono text-ink">
            <Paperclip size={12} className="text-sage-deep" aria-hidden="true" />
            {draft.selected_resume}
          </span>
        </div>

        <div className="mt-2 border-t border-hairline pt-2">
          <span className="font-semibold text-sage-deep block mb-1">Message Body:</span>
          <pre className="whitespace-pre-wrap font-sans text-ink leading-relaxed bg-paper-raised p-2.5 rounded border border-hairline">
            {emailInfo.body}
          </pre>
        </div>
      </div>

      {/* Gmail OAuth Connection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline p-3 bg-paper">
        <div className="flex items-center gap-2 text-xs">
          {loadingConn ? (
            <span className="text-sage-deep">Checking Gmail connection…</span>
          ) : isConnected ? (
            <>
              <span className="size-2 rounded-full bg-moss" aria-hidden="true" />
              <span className="text-ink font-medium">
                Connected as <strong className="font-mono">{connection?.email}</strong>
              </span>
            </>
          ) : (
            <span className="text-sage-deep">
              Gmail account not connected.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={handleDisconnect}
              className="!text-xs text-brick hover:bg-brick-tint/40 gap-1"
            >
              <Unlink size={12} aria-hidden="true" />
              Disconnect
            </Button>
          ) : connection?.configured ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleConnect}
              className="!text-xs gap-1"
            >
              <ExternalLink size={12} aria-hidden="true" />
              Connect Gmail
            </Button>
          ) : (
            <a
              href={`mailto:${encodeURIComponent(emailInfo.recipient)}?subject=${encodeURIComponent(
                emailInfo.subject
              )}&body=${encodeURIComponent(emailInfo.body)}`}
              className="inline-flex items-center gap-1 rounded-sm border border-hairline bg-paper-raised px-2.5 py-1 text-xs font-medium text-ink hover:border-moss/40"
            >
              <ExternalLink size={12} aria-hidden="true" />
              Open mail client
            </a>
          )}
        </div>
      </div>

      {isSubmitted ? (
        <div className="flex items-center gap-2 rounded-lg border border-moss/30 bg-moss-tint/40 p-3 text-xs text-moss font-medium">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Application has been delivered to {emailInfo.recipient} via Gmail.</span>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <Checkbox
            checked={approved}
            onChange={(e) => setApproved(e.currentTarget.checked)}
            disabled={!isConnected || !canApprove || sending}
            label={
              <span className="text-xs text-ink leading-snug">
                I have reviewed the email text and confirm that my résumé (
                <strong className="font-mono">{draft.selected_resume}</strong>) is ready to send to{" "}
                <strong>{emailInfo.recipient}</strong>.
              </span>
            }
          />

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!approved || !isConnected || !canApprove || sending}
            onClick={handleSendEmail}
            className="w-full sm:w-auto gap-1.5"
          >
            <Send size={13} aria-hidden="true" />
            <span>{sending ? "Sending email via Gmail…" : "Approve & Send via Gmail"}</span>
          </Button>
        </div>
      )}

      {error && <InlineNotice role="alert" variant="problem">{error}</InlineNotice>}
    </div>
  );
}

