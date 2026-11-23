"use client";

import React, { useEffect, useState } from "react";
import {
  deleteResume,
  getProfile,
  getResume,
  listResumes,
  uploadResume,
} from "@/lib/api";
import type {
  ProfileFact,
  ResumeDetail,
  ResumeSummary,
} from "@/lib/api/types";
import { formatRelativeDate } from "@/lib/format";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { PageContainer } from "@/components/shell";
import { Badge, Button, ErrorState, PageHeader, Panel } from "@/components/ui";
import { AgentDiscovery } from "@/components/discovery/AgentDiscovery";
import { ResumeReview } from "@/components/resumes/ResumeReview";
import { MasterProfilePanel } from "@/components/resumes/MasterProfilePanel";
import { ResumeUploadZone } from "@/components/resumes/ResumeUploadZone";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ResumesPage() {
  usePageTitle("Your Resumes");
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [profile, setProfile] = useState<ProfileFact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ResumeDetail | null>(null);

  const [uploading, setUploading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load uploaded resumes list and confirmed profile
  useEffect(() => {
    const controller = new AbortController();

    Promise.all([listResumes(controller.signal), getProfile(controller.signal)])
      .then(([docs, prof]) => {
        if (!controller.signal.aborted) {
          setResumes(docs);
          setProfile(prof.facts);
          setLoadError(null);
          if (!docs.some((doc) => doc.id === selectedId)) setSelectedId(docs[0]?.id ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(err instanceof Error ? err.message : "Could not load resumes.");
        }
      });

    return () => controller.abort();
  }, [refreshTrigger, selectedId]);

  // Load selected resume detail when selectedId changes
  useEffect(() => {
    if (!selectedId) return;

    const controller = new AbortController();
    getResume(selectedId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setSelectedDetail(detail);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setActionError(err instanceof Error ? err.message : "Could not open resume.");
        }
      });

    return () => controller.abort();
  }, [selectedId, refreshTrigger]);

  function validateFile(file: File): string | null {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      return "Only text-based PDF or DOCX files are supported.";
    }
    if (file.size > MAX_BYTES) {
      return "Resume file must be 5 MB or smaller.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setActionError(null);
    setUploadNotice(null);
    setUploading(true);

    try {
      const uploaded = await uploadResume(file);
      setUploadNotice(`“${uploaded.filename}” uploaded successfully. Inspect suggestions below.`);
      setSelectedId(uploaded.id);
      setSelectedDetail(uploaded);
      setRefreshTrigger((c) => c + 1);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to upload resume document.");
    } finally {
      setUploading(false);
    }
  }

  function handleConfirmed(updated: ResumeDetail) {
    setSelectedDetail(updated);
    setUploadNotice("Verified facts merged into your confirmed profile.");
    setRefreshTrigger((c) => c + 1);
  }

  async function handleRemove(resume: ResumeSummary) {
    if (removing) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await deleteResume(resume.id);
      setResumes((current) => current?.filter((item) => item.id !== resume.id) ?? null);
      setProfile((current) => current
        .map((fact) => ({ ...fact, sources: fact.sources.filter((source) => source.resume_id !== resume.id) }))
        .filter((fact) => fact.sources.length > 0));
      setSelectedId((current) => current === resume.id ? null : current);
      setSelectedDetail((current) => current?.id === resume.id ? null : current);
      setRemoveTarget(null);
      setUploadNotice(`“${resume.filename}” was removed.`);
      setRefreshTrigger((count) => count + 1);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Could not remove the resume.");
    } finally {
      setRemoving(false);
    }
  }

  const activeDetail = selectedDetail?.id === selectedId ? selectedDetail : null;

  return (
    <PageContainer>
      <PageHeader
        title="Resumes"
        description="Review the facts extracted from each resume before GetSwydd uses them to match jobs and prepare applications."
      />

      {loadError && (
        <ErrorState
          title="Could not load resumes"
          message={loadError}
          onRetry={() => setRefreshTrigger((c) => c + 1)}
          className="mb-6"
        />
      )}

      {uploadNotice && (
        <div role="status" className="mb-6 p-3.5 rounded-md bg-moss-tint/50 border border-moss/30 text-xs text-moss font-medium">
          {uploadNotice}
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:gap-6">
        {/* Left Column: Upload Dropzone & Resume List */}
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <ResumeUploadZone
            uploading={uploading}
            onFileSelected={handleFile}
            validationError={validationError}
            actionError={actionError}
          />

          {/* Uploaded Resumes List */}
          <Panel title="Uploaded resumes">
            {resumes === null ? (
              <p className="text-xs text-sage-deep">Loading uploads…</p>
            ) : resumes.length === 0 ? (
              <p className="text-xs text-sage-deep">No resumes uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {resumes.map((resume) => {
                  const isSelected = resume.id === selectedId;
                  return (
                    <li
                      key={resume.id}
                      className={`p-3 -mx-2 rounded-md transition-colors ${
                        isSelected
                          ? "border-l-2 border-l-moss bg-moss-tint/60 font-medium"
                          : "hover:bg-paper"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(resume.id)}
                        className="w-full cursor-pointer space-y-1 rounded-sm text-left"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 basis-32 wrap-anywhere text-xs font-semibold text-ink">
                            {resume.filename}
                          </span>
                          <Badge tone={resume.reviewed ? "verified" : "attention"}>
                            {resume.reviewed ? "Facts confirmed" : "Awaiting review"}
                          </Badge>
                        </div>
                        <p className="font-mono text-[11px] text-sage-deep">
                          Uploaded {formatRelativeDate(resume.uploaded_at)}
                        </p>
                      </button>
                      {removeTarget === resume.id ? (
                        <div className="mt-2 space-y-2 rounded-md border border-hairline p-2">
                          <p className="text-xs text-ink-soft">
                            Remove this upload and any facts unique to it? Existing application drafts keep their saved details.
                          </p>
                          {removeError && <p role="alert" className="text-xs text-brick">{removeError}</p>}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="danger" loading={removing} onClick={() => void handleRemove(resume)}>
                              {removing ? "Removing…" : "Remove resume"}
                            </Button>
                            <Button size="sm" variant="secondary" disabled={removing} onClick={() => setRemoveTarget(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="quiet"
                          className="mt-2 text-xs"
                          aria-label={`Remove ${resume.filename}`}
                          disabled={removing}
                          onClick={() => {
                            setRemoveTarget(resume.id);
                            setRemoveError(null);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right Column: Review Panel & Merged Confirmed Profile */}
        <div className="min-w-0 space-y-5 lg:space-y-6">
          {activeDetail ? (
            <>
              {Boolean(activeDetail.confirmed_facts?.skills.length) && (
                <AgentDiscovery
                  key={`search:${activeDetail.id}:${activeDetail.revision}`}
                  resume={{ resume_id: activeDetail.id, filename: activeDetail.filename }}
                />
              )}
              <ResumeReview
                key={`${activeDetail.id}:${activeDetail.revision}`}
                resume={activeDetail}
                onConfirmed={handleConfirmed}
              />
            </>
          ) : (
            <Panel className="p-8 text-center text-sage-deep">
              <p className="text-sm">
                {selectedId ? "Loading resume…" : "Select an uploaded resume to review its extracted facts."}
              </p>
            </Panel>
          )}

          {/* Merged Master Profile Display */}
          <MasterProfilePanel profile={profile} />
        </div>
      </div>
    </PageContainer>
  );
}
