export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function requestJson<Result>(path: string, options?: RequestInit): Promise<Result> {
  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");
  if (typeof options?.body === "string") headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...options, cache: "no-store", headers });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error("Could not connect to GetSwydd. Check that FastAPI is running and try again.");
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    if (typeof problem?.detail === "string") throw new Error(problem.detail);
    throw new Error(`GetSwydd request failed (HTTP ${response.status}).`);
  }

  return response.json();
}
