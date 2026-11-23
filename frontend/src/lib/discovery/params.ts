/**
 * URL-synced discovery state: typed params, URL parsing/serialization, and API param conversion.
 *
 * The catalog accepts one value per filter. Saved preferences support multiple values.
 */
import type { Employment, ExperienceLevel, JobListParams, Workplace } from "@/lib/api/types";
import { DEFAULT_PAGE_SIZE, type SourceValue } from "./options";

export interface DiscoveryParams {
  source: SourceValue;
  market: NonNullable<JobListParams["market"]>;
  q: string;
  location: string;
  internshipsOnly: boolean;
  workplace: Workplace[];
  employment: Employment[];
  experienceLevel: ExperienceLevel[];
  closingWithinDays: number | null;
  usePreferences: boolean;
  sort: "default" | "match";
  page: number;
  pageSize: number;
}

export const DEFAULT_PARAMS: DiscoveryParams = {
  source: "live",
  market: "india",
  q: "",
  location: "",
  internshipsOnly: false,
  workplace: [],
  employment: [],
  experienceLevel: [],
  closingWithinDays: null,
  usePreferences: false,
  sort: "default",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

function parseCatalogFilter<T extends string>(param: string | null, valid: readonly T[]): T[] {
  if (!param) return [];
  const selected = param.split(",").find((v): v is T => (valid as readonly string[]).includes(v));
  return selected ? [selected] : [];
}

const VALID_WORKPLACES: readonly Workplace[] = ["remote", "hybrid", "onsite"];
const VALID_EMPLOYMENT: readonly Employment[] = ["internship", "full_time", "part_time", "contract", "temporary"];
const VALID_EXPERIENCE: readonly ExperienceLevel[] = ["intern", "entry", "mid", "senior"];
const VALID_SOURCES: readonly SourceValue[] = ["all", "live", "demo", "greenhouse", "lever", "ashby"];
const VALID_SORTS = ["default", "match"] as const;

export function parseSearchParams(sp: URLSearchParams): DiscoveryParams {
  const sourceRaw = sp.get("source");
  const sortRaw = sp.get("sort");
  const pageRaw = sp.get("page");
  const pageSizeRaw = sp.get("pageSize");
  const closingRaw = sp.get("closingWithinDays");

  return {
    source: (sourceRaw && VALID_SOURCES.includes(sourceRaw as SourceValue) ? sourceRaw : DEFAULT_PARAMS.source) as SourceValue,
    market: sp.get("market") === "all" ? "all" : DEFAULT_PARAMS.market,
    q: sp.get("q") ?? "",
    location: sp.get("location") ?? "",
    internshipsOnly: sp.get("internshipsOnly") === "true",
    workplace: parseCatalogFilter(sp.get("workplace"), VALID_WORKPLACES),
    employment: parseCatalogFilter(sp.get("employment"), VALID_EMPLOYMENT),
    experienceLevel: parseCatalogFilter(sp.get("experienceLevel"), VALID_EXPERIENCE),
    closingWithinDays: closingRaw ? Math.max(0, Math.min(90, parseInt(closingRaw, 10) || 0)) || null : null,
    usePreferences: sp.get("usePreferences") === "true",
    sort: (sortRaw && (VALID_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : "default") as "default" | "match",
    page: Math.max(1, parseInt(pageRaw ?? "", 10) || 1),
    pageSize: Math.min(100, Math.max(1, parseInt(pageSizeRaw ?? "", 10) || DEFAULT_PAGE_SIZE)),
  };
}

export function toSearchParams(params: DiscoveryParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.source !== DEFAULT_PARAMS.source) sp.set("source", params.source);
  if (params.market !== DEFAULT_PARAMS.market) sp.set("market", params.market);
  if (params.q) sp.set("q", params.q);
  if (params.location) sp.set("location", params.location);
  if (params.internshipsOnly) sp.set("internshipsOnly", "true");
  if (params.workplace.length) sp.set("workplace", params.workplace.join(","));
  if (params.employment.length) sp.set("employment", params.employment.join(","));
  if (params.experienceLevel.length) sp.set("experienceLevel", params.experienceLevel.join(","));
  if (params.closingWithinDays !== null) sp.set("closingWithinDays", String(params.closingWithinDays));
  if (params.usePreferences) sp.set("usePreferences", "true");
  if (params.sort !== "default") sp.set("sort", params.sort);
  if (params.page > 1) sp.set("page", String(params.page));
  if (params.pageSize !== DEFAULT_PAGE_SIZE) sp.set("pageSize", String(params.pageSize));
  return sp;
}

export function toApiParams(params: DiscoveryParams): JobListParams {
  return {
    source: params.source,
    market: params.source === "demo" ? "all" : params.market,
    q: params.q || undefined,
    location: params.location || undefined,
    internships_only: params.internshipsOnly || undefined,
    workplace: params.workplace[0] ?? undefined,
    employment: params.internshipsOnly ? "internship" : params.employment[0] ?? undefined,
    experience_level: params.experienceLevel[0] ?? undefined,
    closing_within_days: params.closingWithinDays ?? undefined,
    use_preferences: params.usePreferences || undefined,
    sort: params.sort === "match" ? "match" : undefined,
    offset: (params.page - 1) * params.pageSize,
    limit: params.pageSize,
  };
}
