"""
Cohorts API – placement-cell batch dashboard.

GET    /cohorts/{id}/insights    Skill heatmap + top gaps
POST   /cohorts/{id}/optimise    Workshop optimiser
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.cohort import Cohort
from app.models.profile import Profile
from app.models.score_run import ScoreRun

router = APIRouter()


class WorkshopCandidate(BaseModel):
    name: str
    skills_covered: List[str]


class OptimiseRequest(BaseModel):
    candidate_workshops: List[WorkshopCandidate]
    budget: int = 3
    readiness_threshold: float = 0.6


@router.get("/{cohort_id}/insights")
async def cohort_insights(
    cohort_id: str,
    session: AsyncSession = Depends(get_session),
):
    cohort = await session.get(Cohort, cohort_id)
    if cohort is None:
        raise HTTPException(status_code=404, detail="Cohort not found")

    # Load all profiles in the cohort
    profile_result = await session.execute(
        select(Profile).where(Profile.cohort_id == cohort_id)
    )
    profiles = profile_result.scalars().all()
    profile_ids = [p.id for p in profiles]

    if not profile_ids:
        return {"heatmap": {}, "top_gaps": [], "cohort_size": 0}

    # Load latest ScoreRun for each profile
    score_runs_raw = []
    for pid in profile_ids:
        sr_result = await session.execute(
            select(ScoreRun)
            .where(ScoreRun.profile_id == pid)
            .order_by(ScoreRun.created_at.desc())
            .limit(1)
        )
        sr = sr_result.scalar_one_or_none()
        if sr:
            score_runs_raw.append({"claim_statuses": sr.claim_statuses})

    from app.services.batch.batch_analytics_service import BatchAnalyticsService
    svc = BatchAnalyticsService(score_runs=score_runs_raw, cohort_size=len(profiles))

    heatmap = svc.skill_heatmap()
    top_gaps = svc.top_skill_gaps(n=15)

    return {
        "cohort_id": cohort_id,
        "cohort_name": cohort.name,
        "cohort_size": len(profiles),
        "heatmap": heatmap,
        "top_gaps": top_gaps,
    }


@router.post("/{cohort_id}/optimise")
async def optimise_workshops(
    cohort_id: str,
    body: OptimiseRequest,
    session: AsyncSession = Depends(get_session),
):
    cohort = await session.get(Cohort, cohort_id)
    if cohort is None:
        raise HTTPException(status_code=404, detail="Cohort not found")

    profile_result = await session.execute(
        select(Profile).where(Profile.cohort_id == cohort_id)
    )
    profiles = profile_result.scalars().all()
    profile_ids = [p.id for p in profiles]

    score_runs_raw = []
    for pid in profile_ids:
        sr_result = await session.execute(
            select(ScoreRun)
            .where(ScoreRun.profile_id == pid)
            .order_by(ScoreRun.created_at.desc())
            .limit(1)
        )
        sr = sr_result.scalar_one_or_none()
        if sr:
            score_runs_raw.append({"claim_statuses": sr.claim_statuses})

    from app.services.batch.batch_analytics_service import BatchAnalyticsService
    svc = BatchAnalyticsService(score_runs=score_runs_raw, cohort_size=len(profiles))

    candidates = [w.model_dump() for w in body.candidate_workshops]
    plan = svc.optimise_workshops(
        candidate_workshops=candidates,
        budget=body.budget,
        readiness_threshold=body.readiness_threshold,
    )

    return {
        "cohort_id": cohort_id,
        "cohort_size": len(profiles),
        "selected_workshops": plan,
    }
