"""Compare declared job requirements with confirmed resume facts."""
import re
from collections import defaultdict
from dataclasses import dataclass

from app.models import Job, JobMatch, RequirementMatch, ResumeRecommendation
from app.resume_models import ApplicationDetails, ConfirmedProfile, ProfileFact


@dataclass(frozen=True)
class SkillRequirement:
    label: str
    accepted_names: tuple[str, ...]


@dataclass(frozen=True)
class JobRequirements:
    skills: tuple[SkillRequirement, ...]
    manual_checks: tuple[str, ...] = ()


PYTHON = SkillRequirement("Python", ("python", "python 3", "python3", "python (pandas)", "python pandas"))
WEB_FRAMEWORK = SkillRequirement("FastAPI or Flask", ("fastapi", "flask"))
SQL = SkillRequirement("SQL", ("sql", "structured query language"))
PANDAS = SkillRequirement("pandas", ("pandas", "python (pandas)", "python pandas"))
DATA_VISUALIZATION = SkillRequirement(
    "Data visualization",
    ("data visualization", "data visualisation", "matplotlib", "seaborn", "plotly", "tableau", "power bi"),
)

REQUIREMENTS: dict[str, JobRequirements] = {
    "job-py-001": JobRequirements(
        skills=(
            PYTHON,
            WEB_FRAMEWORK,
            SkillRequirement("Git", ("git", "git version control", "git workflow")),
        ),
        manual_checks=("Current student or recent graduate", "UK work authorization"),
    ),
    "job-da-002": JobRequirements(
        skills=(
            SQL,
            PYTHON,
            PANDAS,
            DATA_VISUALIZATION,
            SkillRequirement(
                "Communication",
                ("communication", "communication skills", "written communication", "verbal communication"),
            ),
        ),
        manual_checks=("UK work authorization",),
    ),
}

DESCRIPTION_SKILLS = (
    PYTHON, SQL, PANDAS,
    *(SkillRequirement(name, (name.casefold(),)) for name in (
        "FastAPI", "Flask", "Git", "Matplotlib", "Seaborn", "Plotly", "Tableau", "Power BI",
        "Java", "JavaScript", "TypeScript", "React", "Node.js", "Docker", "Kubernetes",
    )),
)
DESCRIPTION_PATTERNS = [
    (skill, re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, skill.accepted_names)) + r")(?!\w)"))
    for skill in DESCRIPTION_SKILLS
]
REQUIRED_HEADING = re.compile(
    r"(?im)^\s*(?:requirements|eligibility|required (?:skills|qualifications)|minimum qualifications|what you(?:'|’)ll need)\s*:?[ \t]*$"
)
OTHER_HEADING = re.compile(
    r"(?im)^\s*(?:preferred(?: qualifications| skills)?|nice to have|responsibilities|benefits|what we offer|about us|compensation|salary)\s*:?[ \t]*$"
)
OPTIONAL_OR_ALTERNATIVE = re.compile(r"\b(or|either|one of|preferred|optional|bonus|nice to have)\b", re.I)
MANUAL_CHECKS = (
    ("Work authorization", re.compile(r"\b(work authorization|legally authori[sz]ed|right to work|visa sponsorship)\b", re.I)),
    ("Experience duration", re.compile(r"\b\d+\+?\s+years? (?:of )?(?:(?:relevant|professional|industry) )?experience\b", re.I)),
    ("Education or enrollment", re.compile(r"\b(degree|currently enrolled|recent graduate)\b", re.I)),
)
UK_AUTHORIZATION = re.compile(r"\b(?:authori[sz](?:ed|ation)|right|eligibility|eligible)\s+to work in (?:the )?(?:uk|united kingdom)\b", re.I)


def _required_text(description: str) -> str:
    heading = REQUIRED_HEADING.search(description)
    if heading is None:
        return ""
    section = description[heading.end():].strip()
    end = OTHER_HEADING.search(section)
    return section[:end.start()] if end else section


