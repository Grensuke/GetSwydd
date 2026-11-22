export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PydanticErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

/**
 * Standard typed API error for GetSwydd endpoints.
 * Handles both plain detail strings and Pydantic validation error arrays.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  static fromPayload(status: number, payload: unknown): ApiError {
    if (payload && typeof payload === "object") {
      const p = payload as { detail?: unknown; message?: string };
      if (typeof p.detail === "string") {
        return new ApiError(status, p.detail, p.detail);
      }
      if (Array.isArray(p.detail)) {
        const messages = p.detail
          .map((item: PydanticErrorItem) => {
            const field = item.loc ? item.loc.filter((part) => part !== "body").join(".") : "";
            return field ? `${field}: ${item.msg || "invalid value"}` : item.msg || "validation error";
          })
          .filter(Boolean);
        const combined = messages.length > 0 ? messages.join("; ") : "Validation error occurred.";
        return new ApiError(status, combined, p.detail);
      }
      if (typeof p.message === "string") {
        return new ApiError(status, p.message, p);
      }
    }
    return new ApiError(status, `GetSwydd request failed with HTTP ${status}.`, payload);
  }
}

/**
 * Helper to construct a URL query string, dropping undefined, null, and empty strings.
 * Correctly serializes repeated array parameters and boolean flags.
 */
export function buildQuery(
  params?: Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined>
): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Perform a typed HTTP request against the GetSwydd FastAPI backend.
 */
export async function requestJson<Result>(path: string, options?: RequestInit): Promise<Result> {
  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");

  // Only set application/json Content-Type if body is not FormData
  if (options?.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      cache: "no-store",
      headers,
    });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new ApiError(0, "Could not connect to GetSwydd. Check that FastAPI is running and try again.");
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw ApiError.fromPayload(response.status, errorPayload);
  }

  if (response.status === 204) {
    return {} as Result;
  }

  return response.json();
}

