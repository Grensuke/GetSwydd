from fastapi import APIRouter, HTTPException

from app.discovery_agent import AgentNotConfigured, AgentPlanUnavailable, discover_jobs
from app.discovery_models import DiscoveryRequest, DiscoveryResponse
from app.greenhouse import BoardConfigError

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])


@router.post(
    "/job-discovery",
    response_model=DiscoveryResponse,
    responses={
        429: {"description": "The model provider rate limited the discovery request"},
        502: {"description": "The model provider request failed or returned an unusable plan"},
        503: {"description": "Discovery configuration, provider access, or API quota is unavailable"},
        504: {"description": "The model provider request timed out"},
    },
)
def job_discovery(payload: DiscoveryRequest) -> DiscoveryResponse:
    """Search the configured live catalog from a natural-language request."""
    try:
        return discover_jobs(payload)
    except (AgentNotConfigured, BoardConfigError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AgentPlanUnavailable as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
