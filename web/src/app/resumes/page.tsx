"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
  factCategories, factLabels, fetchProfile, getResume, listResumes, uploadResume,
  type ProfileFact, type ResumeDetail, type ResumeSummary,
} from "./resume-api";
import ResumeReview from "./resume-review";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [profile, setProfile] = useState<ProfileFact[]>([]);
  const [selected, setSelected] = useState<ResumeDetail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listResumes(controller.signal), fetchProfile(controller.signal)])
      .then(([documents, result]) => {
        if (controller.signal.aborted) return;
        setResumes(documents);
        setProfile(result.facts);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Could not load resumes.");
        }
      });
    return () => controller.abort();
  }, [refreshCount]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) return;
    const form = event.currentTarget;
    setPending(true);
    setActionError(null);
    setNotice(null);
    try {
      setSelected(await uploadResume(file));
      setFile(null);
      form.reset();
      setRefreshCount((count) => count + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not upload the resume.");
    } finally {
      setPending(false);
    }
  }

  async function openResume(id: string) {
    setPending(true);
    setActionError(null);
    setNotice(null);
    try {
      setSelected(await getResume(id));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not open the resume.");
    } finally {
      setPending(false);
    }
  }

  function reviewed(resume: ResumeDetail) {
    setSelected((current) => current?.id === resume.id ? resume : current);
    setNotice("Confirmed facts saved to your profile.");
    setRefreshCount((count) => count + 1);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-medium text-indigo-700 hover:underline">Back to jobs</Link>
        <h1 className="mb-5 mt-4 text-2xl font-bold">Resumes and profile</h1>
        {loadError && (
          <div className="mb-4 text-sm">
            <p role="alert" className="text-rose-700">{loadError}</p>
            <button type="button" onClick={() => setRefreshCount((count) => count + 1)} className="font-medium text-indigo-700 hover:underline">Retry</button>
          </div>
        )}
        {notice && <p role="status" className="mb-4 text-sm font-medium text-emerald-700">{notice}</p>}
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Uploaded resumes</h2>
            <form onSubmit={upload} className="mt-4 space-y-3">
              <label htmlFor="resume-file" className="block text-sm font-medium">Resume file</label>
              <input
                id="resume-file"
                name="file"
                type="file"
                accept=".pdf,.docx"
                disabled={pending}
                onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-2 file:rounded-md file:bg-indigo-50 file:px-2 file:py-1 file:font-medium file:text-indigo-700"
              />
              <p className="text-xs text-slate-600">Text-based PDF or DOCX, up to 5 MB.</p>
              <button type="submit" disabled={!file || pending} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">Upload resume</button>
            </form>
            {pending && <p role="status" className="mt-3 text-sm text-slate-600">Loading resume…</p>}
            {actionError && <p role="alert" className="mt-3 text-sm text-rose-700">{actionError}</p>}
            {resumes === null && !loadError && <p className="mt-4 text-sm text-slate-600">Loading uploads…</p>}
            {resumes?.length === 0 && <p className="mt-4 text-sm text-slate-600">No resumes uploaded yet.</p>}
            {resumes && resumes.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-200">
                {resumes.map((resume) => (
                  <li key={resume.id} className="py-2">
                    <button type="button" disabled={pending} onClick={() => openResume(resume.id)} className="max-w-full break-all text-left text-sm font-medium text-indigo-700 hover:underline">
                      {resume.filename}
                    </button>
                    <p className="text-xs text-slate-600">{resume.reviewed ? "Reviewed" : "Needs review"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="min-w-0 space-y-6">
            {selected && <ResumeReview key={`${selected.id}:${selected.revision}`} resume={selected} onConfirmed={reviewed} />}
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Confirmed profile</h2>
              {resumes !== null && profile.length === 0 && <p className="mt-2 text-sm text-slate-600">Confirm facts from a resume to start your profile.</p>}
              {factCategories.map((category) => {
                const facts = profile.filter((fact) => fact.category === category);
                if (!facts.length) return null;
                return (
                  <div key={category} className="mt-4">
                    <h3 className="text-sm font-semibold">{factLabels[category]}</h3>
                    <ul className="mt-1 space-y-2 text-sm text-slate-700">
                      {facts.map((fact) => (
                        <li key={fact.value} className="break-words">
                          <p>{fact.value}</p>
                          <p className="text-xs text-slate-500">From {fact.sources.map((source) => source.filename).join(", ")}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
