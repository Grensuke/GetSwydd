import { factCategories, factLabels } from "@/app/resumes/resume-api";
import { Panel } from "@/components/ui";
import type { ProfileFact } from "@/lib/api/types";

export function MasterProfilePanel({ profile }: { profile: ProfileFact[] }) {
  return (
    <Panel title="Confirmed profile">
      {profile.length === 0 ? (
        <p className="text-sm text-sage-deep">Confirm facts from a resume to build your profile.</p>
      ) : (
        <div className="space-y-2">
          <p className="mb-3 text-xs text-sage-deep">Expand a category to see the facts used for matching and where they came from.</p>
          {factCategories.map((category) => {
            const facts = profile.filter((fact) => fact.category === category);
            if (!facts.length) return null;

            return (
              <details key={category} className="rounded-md border border-hairline px-3">
                <summary className="cursor-pointer py-2 text-sm font-medium text-ink">
                  {factLabels[category]} <span className="ml-1 text-xs text-sage-deep">({facts.length})</span>
                </summary>
                <ul tabIndex={0} aria-label={factLabels[category]} className="mb-3 max-h-64 space-y-2 overflow-y-auto pl-3">
                  {facts.map((fact) => (
                    <li key={fact.value} className="break-words text-sm text-ink-soft">
                      <p>{fact.value}</p>
                      <p className="text-xs text-sage-deep">
                        From {fact.sources.map((source) => source.filename).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