def normalize_skill(value: str) -> str:
    return " ".join(value.casefold().split())


def match_jobs(
    jobs: list[Job], profile: ConfirmedProfile, details: ApplicationDetails | None = None
) -> list[Job]:
    confirmed_skills: defaultdict[str, list[ProfileFact]] = defaultdict(list)
    for fact in profile.facts:
        if fact.category == "skills":
            name = normalize_skill(fact.value)
            confirmed_skills[name].append(fact)

    results = []
    for job in jobs:
        rules = REQUIREMENTS.get(job.id)
        explicitly_required = set()
        live = job.source != "demo"
        if live:
            original = job.description or ""
            description = normalize_skill(original)
            required = normalize_skill("\n".join(
                line for line in _required_text(original).splitlines() if not OPTIONAL_OR_ALTERNATIVE.search(line)
            ))
            mentioned = tuple(skill for skill, pattern in DESCRIPTION_PATTERNS if pattern.search(description))
            explicitly_required = {skill.label for skill, pattern in DESCRIPTION_PATTERNS if pattern.search(required)}
            manual = tuple(label for label, pattern in MANUAL_CHECKS if pattern.search(required))
            if UK_AUTHORIZATION.search(required):
                manual = tuple(label for label in manual if label != "Work authorization") + ("UK work authorization",)
            if mentioned or manual:
                rules = JobRequirements(skills=mentioned, manual_checks=manual)
        if rules is None:
            results.append(job)
            continue

        requirements: list[RequirementMatch] = []
        coverage_by_resume: dict[str, ResumeRecommendation] = {}
        matched_skills = 0
        for skill in rules.skills:
            evidence = [
                fact for name in skill.accepted_names for fact in confirmed_skills.get(name, ())
            ]
            requirements.append(RequirementMatch(
                label=skill.label,
                status="evidence_found" if evidence else "no_confirmed_evidence",
                evidence=evidence,
                kind="required_skill" if not live or skill.label in explicitly_required else "mentioned_skill",
            ))
            if evidence:
                matched_skills += 1
            for source in {source.resume_id: source for fact in evidence for source in fact.sources}.values():
                if source.resume_id not in coverage_by_resume:
                    coverage_by_resume[source.resume_id] = ResumeRecommendation(
                        **source.model_dump(), covered_requirements=[]
                    )
                coverage_by_resume[source.resume_id].covered_requirements.append(skill.label)

        recommendation = min(
            coverage_by_resume.values(),
            key=lambda resume: (-len(resume.covered_requirements), resume.filename.casefold(), resume.resume_id),
            default=None,
        )
        for label in rules.manual_checks:
            authorization = details.uk_work_authorization if label == "UK work authorization" and details else None
            if authorization is None:
                requirements.append(RequirementMatch(label=label, status="needs_confirmation", kind="manual_check"))
            else:
                requirements.append(RequirementMatch(
                    label=label, status="evidence_found" if authorization == "authorized" else "not_met",
                    kind="manual_check", confirmation_source="profile.uk_work_authorization",
                ))
        required_results = [item for item in requirements if item.kind == "required_skill"]
        if any(item.status == "not_met" for item in requirements):
            eligibility = "not_met"
        elif any(item.status == "no_confirmed_evidence" for item in required_results):
            eligibility = "missing_evidence"
        elif any(item.status == "needs_confirmation" for item in requirements):
            eligibility = "needs_confirmation"
        elif requirements and (required_results or rules.manual_checks):
            eligibility = "listed_requirements_supported"
        else:
            eligibility = "not_established"
        match = JobMatch(
            has_confirmed_profile=bool(profile.facts),
            requirements=requirements,
            matched_skills=matched_skills,
            total_skills=len(rules.skills),
            recommended_resume=recommendation,
            scope="description_mentions" if live else "listed_requirements",
            eligibility_status=eligibility,
        )
        results.append(job.model_copy(update={"match": match}))
    return results
