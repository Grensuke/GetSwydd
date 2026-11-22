"""Filter job listings and order them by confirmed skill evidence."""
import re

from app.models import Job, JobSearchPreferences

TOKEN = re.compile(r"\w+(?:[.+#]\w+|[+#]+)*")
INTERNSHIP_TITLES = {"intern", "interns", "internship", "internships"}


def _tokens(value: str) -> set[str]:
    return set(TOKEN.findall(value.casefold()))


def _alternatives(values: list[str]) -> list[set[str]]:
    return [words for value in values if (words := _tokens(value))]


def filter_jobs(
    jobs: list[Job],
    preferences: JobSearchPreferences,
    *,
    query: str = "",
    location: str = "",
    internships_only: bool | None = None,
) -> list[Job]:
    preferred_roles = _alternatives(preferences.role_keywords)
    preferred_locations = _alternatives(preferences.location_keywords)
    query_words, location_words = _tokens(query), _tokens(location)
    require_internship = preferences.internships_only if internships_only is None else internships_only

    results = []
    for job in jobs:
        title = _tokens(job.title)
        place = _tokens(job.location)
        if require_internship and title.isdisjoint(INTERNSHIP_TITLES):
            continue
        if preferred_roles and not any(words <= title for words in preferred_roles):
            continue
        if preferred_locations and not any(words <= place for words in preferred_locations):
            continue
        if query_words <= (title | _tokens(job.company)) and location_words <= place:
            results.append(job)
    return results


def match_sort_key(job: Job) -> tuple[int, float]:
    match = job.match
    if not match or not match.total_skills:
        return 0, 0.0
    return -match.matched_skills, -match.matched_skills / match.total_skills
