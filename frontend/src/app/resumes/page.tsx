"use client";

import React, { useEffect, useState } from "react";
import {
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
import { Badge, ErrorState, PageHeader, Panel } from "@/components/ui";
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
          // Auto-select first resume if none selected
          if (!selectedId && docs.length > 0) {
            setSelectedId(docs[0].id);
          }
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

  return (
    <PageContainer>
      {/* Editorial Header */}
      <PageHeader
        eyebrow="YOUR RESUMES"
        title="The record everything else is built from."
        description="Only qualifications and experiences you review and confirm are ever used in your applications. Upload resumes, inspect extracted claims, and establish your verified profile."
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
      <div className="grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
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
          <Panel eyebrow="VAULT" title="Uploaded Resumes">
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
                          ? "bg-cream/40 border-l-2 border-l-ink font-medium"
                          : "hover:bg-cream/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(resume.id)}
                        className="w-full text-left cursor-pointer space-y-1 focus:outline-none"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-sans font-semibold text-xs text-ink break-all">
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
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right Column: Review Panel & Merged Confirmed Profile */}
        <div className="space-y-8 min-w-0">
          {selectedDetail ? (
            <ResumeReview
              key={`${selectedDetail.id}:${selectedDetail.revision}`}
              resume={selectedDetail}
              onConfirmed={handleConfirmed}
            />
          ) : (
            <Panel className="p-8 text-center text-sage-deep">
              <span className="eyebrow block mb-2">NO SELECTION</span>
              <p className="text-sm">Select an uploaded resume on the left to review its extracted facts.</p>
            </Panel>
          )}

          {/* Merged Master Profile Display */}
          <MasterProfilePanel profile={profile} />
        </div>
      </div>
    </PageContainer>
  );
}
