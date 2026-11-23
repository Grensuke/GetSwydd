"use client";

import { useState } from "react";
import {
  approveBrowserDemo, cancelBrowserDemo, openBrowserDemo,
  type BrowserDemoPreview, type SubmissionReceipt,
} from "@/lib/api";
import { Button, Checkbox, InlineNotice } from "@/components/ui";

interface Props {
  draftId: string;
  version: string;
  ready: boolean;
  onSubmitted: (receipt: SubmissionReceipt) => void;
}

export function BrowserApplicationDemo({ draftId, version, ready, onSubmitted }: Props) {
  const [preview, setPreview] = useState<BrowserDemoPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState<"open" | "submit" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewCurrent = preview?.draft_updated_at === version;

  async function perform(action: "open" | "submit" | "cancel") {
    if (pending) return;
    setPending(action);
    setError(null);
    try {
      if (action === "open") {
        setPreview(null);
        setApproved(false);
        setPreview(await openBrowserDemo(draftId, version));
      } else if (preview && action === "submit" && approved && previewCurrent && ready) {
        setApproved(false);
        onSubmitted(await approveBrowserDemo(draftId, preview));
      } else if (preview && action === "cancel") {
        await cancelBrowserDemo(draftId, preview.session_id);
        setPreview(null);
        setApproved(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "The browser demo could not complete this step.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Browser application demo" className="space-y-3 rounded-lg border border-hairline p-3">
      <h3 className="text-sm font-medium text-ink">Browser application demo</h3>
      <p className="text-xs text-ink-soft">
        Open a mock employer form filled with the sample candidate, résumé, and saved answers.
      </p>
      {preview && (
        <>
          <InlineNotice variant={previewCurrent && ready ? "info" : "attention"}>
            {previewCurrent && ready
              ? "Review the completed form in the Chromium window, then approve the test submission here."
              : "Save your changes and reopen the mock form to review the current draft."}
          </InlineNotice>
          <Checkbox
            label="I reviewed the mock form and approve this test submission."
            checked={approved && previewCurrent && ready}
            disabled={!previewCurrent || !ready || Boolean(pending)}
            onChange={(event) => setApproved(event.currentTarget.checked)}
          />
          <Button className="w-full" loading={pending === "submit"}
            disabled={!approved || !previewCurrent || !ready || Boolean(pending)} onClick={() => void perform("submit")}>
            Approve and submit test application
          </Button>
        </>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button variant={preview ? "secondary" : "primary"} loading={pending === "open"}
          disabled={!ready || Boolean(pending)} onClick={() => void perform("open")}>
          {preview ? "Reopen mock employer form" : "Fill mock employer form"}
        </Button>
        {preview && (
          <Button variant="quiet" disabled={Boolean(pending)} onClick={() => void perform("cancel")}>
            Close browser
          </Button>
        )}
      </div>
      {error && <InlineNotice variant="problem" role="alert">{error}</InlineNotice>}
    </section>
  );
}
