"use client";

import React, { type FormEvent, useEffect, useState } from "react";
import { getApplicationDetails, saveApplicationDetails } from "@/lib/api";
import type { ApplicationDetails } from "@/lib/api/types";
import { PageContainer } from "@/components/shell";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileGuaranteesAside } from "@/components/profile/ProfileGuaranteesAside";

export default function ProfilePage() {
  usePageTitle("Candidate Profile");
  const [initialData, setInitialData] = useState<ApplicationDetails | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [availability, setAvailability] = useState("");
  const [ukAuth, setUkAuth] = useState<"authorized" | "not_authorized" | "">("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ candidateName?: string; availability?: string }>({});

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchDetails() {
      try {
        setLoading(true);
        const data = await getApplicationDetails(controller.signal);
        if (active) {
          setInitialData(data);
          setCandidateName(data.candidate_name || "");
          setAvailability(data.availability || "");
          setUkAuth(data.uk_work_authorization || "");
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setLoadError(err instanceof Error ? err.message : "Could not load application details.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDetails();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const isDirty =
    initialData !== null &&
    (candidateName.trim() !== (initialData.candidate_name || "").trim() ||
      availability.trim() !== (initialData.availability || "").trim() ||
      ukAuth !== (initialData.uk_work_authorization || ""));

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmedCount = [
    Boolean(candidateName.trim()),
    Boolean(availability.trim()),
    Boolean(ukAuth),
  ].filter(Boolean).length;

  function validate(): boolean {
    const errors: { candidateName?: string; availability?: string } = {};
    const trimmedName = candidateName.trim();
    const trimmedAvail = availability.trim();

    if (!trimmedName) {
      errors.candidateName = "Candidate name is required to draft personalized applications.";
    } else if (trimmedName.length > 120) {
      errors.candidateName = "Candidate name must be 120 characters or fewer.";
    }

    if (trimmedAvail.length > 350) {
      errors.availability = "Availability note must be 350 characters or fewer.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate() || saving) return;

    setSaving(true);
    setSaveError(null);
    setSuccessNotice(null);

    const payload: ApplicationDetails = {
      candidate_name: candidateName.trim() || null,
      availability: availability.trim() || null,
      uk_work_authorization: ukAuth || null,
    };

    try {
      const saved = await saveApplicationDetails(payload);
      setInitialData(saved);
      setCandidateName(saved.candidate_name || "");
      setAvailability(saved.availability || "");
      setUkAuth(saved.uk_work_authorization || "");
      setSuccessNotice("Saved. Future drafts will automatically anchor to these details.");
      setFieldErrors({});
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save application details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="YOUR PROFILE"
        title="Details you confirm once, reused everywhere."
        description="These verified details auto-populate screening forms across all job applications. GetSwydd never fabricates, exaggerates, or guesses answers."
      />

      {/* Completeness Indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="eyebrow">COMPLETENESS</span>
          <span className="font-mono font-semibold text-ink">
            {confirmedCount} of 3 details confirmed
          </span>
        </div>

        {isDirty && (
          <div className="text-xs font-medium text-ochre flex items-center gap-1.5" role="status">
            <span className="w-1.5 h-1.5 rounded-full bg-ochre shrink-0" />
            Unsaved changes. Press “Save details” to persist.
          </div>
        )}
      </div>

      {loading && (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <Panel className="space-y-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20 w-full" />
          </Panel>
          <Panel className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full" />
          </Panel>
        </div>
      )}

      {!loading && loadError && (
        <ErrorState
          title="Could not load profile details"
          message={loadError}
          onRetry={() => window.location.reload()}
          className="mb-6"
        />
      )}

      {!loading && !loadError && (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] items-start">
          <div className="space-y-6">
            {successNotice && (
              <div
                role="status"
                className="p-3.5 rounded-md bg-moss-tint/60 border border-moss/30 text-xs text-moss font-medium"
              >
                {successNotice}
              </div>
            )}

            <ProfileForm
              initialData={initialData}
              candidateName={candidateName}
              onCandidateNameChange={(val) => {
                setCandidateName(val);
                if (fieldErrors.candidateName) validate();
              }}
              availability={availability}
              onAvailabilityChange={(val) => {
                setAvailability(val);
                if (fieldErrors.availability) validate();
              }}
              ukAuth={ukAuth}
              onUkAuthChange={setUkAuth}
              isDirty={isDirty}
              saving={saving}
              saveError={saveError}
              fieldErrors={fieldErrors}
              onSubmit={handleSave}
              onDiscard={() => {
                if (initialData) {
                  setCandidateName(initialData.candidate_name || "");
                  setAvailability(initialData.availability || "");
                  setUkAuth(initialData.uk_work_authorization || "");
                  setFieldErrors({});
                  setSaveError(null);
                }
              }}
            />
          </div>

          <ProfileGuaranteesAside />
        </div>
      )}
    </PageContainer>
  );
}
