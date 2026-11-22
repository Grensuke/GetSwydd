import { buildQuery, requestJson } from "./client";
import type {
  AnalyzeJobRequest,
  BoardRefresh,
  HealthResponse,
  JobAlert,
  JobAlertListParams,
  JobAnalysis,
  JobListParams,
  JobListResponse,
  JobRefreshResult,
  JobSearchPreferences,
} from "./types";

/**
 * GET /health
 * Check service availability and version.
 */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health", { signal });
}

/**
 * GET /api/v1/jobs
 * List open job opportunities with optional filtering, search, and confirmed profile matching.
 */
export function listJobs(params?: JobListParams, signal?: AbortSignal): Promise<JobListResponse> {
  const query = buildQuery(
    params as Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined>
  );
  return requestJson<JobListResponse>(`/api/v1/jobs${query}`, { signal });
}

/**
 * GET /api/v1/jobs/preferences
 * Read saved role and location preferences for the local candidate.
 */
export function getPreferences(signal?: AbortSignal): Promise<JobSearchPreferences> {
  return requestJson<JobSearchPreferences>("/api/v1/jobs/preferences", { signal });
}

/**
 * PUT /api/v1/jobs/preferences
 * Replace saved search preferences.
 */
export function savePreferences(
  preferences: JobSearchPreferences,
  signal?: AbortSignal
): Promise<JobSearchPreferences> {
  return requestJson<JobSearchPreferences>("/api/v1/jobs/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
    signal,
  });
}

/**
 * POST /api/v1/jobs/greenhouse/refresh
 * Refresh configured public Greenhouse job boards only.
 */
export function refreshGreenhouse(signal?: AbortSignal): Promise<BoardRefresh[]> {
  return requestJson<BoardRefresh[]>("/api/v1/jobs/greenhouse/refresh", {
    method: "POST",
    signal,
  });
}

/**
 * POST /api/v1/jobs/refresh
 * Refresh all configured public ATS job feeds (Greenhouse, Lever, Ashby) and discover new alerts.
 */
export function refreshJobs(signal?: AbortSignal): Promise<JobRefreshResult> {
  return requestJson<JobRefreshResult>("/api/v1/jobs/refresh", {
    method: "POST",
    signal,
  });
}

/**
 * GET /api/v1/jobs/alerts
 * Retrieve newly discovered jobs that match saved search preferences.
 */
export function listAlerts(params?: JobAlertListParams, signal?: AbortSignal): Promise<JobAlert[]> {
  const query = buildQuery(
    params as Record<string, string | number | boolean | null | undefined>
  );
  return requestJson<JobAlert[]>(`/api/v1/jobs/alerts${query}`, { signal });
}

/**
 * PUT /api/v1/jobs/alerts/{alert_id}/read
 * Mark a specific job alert as read.
 */
export function markAlertRead(alertId: string, signal?: AbortSignal): Promise<JobAlert> {
  return requestJson<JobAlert>(`/api/v1/jobs/alerts/${encodeURIComponent(alertId)}/read`, {
    method: "PUT",
    signal,
  });
}

/**
 * POST /api/v1/jobs/{job_id}/analysis
 * Get detailed requirement breakdown and optional semantic AI resume comparison for a job.
 */
export function analyzeJob(
  jobId: string,
  payload: AnalyzeJobRequest = { use_semantic: false },
  signal?: AbortSignal
): Promise<JobAnalysis> {
  return requestJson<JobAnalysis>(`/api/v1/jobs/${encodeURIComponent(jobId)}/analysis`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

