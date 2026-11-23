import { requestJson } from "./client";
import type { ApplicationDetails } from "./types";

/**
 * GET /api/v1/profile/application-details
 * Load saved application details (candidate name, availability, UK work authorization).
 */
export function getApplicationDetails(signal?: AbortSignal): Promise<ApplicationDetails> {
  return requestJson<ApplicationDetails>("/api/v1/profile/application-details", { signal });
}

/**
 * PUT /api/v1/profile/application-details
 * Confirm candidate application details for personalized draft generation.
 */
export function saveApplicationDetails(
  details: ApplicationDetails,
  signal?: AbortSignal
): Promise<ApplicationDetails> {
  return requestJson<ApplicationDetails>("/api/v1/profile/application-details", {
    method: "PUT",
    body: JSON.stringify(details),
    signal,
  });
}

