"""Compare declared job requirements with confirmed resume facts."""
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
REQUIREMENTS: dict[str, JobRequirements] = {
    "job-py-001": JobRequirements(
        skills=(
            PYTHON,
            SkillRequirement("FastAPI or Flask", ("fastapi", "flask")),
            SkillRequirement("Git", ("git", "git version control", "git workflow")),
        ),
        manual_checks=("Current student or recent graduate", "UK work authorization"),
    ),
    "job-da-002": JobRequirements(
        skills=(
            SkillRequirement("SQL", ("sql", "structured query language")),
            PYTHON,
            SkillRequirement("pandas", ("pandas", "python (pandas)", "python pandas")),
            SkillRequirement(
                "Data visualization",
                ("data visualization", "data visualisation", "matplotlib", "seaborn", "plotly", "tableau", "power bi"),
            ),
            SkillRequirement(
                "Communication",
                ("communication", "communication skills", "written communication", "verbal communication"),
            ),
        ),
        manual_checks=("UK work authorization",),
    ),
}


def match_jobs(jobs: list[Job], profile: ConfirmedProfile) -> list[Job]:
    confirmed_skills: defaultdict[str, list[ProfileFact]] = defaultdict(list)
    for fact in profile.facts:
        if fact.category == "skills":
            name = " ".join(fact.value.casefold().split())
            confirmed_skills[name].append(fact)

    results = []
    for job in jobs:
        rules = REQUIREMENTS.get(job.id)
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
        )
        results.append(job.model_copy(update={"match": match}))
    return results
