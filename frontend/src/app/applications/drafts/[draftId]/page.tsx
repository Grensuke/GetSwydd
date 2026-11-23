"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { type FormEvent, Suspense, useEffect, useState } from "react";
import { getDraft, updateAnswers } from "@/lib/api";
import type { ApplicationDraft } from "@/lib/api/types";
import { PageContainer } from "@/components/shell";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { Button, ErrorState, InlineNotice, Panel, Skeleton } from "@/components/ui";
import { DraftHeader } from "@/components/applications/draft/DraftHeader";
import { FormStatusNotice } from "@/components/applications/draft/FormStatusNotice";
import { QuestionBlock } from "@/components/applications/draft/QuestionBlock";
import { ReviewPanel } from "@/components/applications/draft/ReviewPanel";

const loadingSkeleton = (
  <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function ApplicationDraftPage() {
  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-wider text-sage-deep hover:text-ink transition-colors"
        >
          &larr; Back to opportunities
        </Link>
      </div>
      <Suspense fallback={loadingSkeleton}>
        <DraftById />
      </Suspense>
    </PageContainer>
  );
}

function DraftById() {
  const { draftId } = useParams<{ draftId: string }>();
  return <DraftEditor key={draftId} draftId={draftId} />;
}

function DraftEditor({ draftId }: { draftId: string }) {
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  usePageTitle(draft ? `Draft: ${draft.job_title}` : "Application Draft");

  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getDraft(draftId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDraft(result);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !(err instanceof DOMException && err.name === "AbortError")) {
          setLoadError(err instanceof Error ? err.message : "Could not load the application draft.");
        }
      });

    return () => controller.abort();
  }, [draftId, retryCount]);

  // Dirty answer tracking
  const changedAnswers = draft
    ? Object.fromEntries(
        draft.screening_questions
          .filter((q) => q.id in edits && edits[q.id].trim() !== (q.answer ?? ""))
          .map((q) => [q.id, edits[q.id].trim()])
      )
    : {};
  const hasChanges = Object.keys(changedAnswers).length > 0;

  // Unsaved changes browser navigation guard
  useEffect(() => {
    if (!hasChanges) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  if (loadError) {
    return (
      <ErrorState
        title="Could not load application draft"
        message={loadError}
        onRetry={() => {
          setLoadError(null);
          setRetryCount((count) => count + 1);
        }}
      />
    );
  }

  if (!draft) return loadingSkeleton;

  const isLocked = Boolean(draft.submission || draft.reported_submitted_at || draft.employer_submission_status);

  async function handleSaveAnswers(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasChanges || saving || isLocked) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccessNotice(null);

    try {
      const updated = await updateAnswers(draftId, changedAnswers);
      setDraft(updated);
      setEdits({});
      setSaveSuccessNotice("Screening answers saved. Review updated draft readiness below.");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save answers.");
    } finally {
      setSaving(false);
    }
  }

  function scrollToQuestion(questionId: string) {
    const el = document.getElementById(`field-${questionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  return (
    <div className="space-y-6">
      <DraftHeader draft={draft} />

      <FormStatusNotice draft={draft} />

      {saveSuccessNotice && (
        <InlineNotice variant="info">
          {saveSuccessNotice}
        </InlineNotice>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_21rem] items-start">
        {/* Left Column: Form & Questions */}
        <div className="space-y-6">
          <Panel eyebrow="SCREENING QUESTIONS" title="Application Answers">
            <p className="text-xs text-ink-soft mb-6">
              Review prefilled facts. Fields missing confirmed profile evidence are left blank for your explicit input.
            </p>

            <form onSubmit={handleSaveAnswers} className="space-y-6">
              <fieldset disabled={saving || isLocked} className="space-y-4">
                {draft.screening_questions.map((question) => {
                  const currentValue = edits[question.id] ?? question.answer ?? "";
                  const isEdited = question.id in edits && edits[question.id] !== (question.answer ?? "");

                  return (
                    <QuestionBlock
                      key={question.id}
                      question={question}
                      value={currentValue}
                      hasEdited={isEdited}
                      disabled={saving || isLocked}
                      onChange={(nextVal) => {
                        setEdits((prev) => ({ ...prev, [question.id]: nextVal }));
                        setSaveSuccessNotice(null);
                      }}
                    />
                  );
                })}

                {!isLocked && (
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-hairline">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={!hasChanges || saving}
                      loading={saving}
                    >
                      {saving ? "Saving…" : "Save draft answers"}
                    </Button>

                    {hasChanges && (
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        disabled={saving}
                        onClick={() => {
                          setEdits({});
                          setSaveError(null);
                        }}
                      >
                        Discard unsaved edits
                      </Button>
                    )}

                    {hasChanges && (
                      <span className="text-xs text-sage-deep font-mono">
                        {Object.keys(changedAnswers).length} unsaved change{Object.keys(changedAnswers).length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </fieldset>

              {saveError && (
                <div className="mt-3">
                  <InlineNotice variant="problem">
                    {saveError}
                  </InlineNotice>
                </div>
              )}
            </form>
          </Panel>
        </div>

        {/* Right Column: Sticky Review & Approval Aside */}
        <ReviewPanel
          draft={draft}
          hasUnsavedChanges={hasChanges || saving}
          onRefreshDraft={() => setRetryCount((c) => c + 1)}
          onDraftUpdated={setDraft}
          onScrollToQuestion={scrollToQuestion}
        />
      </div>
    </div>
  );
}
