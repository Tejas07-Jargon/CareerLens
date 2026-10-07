"""
Ownership Map API Routes.

Endpoints:
- GET    /profiles/{profile_id}/ownership              Overview & repository summaries
- GET    /profiles/{profile_id}/ownership/repos/{id}   Detailed repository breakdown & skill ranges
- POST   /profiles/{profile_id}/ownership/refresh      Trigger re-discovery and queue analysis
- POST   /profiles/{profile_id}/identities             Stage declared commit email (pending binding)
- DELETE /profiles/{profile_id}/identities/{id}        Delete declared commit email
"""

import asyncio
import hashlib
from typing import Any, Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_session
from app.models.ownership import IdentityDeclaration, RepoAttribution, SkillOwnership
from app.models.profile import Profile
from app.services.ownership.ownership_pipeline import OWNERSHIP_ALGORITHM_VERSION, OwnershipPipeline

log = structlog.get_logger(__name__)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmailDeclarationRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Invalid email format")
        return clean


class RefreshOwnershipRequest(BaseModel):
    github_token: Optional[str] = None


class IdentityDeclarationResponse(BaseModel):
    id: str
    profile_id: str
    email_hash: str
    masked_email: str
    status: str
    reason: str
    created_at: str


def _mask_email(email: str) -> str:
    """Mask email for privacy, e.g. 'alice@example.com' -> 'a***e@example.com'."""
    clean = email.strip().lower()
    if "@" not in clean:
        return "***"
    local, domain = clean.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


# ── GET /profiles/{profile_id}/ownership ───────────────────────────────────────

