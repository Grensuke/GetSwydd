"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, MapPin, Sparkles } from "lucide-react";
import { JobMatchSummary } from "@/components/jobs/JobMatchSummary";
import { StartApplication } from "@/components/applications/StartApplication";
import { Badge, Button, Field, InlineNotice, Textarea } from "@/components/ui";
import { discoverJobs, type DiscoveryJob, type JobDiscoveryResult, type ProfileSource } from "@/lib/api";
import { formatDeadline, titleCaseEnum } from "@/lib/format";

interface AgentDiscoveryProps {
  onSourcesRefreshed?: () => void;
  resume?: ProfileSource;
}

export function AgentDiscovery({ onSourcesRefreshed, resume }: AgentDiscoveryProps) {
  const titleId = useId();
  const example = resume ? "Find jobs in India that match my resume." : "Find five internships in India.";
  const [message, setMessage] = useState(resume ? example : "");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<JobDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function search(query: string, resumeId?: string) {
    const text = query.trim();
    if (!text || pending) return;

    setPending(true);
    setSubmittedMessage(text);
    setError(null);
    setResult(null);
    try {
      const response = await discoverJobs({
        message: text,
        resume_id: resumeId ?? resume?.resume_id,
        refresh: true,
        require_skill_match: resume ? true : undefined,
      });
      setResult(response);
      if (response.refresh_sources.length > 0) onSourcesRefreshed?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "The job agent could not complete your search.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(message);
  }

  const preferences = result?.filters?.preferences;
  const skills = result?.filters?.skill_groups.map((group) => group.join(" or ")) ?? [];
  const terms = [...new Set([
    ...(preferences?.role_keywords ?? []),
    ...(preferences?.location_keywords ?? []),
    ...(preferences?.workplace_modes ?? []).map(titleCaseEnum),
    ...(preferences?.employment_types ?? []).map(titleCaseEnum),
    ...(preferences?.experience_levels ?? []).map(titleCaseEnum),
    ...(preferences?.internships_only ? ["Internships only"] : []),
    ...(result?.filters?.company_keywords ?? []),
    ...skills,
  ])];
  const applicantLocation = result?.filters?.applicant_location;

  return (
    <details
      id={resume ? undefined : "ai-search"}
      open={!resume}
      className={`group/agent scroll-mt-5 rounded-2xl border border-hairline bg-paper-raised shadow-[0_4px_16px_rgba(31,44,36,0.06)] ${resume ? "" : "mb-8"}`}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-ink sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-moss-tint text-moss">
          <Sparkles size={18} aria-hidden="true" />
        </span>
        <span id={titleId} className="min-w-0 flex-1 font-display text-xl font-medium sm:text-2xl">
          {resume ? "Find jobs with this resume" : "Search with AI"}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-sage-deep transition-transform group-open/agent:rotate-180" />
      </summary>
      <div className="space-y-5 px-4 pb-5 sm:px-6 sm:pb-6">
        <form onSubmit={submit} aria-labelledby={titleId} className="space-y-3 rounded-xl border border-hairline bg-paper/55 p-3 sm:p-4">
          <Field
            label="What jobs are you looking for?"
            hint={resume ? "Results need at least one skill match from this resume." : "The agent searches configured employer feeds."}
          >
            {({ id, ariaDescribedBy }) => (
              <Textarea
                id={id}
                aria-describedby={ariaDescribedBy}
                rows={2}
                required
                maxLength={1500}
                placeholder={example}
                value={message}
                className="min-h-20 resize-y"
                onChange={(event) => setMessage(event.currentTarget.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="min-h-10" disabled={!message.trim()} loading={pending}>
              {pending ? "Searching…" : "Find jobs"}
              {!pending && <ArrowRight size={15} aria-hidden="true" />}
            </Button>
            <Button variant="secondary" size="sm" className="min-h-9" disabled={pending} onClick={() => setMessage(example)}>
              Use example
            </Button>
          </div>
        </form>

        {pending && <p role="status" className="text-sm text-ink-soft">Checking employer feeds and matching jobs…</p>}
        {error && <InlineNotice role="alert" variant="problem">{error}</InlineNotice>}
        {result && (
          <section aria-label="AI search results" className="space-y-4 border-t border-hairline pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl">Search results</h2>
              {result.jobs.length > 0 && (
                <p role="status" className="text-xs font-medium tabular-nums text-sage-deep">
                  Showing {result.jobs.length} of {result.total_matches} matches
                </p>
              )}
            </div>
            {result.status !== "results" && <p role="status" className="text-sm text-ink">{result.message}</p>}
            {terms.length > 0 && (
              <ul aria-label="Applied search filters" className="flex flex-wrap gap-2">
                {terms.map((term) => (
                  <li key={term} className="max-w-full wrap-anywhere rounded-full border border-hairline bg-paper px-3 py-0.5 text-xs text-ink-soft">
                    {term}
                  </li>
                ))}
              </ul>
            )}
            {applicantLocation && <p className="text-xs text-ink-soft">Applicant location considered: {applicantLocation}</p>}
            {result.selected_resume && (
              <p className="text-xs text-ink-soft">Resume used for matching: {result.selected_resume.filename}</p>
            )}
            {result.status === "needs_clarification" && (
              result.resume_options.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.resume_options.map((resume) => (
                    <Button
                      key={resume.resume_id}
                      variant="secondary"
                      onClick={() => void search(submittedMessage, resume.resume_id)}
                    >
                      {resume.filename}
                    </Button>
                  ))}
                </div>
              ) : <p className="text-xs text-ink-soft">Update your original request with the missing details and search again.</p>
            )}
            {result.refresh_in_progress && (
              <p className="text-xs text-ink-soft">A feed refresh is running. Search again shortly for updated listings.</p>
            )}
            {result.refresh_sources.length > 0 && (
              <details className="rounded-lg border border-hairline px-3 py-2 text-xs text-ink-soft">
                <summary className="cursor-pointer font-medium">Employer feeds checked ({result.refresh_sources.length})</summary>
                <ul className="mt-2 grid gap-2 pb-1 sm:grid-cols-2">
                  {result.refresh_sources.map((feed) => (
                    <li key={`${feed.source}:${feed.board}`} className="flex flex-wrap justify-between gap-x-3 rounded-md bg-paper px-2 py-1">
                      <span className="min-w-0 break-words font-medium">{feed.board}</span>
                      <span>{titleCaseEnum(feed.status)} · {feed.count} listings</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.jobs.length > 0 && (
              <ol className={resume ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
                {result.jobs.map((job) => <AgentJobCard key={job.job_id} job={job} />)}
              </ol>
            )}
          </section>
        )}
      </div>
    </details>
  );
}

function AgentJobCard({ job }: { job: DiscoveryJob }) {
  const analysisUrl = `/jobs/${encodeURIComponent(job.job_id)}`;
  const deadline = job.application_deadline && (formatDeadline(job.application_deadline).text || job.application_deadline);
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-paper/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-words text-xs font-semibold text-moss">{job.company}</span>
        <Badge tone="outline">{titleCaseEnum(job.source)}</Badge>
      </div>
      <h3 className="break-words text-xl leading-tight tracking-tight">
        <Link href={analysisUrl} className="hover:underline">{job.title}</Link>
      </h3>
      <p className="flex min-w-0 items-start gap-2 text-sm text-ink-soft">
        <MapPin size={15} className="mt-0.5 shrink-0 text-moss" aria-hidden="true" />
        <span className="min-w-0 break-words">{job.location}</span>
      </p>
      {deadline && <p className="text-xs text-ink-soft">{deadline}</p>}
      {job.applicant_location_check.evidence && job.applicant_location_check.evidence !== job.location && (
        <p className="break-words text-xs text-ink-soft">Listing location: {job.applicant_location_check.evidence}</p>
      )}
      {job.applicant_location_check.status === "needs_confirmation" && (
        <p className="text-xs text-ink-soft">Confirm the eligible work location with the employer.</p>
      )}
      {job.match && (
        <details className="rounded-lg border border-hairline bg-paper-raised px-3 py-2 text-xs text-ink-soft">
          <summary className="cursor-pointer font-medium">
            {job.match.total_skills > 0
              ? `${job.match.matched_skills} of ${job.match.total_skills} recognized skills matched`
              : "Review match evidence"}
          </summary>
          <JobMatchSummary match={job.match} className="mt-2 border-0 bg-transparent p-0 sm:p-0" />
        </details>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
        <StartApplication
          job={{ ...job, id: job.job_id, application_mode: "assisted" }}
          triggerVariant="primary"
          className="min-h-9"
        />
        <Button href={analysisUrl} variant="quiet" size="sm" className="min-h-9 !text-xs">View analysis</Button>
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-ink hover:underline">
          Employer posting <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}
