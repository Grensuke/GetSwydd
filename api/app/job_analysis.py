"""Explain job matches and optionally compare them using embeddings."""
import math
import os

from httpx import Client, HTTPError

from app.job_search import enrich_listing
from app.matching import match_jobs
from app.models import Job, JobAnalysis, SemanticResumeMatch
from app.resume_models import ApplicationDetails, ConfirmedProfile, ProfileSource

MAX_SEMANTIC_RESUMES = 12


def analyze_job(job: Job, profile: ConfirmedProfile, use_semantic: bool, details: ApplicationDetails) -> JobAnalysis:
    evaluated = match_jobs([enrich_listing(job)], profile, details)[0]
    match = evaluated.match
    summary = "This listing has no recognized skills to compare with the confirmed profile."
    if match and match.total_skills:
        summary = f"Confirmed profile evidence covers {match.matched_skills} of {match.total_skills} recognized skills."
    if match and match.eligibility_status == "not_met":
        summary += " A confirmed eligibility detail does not meet a listed requirement."
    elif match and any(item.status == "needs_confirmation" for item in match.requirements):
        summary += " Review the employer's eligibility checks before applying."
    result = JobAnalysis(job=evaluated, summary=summary, semantic_status="disabled")
    if not use_semantic:
        return result
    api_key = os.getenv("GETSWYDD_OPENAI_API_KEY")
    if not api_key:
        result.semantic_status = "not_configured"
        return result

    skill_sets: dict[str, tuple[ProfileSource, list[str]]] = {}
    for fact in profile.facts:
        if fact.category == "skills":
            for source in fact.sources:
                skill_sets.setdefault(source.resume_id, (source, []))[1].append(fact.value)
    selected = list(skill_sets.values())[:MAX_SEMANTIC_RESUMES]
    if not selected or not job.description:
        result.semantic_status = "insufficient_data"
        return result

    # The employer's public text and confirmed skill labels are the only inputs.
    documents = [f"{job.title}\n{job.description}"[:6000]]
    documents.extend(", ".join(skills)[:1600] for _, skills in selected)
    try:
        with Client(timeout=12, follow_redirects=False) as client:
            response = client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": "text-embedding-3-small", "input": documents, "dimensions": 256},
            )
            response.raise_for_status()
            records = sorted(response.json()["data"], key=lambda item: item["index"])
        if [item["index"] for item in records] != list(range(len(documents))):
            raise ValueError("The embedding provider returned incomplete results.")
        vectors = [item["embedding"] for item in records]
        if any(len(vector) != 256 or not all(math.isfinite(item) for item in vector) for vector in vectors):
            raise ValueError("The embedding provider returned an invalid vector.")
        query, *resumes = vectors
        matches = [SemanticResumeMatch(
            **source.model_dump(), similarity=round(_similarity(query, vector), 4)
        ) for (source, _), vector in zip(selected, resumes, strict=True)]
    except (HTTPError, KeyError, TypeError, ValueError):
        result.semantic_status = "unavailable"
        return result
    result.semantic_status = "available"
    result.semantic_resume_matches = sorted(matches, key=lambda item: -item.similarity)
    return result


def _similarity(first: list[float], second: list[float]) -> float:
    length = math.hypot(*first) * math.hypot(*second)
    if not length:
        return 0
    return max(-1.0, min(1.0, sum(a * b for a, b in zip(first, second, strict=True)) / length))
