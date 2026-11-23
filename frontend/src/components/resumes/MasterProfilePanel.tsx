import { factCategories, factLabels } from "@/app/resumes/resume-api";
import { Panel } from "@/components/ui";
import type { ProfileFact } from "@/lib/api/types";

export function MasterProfilePanel({ profile }: { profile: ProfileFact[] }) {
  return (
    <Panel title="Confirmed profile">
      {profile.length === 0 ? (
        <p className="text-sm text-sage-deep">Confirm facts from a resume to build your profile.</p>
      ) : (
        <div className="space-y-4">
          {factCategories.map((category) => {
            const facts = profile.filter((fact) => fact.category === category);
            if (!facts.length) return null;

            return (
              <section key={category}>
                <h4 className="text-sm font-semibold text-ink">{factLabels[category]}</h4>
                <ul className="mt-2 space-y-2">
                  {facts.map((fact) => (
                    <li key={fact.value} className="break-words text-sm text-ink-soft">
                      <p>{fact.value}</p>
                      <p className="text-xs text-sage-deep">
                        From {fact.sources.map((source) => source.filename).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
