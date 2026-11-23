import { requestJson } from "./client";
import type { ApplicationDetails } from "./types";

/**
 * GET /api/v1/profile/application-details
 * Load saved application details.
 */
export function getApplicationDetails(signal?: AbortSignal): Promise<ApplicationDetails> {
  return requestJson<ApplicationDetails>("/api/v1/profile/application-details", { signal });
}

/**
 * Update the general profile fields used in application drafts.
 */
export function saveApplicationDetails(
  details: ApplicationDetails,
  signal?: AbortSignal
): Promise<ApplicationDetails> {
  return requestJson<ApplicationDetails>("/api/v1/profile/application-details", {
    method: "PATCH",
    body: JSON.stringify(details),
    signal,
  });
}

