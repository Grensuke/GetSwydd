import Link from "next/link";

interface EvidenceSource {
  resume_id: string;
  filename: string;
}

interface RequirementMatch {
  label: string;
  status: "evidence_found" | "no_confirmed_evidence" | "needs_confirmation";
  evidence: { value: string; sources: EvidenceSource[] }[];
}

export interface JobMatch {
  has_confirmed_profile: boolean;
  matched_skills: number;
  total_skills: number;
  requirements: RequirementMatch[];
  recommended_resume: (EvidenceSource & { covered_requirements: string[] }) | null;
}

const statuses = {
  evidence_found: { label: "Evidence found", color: "text-emerald-700" },
  no_confirmed_evidence: { label: "No confirmed evidence", color: "text-slate-600" },
  needs_confirmation: { label: "Needs confirmation", color: "text-amber-800" },
};

export default function JobMatchSummary({ match }: { match: JobMatch }) {
  const recommendation = match.recommended_resume;

  return (
    <section className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <h4 className="text-sm font-semibold text-slate-900">Profile match</h4>
      {match.has_confirmed_profile ? (
        <p>{match.matched_skills} of {match.total_skills} skill requirements supported.</p>
      ) : (
        <p>
          <Link href="/resumes" className="font-medium text-indigo-700 underline">Confirm resume facts</Link>
          {" "}to see how your profile matches.
        </p>
      )}
      {recommendation ? (
        <div>
          <p className="break-words"><span className="font-semibold">Recommended resume </span>{recommendation.filename}</p>
          <p className="mt-1 text-slate-600">Supports {recommendation.covered_requirements.join(", ")}.</p>
        </div>
      ) : match.has_confirmed_profile && (
        <p>No reviewed resume supports a listed skill requirement yet.</p>
      )}
      <details>
        <summary className="cursor-pointer font-medium text-indigo-700">See requirement breakdown</summary>
        <ul className="mt-2 divide-y divide-slate-200">
          {match.requirements.map((requirement) => {
            const status = statuses[requirement.status];
            return (
              <li key={requirement.label} className="space-y-1 py-2">
                <p className="font-medium text-slate-900">{requirement.label}</p>
                <p className={status.color}>{status.label}</p>
                {requirement.evidence.map((fact) => (
                  <p key={fact.value} className="break-words text-slate-600">
                    {fact.value} · {fact.sources.map((source) => source.filename).join(", ")}
                  </p>
                ))}
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