@router.get("/{profile_id}/ownership")
async def get_profile_ownership_overview(
    profile_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """
    Returns high-level ownership status, repository summaries, and aggregate skill contributions.

    Computes overall_coverage as the byte-weighted average of per-repo coverage.
    Surfaces discovery errors from sentinel records instead of showing 0 repos with no explanation.
    """
    profile = await session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    stmt = (
        select(RepoAttribution)
        .options(selectinload(RepoAttribution.skill_ownerships))
        .where(RepoAttribution.profile_id == profile_id)
        .order_by(RepoAttribution.created_at.desc())
    )
    res = await session.execute(stmt)
    attributions = res.scalars().all()

    # Deduplicate latest record per repo
    latest_by_repo: Dict[str, RepoAttribution] = {}
    for attr in attributions:
        if attr.repo_full_name not in latest_by_repo:
            latest_by_repo[attr.repo_full_name] = attr

    # Check for discovery error sentinel records
    discovery_error: Optional[str] = None
    real_repos: Dict[str, RepoAttribution] = {}
    for repo_name, attr in latest_by_repo.items():
        if repo_name.startswith("_discovery_error_/"):
            discovery_error = attr.error_message or "Repository discovery failed"
        else:
            real_repos[repo_name] = attr

    repo_summaries = []
    overall_student_lines = 0.0
    overall_total_lines = 0.0
    overall_analysed_bytes = 0.0   # for weighted coverage
    overall_eligible_bytes = 0.0   # for weighted coverage
    skill_aggregates: Dict[str, Dict[str, float]] = {}

    for attr in real_repos.values():
        repo_summaries.append({
            "id": attr.id,
            "repo_full_name": attr.repo_full_name,
            "relation": attr.relation,
            "head_sha": attr.head_sha,
            "status": attr.status,
            "coverage": attr.coverage,
            "student_lines": attr.student_lines,
            "total_meaningful_lines": attr.total_meaningful_lines,
            "student_share": attr.student_share,
            "other_share": attr.other_share,
            "unknown_share": attr.unknown_share,
            "incomplete": attr.incomplete,
            "solo_exception_applied": attr.solo_exception_applied,
            "notes": attr.notes,
            "error_message": attr.error_message,
            "created_at": attr.created_at.isoformat() if attr.created_at else None,
        })

        if attr.status in {"complete", "partial", "incomplete"}:
            overall_student_lines += attr.student_lines
            overall_total_lines += attr.total_meaningful_lines

            # Weighted coverage: use total_meaningful_lines as weight proxy
            # (ideally bytes, but lines is a consistent approximation)
            w = attr.total_meaningful_lines
            overall_analysed_bytes += w * attr.coverage
            overall_eligible_bytes += w

            for sk in attr.skill_ownerships:
                if sk.skill not in skill_aggregates:
                    skill_aggregates[sk.skill] = {"student_lines": 0.0, "total_lines": 0.0}
                skill_aggregates[sk.skill]["student_lines"] += sk.student_lines
                skill_aggregates[sk.skill]["total_lines"] += sk.total_lines

    # Sort repos deterministically
    repo_summaries.sort(key=lambda r: r["repo_full_name"].lower())

    # Build skill aggregates
    skills_list = []
    for sk_name, vals in sorted(skill_aggregates.items()):
        s_share = (vals["student_lines"] / vals["total_lines"]) if vals["total_lines"] > 0 else 0.0
        skills_list.append({
            "skill": sk_name,
            "student_lines": round(vals["student_lines"], 2),
            "total_lines": round(vals["total_lines"], 2),
            "student_share": round(s_share, 4),
        })

    aggregate_share = (overall_student_lines / overall_total_lines) if overall_total_lines > 0 else 0.0
    overall_coverage = (overall_analysed_bytes / overall_eligible_bytes) if overall_eligible_bytes > 0 else 0.0

    return {
        "profile_id": profile_id,
        "github_username": profile.github_username,
        "algorithm_version": OWNERSHIP_ALGORITHM_VERSION,
        "total_repositories": len(repo_summaries),
        "overall_student_share": round(aggregate_share, 4),
        "overall_coverage": round(overall_coverage, 4),
        "overall_student_lines": round(overall_student_lines, 2),
        "overall_total_lines": round(overall_total_lines, 2),
        "repositories": repo_summaries,
        "skills": skills_list,
        "discovery_error": discovery_error,
    }



# ── GET /profiles/{profile_id}/ownership/repos/{attribution_id} ───────────────

@router.get("/{profile_id}/ownership/repos/{attribution_id}")
async def get_repository_ownership_detail(
    profile_id: str,
    attribution_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """
    Returns detailed repository analysis breakdown including skill ranges and file results.
    """
    stmt = (
        select(RepoAttribution)
        .options(selectinload(RepoAttribution.skill_ownerships))
        .where(
            RepoAttribution.id == attribution_id,
            RepoAttribution.profile_id == profile_id,
        )
    )
    res = await session.execute(stmt)
    attr = res.scalar_one_or_none()

    if not attr:
        raise HTTPException(status_code=404, detail="Repository attribution not found")

    skills_data = []
    for sk in attr.skill_ownerships:
        skills_data.append({
            "id": sk.id,
            "skill": sk.skill,
            "student_lines": sk.student_lines,
            "other_lines": sk.other_lines,
            "unknown_lines": sk.unknown_lines,
            "total_lines": sk.total_lines,
            "share": sk.share,
            "factor": sk.factor,
            "top_ranges": sk.top_ranges,
        })

    return {
        "id": attr.id,
        "profile_id": attr.profile_id,
        "repo_full_name": attr.repo_full_name,
        "relation": attr.relation,
        "head_sha": attr.head_sha,
        "method": attr.method,
        "status": attr.status,
        "coverage": attr.coverage,
        "student_lines": attr.student_lines,
        "other_lines": attr.other_lines,
        "unknown_lines": attr.unknown_lines,
        "bot_lines": attr.bot_lines,
        "total_meaningful_lines": attr.total_meaningful_lines,
        "student_share": attr.student_share,
        "other_share": attr.other_share,
        "unknown_share": attr.unknown_share,
        "incomplete": attr.incomplete,
        "solo_exception_applied": attr.solo_exception_applied,
        "files_total": attr.files_total,
        "files_analysed": attr.files_analysed,
        "files_skipped": attr.files_skipped,
        "skipped_reasons": attr.skipped_reasons,
        "file_results": attr.file_results,
        "skills": skills_data,
        "notes": attr.notes,
        "error_message": attr.error_message,
        "execution_time_sec": attr.execution_time_sec,
        "created_at": attr.created_at.isoformat() if attr.created_at else None,
    }


# ── POST /profiles/{profile_id}/ownership/refresh ─────────────────────────────

@router.post("/{profile_id}/ownership/refresh", status_code=202)
async def refresh_profile_ownership(
    profile_id: str,
    payload: Optional[RefreshOwnershipRequest] = None,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """
    Triggers repository discovery and queues ownership analysis asynchronously.
    Reuses existing cached results when remote HEAD has not changed.
    """
    github_token = payload.github_token if payload else None
    profile = await session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.github_username:
        raise HTTPException(status_code=400, detail="Profile does not have a linked GitHub username")

    # Try dispatching via Celery in production if Redis is reachable; fallback immediately to in-process task
    dispatched = False
    try:
        import redis as _redis
        from app.core.config import settings as _s
        _r = _redis.from_url(_s.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
        _r.ping()
        from app.workers.ownership_tasks import run_ownership_discovery
        run_ownership_discovery.apply_async(args=[profile_id], kwargs={"github_token": github_token}, retry=False)
        dispatched = True
    except Exception as exc:
        log.info("Redis/Celery worker unavailable, executing in-process async task", error=str(exc))

    if not dispatched:
        async def run_in_process(pid: str, token: Optional[str]):
            try:
                pipeline = OwnershipPipeline(github_token=token)
                staged = await pipeline.discover_and_stage_repositories(pid)
                for repo_attr in staged:
                    await pipeline.analyse_repository_attribution(pid, repo_attr.id)
            except Exception as e:
                log.error("In-process ownership analysis failed", profile_id=pid, error=str(e))

        asyncio.create_task(run_in_process(profile_id, github_token))

    return {
        "profile_id": profile_id,
        "status": "queued",
        "message": "Ownership discovery and analysis queued successfully",
    }


# ── Identity Declaration Endpoints ───────────────────────────────────────────

@router.post("/{profile_id}/identities", status_code=201)
async def declare_commit_identity(
    profile_id: str,
    payload: EmailDeclarationRequest,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """
    Stages a declared commit email address.
    Explicitly marked as 'pending' with reason='github_binding_required'
    until cryptographic Proof of Control is implemented.
    """
    profile = await session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    clean_email = payload.email.strip().lower()
    email_hash = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    masked = _mask_email(clean_email)

    # Check for existing declaration
    stmt = select(IdentityDeclaration).where(
        IdentityDeclaration.profile_id == profile_id,
        IdentityDeclaration.email_hash == email_hash,
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()

    if existing:
        return {
            "id": existing.id,
            "profile_id": existing.profile_id,
            "email_hash": existing.email_hash,
            "masked_email": existing.masked_email,
            "status": existing.status,
            "reason": existing.reason,
            "created_at": existing.created_at.isoformat(),
        }

    declaration = IdentityDeclaration(
        profile_id=profile_id,
        email_hash=email_hash,
        masked_email=masked,
        status="pending",
        reason="github_binding_required",
    )
    session.add(declaration)
    await session.commit()
    await session.refresh(declaration)

    return {
        "id": declaration.id,
        "profile_id": declaration.profile_id,
        "email_hash": declaration.email_hash,
        "masked_email": declaration.masked_email,
        "status": declaration.status,
        "reason": declaration.reason,
        "created_at": declaration.created_at.isoformat(),
    }


@router.delete("/{profile_id}/identities/{identity_id}", status_code=200)
async def delete_commit_identity(
    profile_id: str,
    identity_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Deletes a staged commit email identity declaration."""
    stmt = select(IdentityDeclaration).where(
        IdentityDeclaration.id == identity_id,
        IdentityDeclaration.profile_id == profile_id,
    )
    declaration = (await session.execute(stmt)).scalar_one_or_none()
    if not declaration:
        raise HTTPException(status_code=404, detail="Identity declaration not found")

    await session.delete(declaration)
    await session.commit()

    return {"message": "Identity declaration deleted successfully", "id": identity_id}
