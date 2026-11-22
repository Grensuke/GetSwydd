"use client";

import { useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  eligibility: string;
  recommended_resume: string;
  description?: string;
  posted_date?: string;
}

interface JobListResponse {
  total: number;
  jobs: Job[];
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const response = await fetch(`${apiUrl}/api/v1/jobs`, {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status} (${response.statusText || "Error"})`
          );
        }

        const data: JobListResponse = await response.json();
        if (active) {
          setJobs(data.jobs || []);
          setLastFetched(new Date());
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to connect to local API server.");
          }
          setLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, [apiUrl, refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              GS
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">
                GetSwydd
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Assistant Foundation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden md:inline">
              Backend: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{apiUrl}</code>
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              title="Refresh jobs from API"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Full-Stack Job Search & Application Assistant
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              GetSwydd pairs intelligent, explainable job discovery with safe, verified application preparation.
              In this runnable foundation, explore synthetic opportunities served by our local FastAPI backend.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Facts Only
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> User-Approved Submissions
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Assisted Fallback Mode
              </span>
            </div>
          </div>
        </div>

        {/* Status & Filters Bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Available Opportunities
            </h2>
            <p className="text-xs text-slate-500">
              {loading
                ? "Connecting to local API..."
                : error
                ? "Connection status: offline or unreachable"
                : `${jobs.length} synthetic role${jobs.length === 1 ? "" : "s"} loaded`}
              {lastFetched && !loading && !error && (
                <span className="ml-2">• Synced at {lastFetched.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="loading-state"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-3.5 bg-slate-100 rounded w-full"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-5/6"></div>
                </div>
                <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="error-state"
            className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-rose-900 text-sm">
                  Unable to load jobs from API
                </h3>
                <p className="mt-1 text-xs text-rose-700">
                  {error}
                </p>
                <div className="mt-3 text-xs bg-rose-100/60 p-3 rounded-lg font-mono text-rose-900">
                  Ensure the FastAPI backend is running:
                  <div className="mt-1 select-all font-semibold text-rose-950">
                    cd api && .\.venv\Scripts\Activate.ps1 && uvicorn app.main:app --port 8000
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleRefresh}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && jobs.length === 0 && (
          <div
            data-testid="empty-state"
            className="text-center bg-white border border-dashed border-slate-300 rounded-xl p-12 shadow-xs"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No job postings available
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No open roles were returned by the backend service. Check back later or refresh.
            </p>
            <div className="mt-4">
              <button
                onClick={handleRefresh}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                Refresh Catalog
              </button>
            </div>
          </div>
        )}

        {/* Populated Job List */}
        {!loading && !error && jobs.length > 0 && (
          <div
            data-testid="job-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {jobs.map((job) => (
              <article
                key={job.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-2 text-xs font-medium text-slate-600">
                        <span className="text-indigo-700 font-semibold">{job.company}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <svg
                            className="w-3.5 h-3.5 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {job.location}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      Synthetic
                    </span>
                  </div>

                  {job.description && (
                    <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  )}

                  {/* Eligibility criteria */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Eligibility
                    </span>
                    <p className="text-xs text-slate-700 leading-snug">
                      {job.eligibility}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Recommended Resume */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      Recommended Resume:
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-medium">
                      <svg
                        className="w-3.5 h-3.5 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {job.recommended_resume}
                    </span>
                  </div>

                  <button
                    disabled
                    className="self-end sm:self-auto px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-medium rounded-md border border-slate-200 cursor-not-allowed"
                    title="Application preparation milestone coming in Phase 2"
                  >
                    Draft Application (Phase 2)
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GetSwydd Foundation • Python 3.12+ FastAPI + Next.js App Router</span>
          <span>Core Rule: No unverified facts • Explicit user approval required</span>
        </div>
      </footer>
    </div>
  );
}
