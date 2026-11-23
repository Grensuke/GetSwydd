"""Filter job listings and order them by confirmed skill evidence."""
import re
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from app.models import Employment, ExperienceLevel, Job, JobSearchPreferences, Workplace

TOKEN = re.compile(r"\w+(?:[.+#]\w+|[+#]+)*")
INTERNSHIP_TITLES = {"intern", "interns", "internship", "internships"}
DEADLINE = re.compile(r"(?im)^\s*(?:application deadline|applications close|closing date)\s*:\s*(\d{4}-\d{2}-\d{2})\b")
DECLARED_EMPLOYMENT = re.compile(r"(?im)^\s*(?:employment type|job type)\s*:\s*(full[- ]time|part[- ]time|contract|temporary|internship)\b")
LOCATION_LABELS = re.compile(
    r"(?im)^\s*(?:eligible locations|application locations|work from|open to applicants from|remote locations|location)\s*:\s*(.+)$"
)
LOCATION_LIMITS = re.compile(r"\b(except|excluding|but not|not eligible|not available|outside of|no applicants)\b", re.I)
WORLDWIDE_LOCATIONS = {
    "global remote", "remote global", "remote globally", "remote worldwide",
    "worldwide", "worldwide remote", "anywhere in the world", "remote anywhere in the world",
}
INDIA_LOCATIONS = re.compile(
    r"\b(?:india|ahmedabad|andhra pradesh|bangalore|bengaluru|bhubaneswar|bombay|"
    r"chandigarh|chennai|cochin|coimbatore|delhi|gandhinagar|goa|greater noida|"
    r"gujarat|gurgaon|gurugram|haryana|hyderabad|indore|jaipur|karnataka|kerala|"
    r"kochi|kolkata|lucknow|madras|maharashtra|mohali|mumbai|mysore|mysuru|"
    r"nagpur|navi mumbai|noida|odisha|pune|rajasthan|surat|tamil nadu|telangana|"
    r"thiruvananthapuram|trivandrum|uttar pradesh|vadodara|vijayawada|visakhapatnam|"
    r"vizag|west bengal)\b",
    re.I,
)
FOREIGN_PLACE_NAMES = re.compile(
    r"\b(?:hyderabad,? (?:sindh|pakistan)|kochi,? japan|delhi,? (?:ny|new york)|surat thani)\b", re.I
)
LOCATION_ALIASES = {
    "bangalore": "bengaluru", "bombay": "mumbai", "cochin": "kochi", "gurgaon": "gurugram",
    "madras": "chennai", "mysore": "mysuru", "trivandrum": "thiruvananthapuram",
    "vizag": "visakhapatnam",
}


def search_tokens(value: str) -> set[str]:
    return set(TOKEN.findall(value.casefold()))


def _alternatives(values: list[str]) -> list[set[str]]:
    return [words for value in values if (words := search_tokens(value))]


def _location_tokens(value: str) -> set[str]:
    return {LOCATION_ALIASES.get(word, word) for word in search_tokens(value)}


def _india_location(value: str) -> bool:
    if LOCATION_LIMITS.search(value):
        return False
    return bool(INDIA_LOCATIONS.search(FOREIGN_PLACE_NAMES.sub("", value)))


def location_statements(job: Job) -> list[str]:
    return [job.location, *job.additional_locations, *LOCATION_LABELS.findall(job.description or "")]


def india_location_evidence(job: Job) -> str | None:
    statements = location_statements(job)
    for statement in statements:
        restriction = LOCATION_LIMITS.search(statement)
        if restriction and "india" in search_tokens(statement[restriction.end():]):
            return None
    for statement in statements:
        if _india_location(statement) or " ".join(statement.casefold().split()) in WORLDWIDE_LOCATIONS:
            return statement.strip()
    return None


