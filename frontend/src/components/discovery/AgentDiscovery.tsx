"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { JobMatchSummary } from "@/components/jobs/JobMatchSummary";
import { Button, Field, InlineNotice, Textarea } from "@/components/ui";
import { discoverJobs, type JobDiscoveryResult, type ProfileSource } from "@/lib/api";
import { formatDeadline, titleCaseEnum } from "@/lib/format";

interface AgentDiscoveryProps {
  onSourcesRefreshed?: () => void;
  resume?: ProfileSource;
}

export function AgentDiscovery({ onSourcesRefreshed, resume }: AgentDiscoveryProps) {
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
  const terms = [
    ...(preferences?.role_keywords ?? []),
    ...(preferences?.location_keywords ?? []),
    ...(preferences?.employment_types ?? []).map(titleCaseEnum),
    ...(result?.filters?.company_keywords ?? []),
    ...skills,
  ];
  const applicantLocation = result?.filters?.applicant_location;

  return (
    <details className="mb-6 rounded-lg border border-hairline bg-paper-raised p-4">
      <summary className="cursor-pointer font-semibold text-ink">
        {resume ? "Find jobs with this resume" : "Search with AI"}
      </summary>
      <div className="mt-3 space-y-4">
        <form onSubmit={submit} className="space-y-3">
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
                onChange={(event) => setMessage(event.currentTarget.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!message.trim()} loading={pending}>
              {pending ? "Searching…" : "Find jobs"}
            </Button>
            <Button variant="quiet" disabled={pending} onClick={() => setMessage(example)}>
              Use example
            </Button>
          </div>
        </form>

        {pending && <p role="status" className="text-sm text-ink-soft">Checking employer feeds and matching jobs…</p>}
        {error && <InlineNotice role="alert" variant="problem">{error}</InlineNotice>}
        {result && (
          <section aria-label="AI search results" className="space-y-3 border-t border-hairline pt-3">
            <p role="status" className="text-sm font-medium text-ink">{result.message}</p>
            {terms.length > 0 && <p className="text-xs text-ink-soft">Matched against {terms.join(" · ")}.</p>}
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
              <details className="text-xs text-ink-soft">
                <summary className="cursor-pointer">Employer feeds checked</summary>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {result.refresh_sources.map((feed) => (
                    <li key={`${feed.source}:${feed.board}`}>
                      {feed.board} · {titleCaseEnum(feed.status)} · {feed.count} listings
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.jobs.length > 0 && (
              <>
                <p className="text-xs text-ink-soft">Showing {result.jobs.length} of {result.total_matches} matches.</p>
                <ol className="divide-y divide-hairline">
                  {result.jobs.map((job) => (
                    <li key={job.job_id} className="space-y-2 py-3">
                      <h3 className="font-medium text-ink">
                        <Link href={`/jobs/${encodeURIComponent(job.job_id)}`} className="hover:underline">{job.title}</Link>
                      </h3>
                      <p className="text-sm text-ink-soft">{job.company} · {job.location}</p>
                      {job.application_deadline && (
                        <p className="text-xs text-ink-soft">
                          {formatDeadline(job.application_deadline).text || job.application_deadline}
                        </p>
                      )}
                      {job.applicant_location_check.evidence && (
                        <p className="text-xs text-ink-soft">Listing location: {job.applicant_location_check.evidence}</p>
                      )}
                      {job.applicant_location_check.status === "needs_confirmation" && (
                        <p className="text-xs text-ink-soft">Confirm the eligible work location with the employer.</p>
                      )}
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink underline">
                        Open employer posting
                      </a>
                      {job.match && <JobMatchSummary match={job.match} />}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}
      </div>
    </details>
  );
}
