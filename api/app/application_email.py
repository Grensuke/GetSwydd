"""Identify application-by-email instructions in an official job listing."""
import re

from app.models import ApplicationDraft, ApplicationEmail, Job

EMAIL = r"[a-z0-9_+.-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+"
EMAIL_DIRECTIVE = re.compile(
    rf"(?i)(?:(?:to apply[:,]|how to apply:)\s*)?"
    rf"(?:(?:please\s+)?(?:email|send)\s+(?:us\s+)?(?:your\s+)?(?:r[eé]sum[eé]|cv)\s+to\s+"
    rf"|apply\s+by\s+email:\s*)(?P<recipient>{EMAIL})\.?"
)


def application_email_instruction(job: Job) -> tuple[str, str] | None:
    if job.source == "demo" or not job.apply_url or not job.description:
        return None
    # Accept a standalone instruction, never a contact address mentioned in passing.
    matches = [match for line in job.description.splitlines()
               if (match := EMAIL_DIRECTIVE.fullmatch(line.strip()))]
    if len(matches) != 1 or len(matches[0]["recipient"]) > 254:
        return None
    return matches[0]["recipient"], matches[0][0].strip()


def application_email_for(job: Job, draft: ApplicationDraft) -> ApplicationEmail | None:
    address = application_email_instruction(job)
    if address is None:
        return None
    recipient, instruction = address
    title = " ".join(job.title.split())
    company = " ".join(job.company.split())
    return ApplicationEmail(
        recipient=recipient,
        instruction=instruction,
        subject=f"Application for {title}",
        body=(
            f"Hello {company} hiring team,\n\n"
            f"I’m applying for the {title} position. My résumé is attached for your review.\n\n"
            f"Thank you for your consideration,\n{draft.candidate_name}"
        ),
    )
