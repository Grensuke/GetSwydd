"use client";

import React, { useMemo, useState } from "react";
import { FolderGit2, Eye, Edit3, Code2 } from "lucide-react";

export interface ProjectPreviewCardsProps {
  projectLines: string[];
  onChange: (lines: string[]) => void;
  maxProjects?: number;
}

interface ParsedProject {
  title: string;
  stack?: string;
  bullets: string[];
}

export function ProjectPreviewCards({
  projectLines,
  onChange,
}: ProjectPreviewCardsProps) {
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  const parsedProjects = useMemo<ParsedProject[]>(() => {
    const list: ParsedProject[] = [];
    let current: ParsedProject | null = null;

    for (const rawLine of projectLines) {
      const line = rawLine.trim();
      if (!line) continue;

      const isBullet = /^[-•●·▪]\s+/.test(line);
      const cleanLine = line.replace(/^[-•●·▪]\s+/, "");

      // Check if line looks like a project header (contains | or has tech stack or is not a bullet and starts a project)
      const hasPipe = cleanLine.includes("|");
      const hasDashStack = /\s+[–—-]\s+(?:GitHub|[A-Z][a-zA-Z,\s]{3,})/.test(cleanLine);
      const isHeader = hasPipe || hasDashStack || (!isBullet && !cleanLine.endsWith("."));

      if (isHeader || !current) {
        let title = cleanLine;
        let stack: string | undefined;

        if (cleanLine.includes("|")) {
          const [t, ...rest] = cleanLine.split("|");
          title = t.trim();
          stack = rest.join("|").trim();
        } else if (cleanLine.includes("–")) {
          const [t, ...rest] = cleanLine.split("–");
          title = t.trim();
          stack = rest.join("–").trim();
        }

        current = { title, stack, bullets: [] };
        list.push(current);
      } else {
        current.bullets.push(cleanLine);
      }
    }

    return list;
  }, [projectLines]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-sage-deep">
          {parsedProjects.length} {parsedProjects.length === 1 ? "project" : "projects"} detected ({projectLines.length} lines)
        </span>
        <button
          type="button"
          onClick={() => setViewMode((v) => (v === "preview" ? "edit" : "preview"))}
          className="inline-flex items-center gap-1 font-medium text-moss hover:underline"
        >
          {viewMode === "preview" ? (
            <>
              <Edit3 size={12} aria-hidden="true" />
              Edit lines
            </>
          ) : (
            <>
              <Eye size={12} aria-hidden="true" />
              Card preview
            </>
          )}
        </button>
      </div>

      {viewMode === "preview" ? (
        <div className="space-y-3">
          {parsedProjects.length === 0 ? (
            <div className="rounded-md border border-dashed border-hairline p-4 text-center text-xs text-sage-deep">
              No project entries detected. Switch to editor to add your projects.
            </div>
          ) : (
            parsedProjects.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-hairline bg-paper-raised p-3.5 shadow-2xs transition-shadow hover:shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-moss-tint text-moss">
                      <FolderGit2 size={13} aria-hidden="true" />
                    </span>
                    <h5 className="text-xs font-semibold text-ink sm:text-sm">
                      {proj.title}
                    </h5>
                  </div>
                  {proj.stack && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-hairline bg-paper px-2 py-0.5 font-mono text-[11px] text-sage-deep">
                      <Code2 size={10} aria-hidden="true" />
                      {proj.stack}
                    </span>
                  )}
                </div>

                {proj.bullets.length > 0 && (
                  <ul className="mt-2.5 space-y-1 pl-4 text-xs text-ink-soft">
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="list-disc leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <textarea
          value={projectLines.join("\n")}
          onChange={(e) => {
            const next = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange(next);
          }}
          rows={Math.max(6, Math.min(14, projectLines.length + 1))}
          className="w-full rounded-md border border-hairline bg-paper p-2.5 font-mono text-xs text-ink focus:border-moss focus:outline-hidden"
          placeholder="Format: Project Title | Tech Stack&#10;• Bullet point 1...&#10;• Bullet point 2..."
        />
      )}
    </div>
  );
}
