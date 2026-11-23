/**
 * Shared option constants for discovery filters.
 * Values match the backend's Literal types in api/app/models.py exactly.
 */
import type { Employment, ExperienceLevel, Workplace } from "@/lib/api/types";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export const SOURCE_OPTIONS = [
  { value: "all", label: "All", description: "All available opportunities across sample demo listings and public ATS boards." },
  { value: "live", label: "Live", description: "Live postings ingested from configured Greenhouse, Lever, and Ashby job feeds." },
  { value: "demo", label: "Demo", description: "Sample listings used to try the workflow. Nothing is sent to a real employer." },
  { value: "greenhouse", label: "Greenhouse", description: "Public listings fetched directly from configured Greenhouse boards." },
  { value: "lever", label: "Lever", description: "Public listings fetched directly from configured Lever feeds." },
  { value: "ashby", label: "Ashby", description: "Public listings fetched directly from configured Ashby job boards." },
] as const;

export type SourceValue = (typeof SOURCE_OPTIONS)[number]["value"];

export const WORKPLACE_OPTIONS: FilterOption<Workplace>[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const EMPLOYMENT_OPTIONS: FilterOption<Employment>[] = [
  { value: "internship", label: "Internship" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

export const EXPERIENCE_OPTIONS: FilterOption<ExperienceLevel>[] = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
];

export const CLOSING_OPTIONS = [
  { value: 3, label: "Within 3 days" },
  { value: 7, label: "Within 7 days" },
  { value: 14, label: "Within 14 days" },
  { value: 30, label: "Within 30 days" },
] as const;

export const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "match", label: "Best match" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const MAX_PAGE_SIZE = 100;
