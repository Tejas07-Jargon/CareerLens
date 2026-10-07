"""
Celery Background Tasks for Ownership Map Analysis.

Tasks:
1. run_ownership_discovery(profile_id)
   - Discovers candidate repositories and stages RepoAttribution records.
   - Dispatches analyse_repository_ownership for each discovered repository.
2. analyse_repository_ownership(profile_id, attribution_id, force_refresh)
   - Clones bare repo, runs full-history blame, and persists attribution records.
"""

from typing import Optional
import asyncio
import structlog
from app.workers.celery_app import celery_app
from app.services.ownership.ownership_pipeline import OwnershipPipeline

log = structlog.get_logger(__name__)


@celery_app.task(bind=True, name="ownership.discover_and_stage", max_retries=1)
def run_ownership_discovery(self, profile_id: str, github_token: Optional[str] = None) -> None:
    """Discovers repositories for candidate and queues individual analyses."""
    pipeline = OwnershipPipeline(github_token=github_token)
    try:
        staged_repos = asyncio.run(pipeline.discover_and_stage_repositories(profile_id))
        for repo_attr in staged_repos:
            if repo_attr.status in {"discovered", "queued"}:
                analyse_repository_ownership.delay(profile_id, repo_attr.id, False, github_token)
    except Exception as exc:
        log.error("run_ownership_discovery failed", profile_id=profile_id, error=str(exc))
        raise self.retry(exc=exc, countdown=10)


@celery_app.task(bind=True, name="ownership.analyse_repository", max_retries=1)
def analyse_repository_ownership(
    self,
    profile_id: str,
    attribution_id: str,
    force_refresh: bool = False,
    github_token: Optional[str] = None
) -> None:
    """Runs ownership attribution for a single repository."""
    pipeline = OwnershipPipeline(github_token=github_token)
    try:
        asyncio.run(
            pipeline.analyse_repository_attribution(
                profile_id=profile_id,
                attribution_id=attribution_id,
                force_refresh=force_refresh,
            )
        )
    except Exception as exc:
        log.error(
            "analyse_repository_ownership failed",
            profile_id=profile_id,
            attribution_id=attribution_id,
            error=str(exc)
        )
        raise self.retry(exc=exc, countdown=15)
