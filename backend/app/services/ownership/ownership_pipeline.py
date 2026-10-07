"""
Asynchronous Ownership Pipeline & Orchestrator.

Orchestrates:
1. Repository discovery across candidate contributions
2. Database staging and historical snapshot creation
3. Idempotent caching keyed on (profile_id, repo, HEAD SHA, algorithm_version)
4. Full-history blame execution via OwnershipService (run in thread to avoid blocking async loop)
5. Skill attribution persistence and top ranges storage
6. Sanitized progress events emission

IMPORTANT:
  OwnershipService.analyse_repository() is a SYNCHRONOUS, CPU/IO-bound method
  that calls subprocess.run() for git clone + git blame. It MUST be executed via
  asyncio.to_thread() to avoid blocking the async event loop.
"""

import asyncio
import dataclasses
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.ownership import RepoAttribution, SkillOwnership
from app.models.profile import Profile
from app.services.ownership.factor import calculate_ownership_factor
from app.services.ownership.models import LineRange, StudentIdentity
from app.services.ownership.ownership_service import OwnershipService, validate_repo_identifier
from app.services.ownership.repository_discovery import RepositoryDiscoveryService

log = structlog.get_logger(__name__)

OWNERSHIP_ALGORITHM_VERSION = "1"


class OwnershipPipeline:
    """
    Executes repository discovery, caching, and full ownership attribution asynchronously.
    """

    def __init__(
        self,
        discovery_service: Optional[RepositoryDiscoveryService] = None,
        ownership_service: Optional[OwnershipService] = None,
        github_token: Optional[str] = None
    ):
        self.github_token = github_token
        self.discovery_service = discovery_service or RepositoryDiscoveryService(token=github_token)
        self.ownership_service = ownership_service or OwnershipService(github_token=github_token)

    async def discover_and_stage_repositories(
        self,
        profile_id: str,
        session: Optional[AsyncSession] = None
    ) -> List[RepoAttribution]:
        """
        Discovers candidate repositories and stages them in status='discovered'.
        If discovery fails with an error (rate limit, auth failure, etc.),
        a single sentinel 'failed' record is created to surface the error to the frontend.
        """
        close_session = False
        if session is None:
            session = AsyncSessionLocal()
            close_session = True

        try:
            profile = await session.get(Profile, profile_id)
            if not profile or not profile.github_username:
                log.warning("Profile or GitHub username not found", profile_id=profile_id)
                return []

            discovery = await self.discovery_service.discover(profile.github_username)

            staged_records: List[RepoAttribution] = []

            # Propagate discovery errors as a sentinel record so the frontend
            # can display a meaningful error instead of "0 repos found".
            if discovery.discovery_error and not discovery.repositories:
                log.warning("Repository discovery failed with error",
                            profile_id=profile_id,
                            github_username=profile.github_username,
                            error=discovery.discovery_error)

                # Create a sentinel failure record if one doesn't already exist
                sentinel_name = f"_discovery_error_/{profile.github_username}"
                stmt = select(RepoAttribution).where(
                    RepoAttribution.profile_id == profile_id,
                    RepoAttribution.repo_full_name == sentinel_name,
                ).order_by(RepoAttribution.created_at.desc()).limit(1)
                existing_sentinel = (await session.execute(stmt)).scalar_one_or_none()

                if existing_sentinel is None:
                    sentinel = RepoAttribution(
                        profile_id=profile_id,
                        repo_full_name=sentinel_name,
                        relation="owner",
                        status="failed",
                        algorithm_version=OWNERSHIP_ALGORITHM_VERSION,
                        error_message=discovery.discovery_error,
                        notes=[f"Discovery failed: {discovery.discovery_error}"],
                    )
                    session.add(sentinel)
                    await session.commit()
                    await session.refresh(sentinel)
                    staged_records.append(sentinel)
                else:
                    # Update the error on the existing sentinel
                    existing_sentinel.error_message = discovery.discovery_error
                    existing_sentinel.notes = [f"Discovery failed: {discovery.discovery_error}"]
                    await session.commit()
                    staged_records.append(existing_sentinel)

                return staged_records

            for repo_meta in discovery.repositories:
                stmt = select(RepoAttribution).where(
                    RepoAttribution.profile_id == profile_id,
                    RepoAttribution.repo_full_name == repo_meta.repo_full_name,
                ).order_by(RepoAttribution.created_at.desc()).limit(1)

                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()

                if existing is None:
                    attribution = RepoAttribution(
                        profile_id=profile_id,
                        repo_full_name=repo_meta.repo_full_name,
                        relation=repo_meta.relation,
                        status="discovered",
                        algorithm_version=OWNERSHIP_ALGORITHM_VERSION,
                        notes=[f"Discovered via {repo_meta.discovered_via}"],
                    )
                    session.add(attribution)
                    staged_records.append(attribution)
                else:
                    staged_records.append(existing)

            await session.commit()
            for r in staged_records:
                await session.refresh(r)

            return staged_records
        finally:
            if close_session:
                await session.close()

    async def analyse_repository_attribution(
        self,
        profile_id: str,
        attribution_id: str,
        force_refresh: bool = False,
        session: Optional[AsyncSession] = None
    ) -> Optional[RepoAttribution]:
        """
        Executes or reuses ownership analysis for a specific staged repository record.

        CRITICAL: OwnershipService.analyse_repository() is synchronous (subprocess calls).
        It is executed via asyncio.to_thread() to avoid blocking the async event loop.
        """
        close_session = False
        if session is None:
            session = AsyncSessionLocal()
            close_session = True

        attribution = None
        try:
            attribution = await session.get(RepoAttribution, attribution_id)
            if not attribution or attribution.profile_id != profile_id:
                log.error("RepoAttribution not found", attribution_id=attribution_id, profile_id=profile_id)
                return None

            # Skip sentinel error records
            if attribution.repo_full_name.startswith("_discovery_error_/"):
                return attribution

            # Skip already-complete attributions unless force_refresh
            if not force_refresh and attribution.status in {"complete", "partial", "incomplete"}:
                log.info("Skipping already-complete attribution",
                         repo=attribution.repo_full_name, status=attribution.status)
                return attribution

            profile = await session.get(Profile, profile_id)
            if not profile or not profile.github_username:
                attribution.status = "failed"
                attribution.error_message = "Profile or GitHub username not found"
                await session.commit()
                return attribution

            # Strict repository identifier validation
            if not validate_repo_identifier(attribution.repo_full_name):
                attribution.status = "failed"
                attribution.error_message = "Invalid repository identifier format"
                await session.commit()
                return attribution

            # Update status to analysing
            attribution.status = "analysing"
            await session.commit()

            student_identity = StudentIdentity(
                github_login=profile.github_username,
                verified_emails=set(),
            )

            # CRITICAL FIX: Run synchronous blocking analysis in a thread pool executor.
            # Previously this was called directly, blocking the async event loop.
            repo_name = attribution.repo_full_name
            relation = attribution.relation
            ownership_service = self.ownership_service

            result = await asyncio.to_thread(
                ownership_service.analyse_repository,
                repo_identifier=repo_name,
                student_identity=student_identity,
                relation=relation,
            )

            # Idempotency & Cache Check against previous completed analyses for this HEAD SHA
            if not force_refresh and result.head_sha and result.head_sha != "UNKNOWN":
                cache_stmt = select(RepoAttribution).where(
                    RepoAttribution.profile_id == profile_id,
                    RepoAttribution.repo_full_name == attribution.repo_full_name,
                    RepoAttribution.head_sha == result.head_sha,
                    RepoAttribution.algorithm_version == OWNERSHIP_ALGORITHM_VERSION,
                    RepoAttribution.id != attribution.id,
                    RepoAttribution.status.in_(["complete", "partial", "incomplete"]),
                ).order_by(RepoAttribution.created_at.desc()).limit(1)

                cache_res = await session.execute(cache_stmt)
                cached = cache_res.scalar_one_or_none()

                if cached is not None:
                    # Reuse cached metrics without modifying historical record
                    attribution.head_sha = cached.head_sha
                    attribution.coverage = cached.coverage
                    attribution.student_lines = cached.student_lines
                    attribution.other_lines = cached.other_lines
                    attribution.unknown_lines = cached.unknown_lines
                    attribution.bot_lines = cached.bot_lines
                    attribution.total_meaningful_lines = cached.total_meaningful_lines
                    attribution.student_share = cached.student_share
                    attribution.other_share = cached.other_share
                    attribution.unknown_share = cached.unknown_share
                    attribution.incomplete = cached.incomplete
                    attribution.solo_exception_applied = cached.solo_exception_applied
                    attribution.files_total = cached.files_total
                    attribution.files_analysed = cached.files_analysed
                    attribution.files_skipped = cached.files_skipped
                    attribution.skipped_reasons = cached.skipped_reasons
                    attribution.file_results = cached.file_results
                    attribution.status = cached.status
                    attribution.notes = cached.notes + [f"Reused cached analysis for HEAD SHA {cached.head_sha[:7]}"]
                    attribution.execution_time_sec = 0.001

                    # Copy SkillOwnership records from cached record
                    delete_skills_stmt = select(SkillOwnership).where(
                        SkillOwnership.repo_attribution_id == attribution.id
                    )
                    old_skills = (await session.execute(delete_skills_stmt)).scalars().all()
                    for old_sk in old_skills:
                        await session.delete(old_sk)

                    cached_skills_stmt = select(SkillOwnership).where(
                        SkillOwnership.repo_attribution_id == cached.id
                    )
                    cached_skills = (await session.execute(cached_skills_stmt)).scalars().all()
                    for c_sk in cached_skills:
                        session.add(
                            SkillOwnership(
                                repo_attribution_id=attribution.id,
                                skill=c_sk.skill,
                                student_lines=c_sk.student_lines,
                                other_lines=c_sk.other_lines,
                                unknown_lines=c_sk.unknown_lines,
                                total_lines=c_sk.total_lines,
                                share=c_sk.share,
                                factor=c_sk.factor,
                                top_ranges=c_sk.top_ranges,
                            )
                        )

                    await session.commit()
                    return attribution

            # Persist full deterministic result
            attribution.head_sha = result.head_sha
            attribution.method = result.method
            attribution.coverage = result.coverage
            attribution.student_lines = result.student_lines
            attribution.other_lines = result.other_lines
            attribution.unknown_lines = result.unknown_lines
            attribution.bot_lines = result.bot_lines
            attribution.total_meaningful_lines = result.total_meaningful_lines
            attribution.student_share = result.student_share
            attribution.other_share = result.other_share
            attribution.unknown_share = result.unknown_share
            attribution.incomplete = result.incomplete
            attribution.solo_exception_applied = result.solo_exception_applied
            attribution.files_total = result.files_total
            attribution.files_analysed = result.files_analysed
            attribution.files_skipped = result.files_skipped
            attribution.skipped_reasons = result.skipped_reasons
            attribution.file_results = [dataclasses.asdict(f) for f in result.file_results]
            attribution.notes = result.notes
            attribution.execution_time_sec = result.execution_time_sec
            attribution.error_message = result.error_message

            if result.status == "SUCCESS":
                attribution.status = "incomplete" if result.incomplete else "complete"
            elif result.status == "SHALLOW_REJECTED":
                attribution.status = "failed"
            else:
                attribution.status = "failed"

            # Delete old skill ownerships for this attribution if re-analyzing
            delete_skills_stmt = select(SkillOwnership).where(
                SkillOwnership.repo_attribution_id == attribution.id
            )
            old_skills = (await session.execute(delete_skills_stmt)).scalars().all()
            for old_sk in old_skills:
                await session.delete(old_sk)

            # Persist SkillOwnership records with deterministic factor
            for sk in result.skill_results:
                factor = calculate_ownership_factor(
                    student_share=sk.student_share,
                    total_lines=sk.total_meaningful_lines,
                )
                skill_record = SkillOwnership(
                    repo_attribution_id=attribution.id,
                    skill=sk.skill,
                    student_lines=sk.student_lines,
                    other_lines=sk.other_lines,
                    unknown_lines=sk.unknown_lines,
                    total_lines=sk.total_meaningful_lines,
                    share=sk.student_share,
                    factor=factor,
                    top_ranges=[dataclasses.asdict(r) for r in sk.top_ranges],
                )
                session.add(skill_record)

            await session.commit()
            await session.refresh(attribution)
            return attribution

        except Exception as exc:
            log.error("Ownership analysis pipeline failed", attribution_id=attribution_id, error=str(exc))
            if attribution:
                try:
                    attribution.status = "failed"
                    attribution.error_message = f"Analysis failed: {exc}"
                    await session.commit()
                except Exception:
                    pass
            return attribution
        finally:
            if close_session:
                await session.close()
