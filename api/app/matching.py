"""Compare declared job requirements with confirmed resume facts."""
import re
from collections import defaultdict
from dataclasses import dataclass

from app.models import Job, JobMatch, RequirementMatch, ResumeRecommendation
from app.resume_models import ConfirmedProfile, ProfileFact


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


def normalize_skill(value: str) -> str:
    return " ".join(value.casefold().split())


def match_jobs(jobs: list[Job], profile: ConfirmedProfile) -> list[Job]:
    confirmed_skills: defaultdict[str, list[ProfileFact]] = defaultdict(list)
    for fact in profile.facts:
        if fact.category == "skills":
            name = normalize_skill(fact.value)
            confirmed_skills[name].append(fact)

    results = []
    for job in jobs:
        rules = REQUIREMENTS.get(job.id)
        if job.source == "greenhouse":
            description = normalize_skill(job.description or "")
            mentioned = tuple(skill for skill, pattern in DESCRIPTION_PATTERNS if pattern.search(description))
            if mentioned:
                rules = JobRequirements(skills=mentioned)
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
        requirements.extend(
            RequirementMatch(label=label, status="needs_confirmation")
            for label in rules.manual_checks
        )
        match = JobMatch(
            has_confirmed_profile=bool(profile.facts),
            requirements=requirements,
            matched_skills=matched_skills,
            total_skills=len(rules.skills),
            recommended_resume=recommendation,
            scope="description_mentions" if job.source == "greenhouse" else "listed_requirements",
        )
        results.append(job.model_copy(update={"match": match}))
    return results