def enrich_listing(job: Job) -> Job:
    title = search_tokens(job.title)
    place = job.location.casefold()
    workplace: Workplace | None = job.workplace
    if workplace is None:
        for pattern, mode in [(r"\bhybrid\b", "hybrid"), (r"\bon[- ]?site\b", "onsite"), (r"\bremote\b", "remote")]:
            if re.search(pattern, place):
                workplace = mode
                break
    employment: Employment | None = job.employment
    if employment is None:
        declared = DECLARED_EMPLOYMENT.search(job.description or "")
        if declared:
            employment = declared.group(1).casefold().replace("-", "_").replace(" ", "_")
    level: ExperienceLevel | None = job.experience_level
    if not title.isdisjoint(INTERNSHIP_TITLES) or employment == "internship":
        employment = "internship"
        level = "intern"
    elif not title.isdisjoint({"senior", "staff", "principal", "lead"}):
        level = level or "senior"
    elif re.search(r"\b(junior|entry[- ]level|new grad(?:uate)?|graduate program|graduate trainee|fresher|early careers)\b", job.title.casefold()):
        level = level or "entry"
    elif re.search(r"\bmid[- ]level\b", job.title.casefold()):
        level = level or "mid"
    closing = job.application_deadline
    if closing is None:
        hint = DEADLINE.search(job.description or "")
        if hint:
            try:
                closing = date.fromisoformat(hint.group(1)).isoformat()
            except ValueError:
                pass
    return job.model_copy(update={
        "workplace": workplace, "employment": employment, "experience_level": level,
        "application_deadline": closing,
    })


def filter_jobs(
    jobs: list[Job],
    preferences: JobSearchPreferences,
    *,
    query: str = "",
    location: str = "",
    internships_only: bool | None = None,
    closing_within_days: int | None = None,
    market: Literal["all", "india"] = "all",
) -> list[Job]:
    preferred_roles = _alternatives(preferences.role_keywords)
    preferred_locations = [words for value in preferences.location_keywords if (words := _location_tokens(value))]
    query_words, location_words = search_tokens(query), _location_tokens(location)
    require_internship = preferences.internships_only if internships_only is None else internships_only
    today = datetime.now(timezone.utc).date().isoformat()
    closing_by = None
    if closing_within_days is not None:
        closing_by = (date.fromisoformat(today) + timedelta(days=closing_within_days)).isoformat()

    results = []
    for job in jobs:
        if market == "india" and not india_location_evidence(job):
            continue
        job = enrich_listing(job)
        deadline = job.application_deadline
        if deadline and deadline < today:
            continue
        if closing_by and (not deadline or deadline > closing_by):
            continue
        title = search_tokens(job.title)
        places = [
            _location_tokens(place) | ({"india"} if _india_location(place) else set())
            for place in [job.location, *job.additional_locations] if not LOCATION_LIMITS.search(place)
        ]
        if require_internship and job.employment != "internship":
            continue
        if preferred_roles and not any(words <= title for words in preferred_roles):
            continue
        if preferred_locations and not any(words <= place for words in preferred_locations for place in places):
            continue
        if not _accepts(preferences.workplace_modes, job.workplace, preferences.include_unknown):
            continue
        if not _accepts(preferences.employment_types, job.employment, preferences.include_unknown):
            continue
        if not _accepts(preferences.experience_levels, job.experience_level, preferences.include_unknown):
            continue
        floor = preferences.minimum_pay
        if floor:
            comparable = [item for item in job.compensation if item.currency == floor.currency and item.period == floor.period]
            if comparable and max(item.maximum for item in comparable) < floor.amount:
                continue
            if not comparable and not preferences.include_unknown:
                continue
        if location_words and not any(location_words <= place for place in places):
            continue
        if query_words <= (title | search_tokens(job.company)):
            results.append(job)
    return results


def _accepts(choices: list[str], value: str | None, include_unknown: bool) -> bool:
    return not choices or (value in choices if value is not None else include_unknown)


def match_sort_key(job: Job) -> tuple[bool, int, float]:
    match = job.match
    blocked = match is not None and match.eligibility_status == "not_met"
    if not match or not match.total_skills:
        return blocked, 0, 0.0
    return blocked, -match.matched_skills, -match.matched_skills / match.total_skills
