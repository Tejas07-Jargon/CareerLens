"""Health check route."""

from fastapi import APIRouter
from app.services.adapters.github_adapter import get_github_rate_limit, is_github_token_valid

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "CareerLens API"}


@router.get("/health/github")
async def github_status():
    """Diagnostic endpoint to check GitHub authentication status without exposing tokens."""
    configured = is_github_token_valid()
    rate_limit_info = await get_github_rate_limit()
    
    # Parse rate limit
    resources = rate_limit_info.get("resources", {})
    core = resources.get("core", {})
    
    return {
        "configured": configured,
        "authenticated": configured and rate_limit_info.get("rate", {}).get("limit", 0) > 60,
        "rate_limit_limit": core.get("limit", 0),
        "rate_limit_remaining": core.get("remaining", 0),
        "rate_limit_reset": core.get("reset", 0),
    }
