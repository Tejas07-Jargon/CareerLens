"""
Job Fit API Routes.

Provides endpoints for evidence-based Job Fit Intelligence, skill matrix evaluation,
claim vs proof analysis, what-if simulations, and multi-job comparison.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_session
from app.models.profile import Profile
from app.models.score_run import ScoreRun
from app.models.evidence import Evidence
from app.services.job_fit.job_fit_service import JobFitEngine, PRESET_JOBS

router = APIRouter()


# ── Request Schemas ────────────────────────────────────────────────────────────

class JobFitAnalyzeRequest(BaseModel):
    profile_id: Optional[str] = "demo-candidate-82"
    preset_id: Optional[str] = None
    jd_text: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None


class JobFitWhatIfRequest(BaseModel):
    base_job_fit: Dict[str, Any]
    actions: List[Dict[str, Any]]  # [{skill, strength, description}]


class JobFitCompareRequest(BaseModel):
    profile_id: Optional[str] = "demo-candidate-82"
    job_ids: List[str]  # ["jd-neuralflow-ai", "jd-cloudscale-swe", "jd-fintech-backend"]


def _get_evidence_fallback(profile_id: str, evidence_items: List[Evidence]) -> List[Evidence]:
    if not evidence_items and profile_id == "demo-candidate-82":
        return [
            Evidence(
                id="ev_py",
                profile_id="demo-candidate-82",
                source="github_repo",
                evidence_type="language",
                skill_hints=["Python", "FastAPI"],
                reliability=0.92,
                depth=0.88,
                recency=0.95,
                authenticity=0.98,
                locator={"repo": "backend-microservice", "path": "app/main.py"},
            ),
            Evidence(
                id="ev_sql",
                profile_id="demo-candidate-82",
                source="github_repo",
                evidence_type="file",
                skill_hints=["SQL", "PostgreSQL"],
                reliability=0.88,
                depth=0.82,
                recency=0.90,
                authenticity=0.95,
                locator={"repo": "backend-microservice", "path": "alembic/001.py"},
            ),
            Evidence(
                id="ev_git",
                profile_id="demo-candidate-82",
                source="github_calendar",
                evidence_type="commit",
                skill_hints=["Git", "REST API"],
                reliability=0.94,
                depth=0.85,
                recency=1.0,
                authenticity=0.95,
                locator={"repo": "backend-microservice"},
            ),
            Evidence(
                id="ev_ml",
                profile_id="demo-candidate-82",
                source="github_repo",
                evidence_type="file",
                skill_hints=["Machine Learning", "PyTorch"],
                reliability=0.84,
                depth=0.80,
                recency=0.88,
                authenticity=0.90,
                locator={"repo": "ml-diagnostic-pipeline", "path": "train.py"},
            ),
            Evidence(
                id="ev_docker",
                profile_id="demo-candidate-82",
                source="github_repo",
                evidence_type="file",
                skill_hints=["Docker"],
                reliability=0.45,
                depth=0.40,
                recency=0.70,
                authenticity=0.85,
                locator={"repo": "backend-microservice", "path": "Dockerfile"},
            ),
        ]
    return evidence_items


# ── GET /job-fit/preset-jobs ──────────────────────────────────────────────────

@router.get("/preset-jobs")
async def get_preset_jobs():
    """Return all curated benchmark job descriptions."""
    return PRESET_JOBS


# ── POST /job-fit/analyze ─────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_job_fit(
    req: JobFitAnalyzeRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Analyze candidate evidence against a specified Job Description.
    """
    engine = JobFitEngine()
    profile_id = req.profile_id or "demo-candidate-82"

    profile = await session.get(Profile, profile_id)
    
    # Load score run and evidence
    stmt = (
        select(ScoreRun)
        .where(ScoreRun.profile_id == profile_id)
        .order_by(ScoreRun.created_at.desc())
        .limit(1)
    )
    res = await session.execute(stmt)
    score_run = res.scalar_one_or_none()

    ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    ev_res = await session.execute(ev_stmt)
    evidence_items = list(ev_res.scalars().all())
    evidence_items = _get_evidence_fallback(profile_id, evidence_items)

    # Parse JD
    jd_data = engine.parse_job_description(
        jd_text=req.jd_text,
        preset_id=req.preset_id,
        job_title=req.job_title,
        company=req.company,
    )

    # Evaluate
    result = engine.evaluate_job_fit(
        jd_data=jd_data,
        profile=profile,
        evidence_items=evidence_items,
        score_run=score_run,
    )

    return result


# ── POST /job-fit/whatif ──────────────────────────────────────────────────────

@router.post("/whatif")
async def simulate_job_fit_whatif(req: JobFitWhatIfRequest):
    """
    Simulate hypothetical evidence verification and compute projected Job Fit score.
    """
    engine = JobFitEngine()
    results = engine.simulate_whatif(req.base_job_fit, req.actions)
    return results


# ── POST /job-fit/compare ─────────────────────────────────────────────────────

@router.post("/compare")
async def compare_jobs(
    req: JobFitCompareRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Compare multiple jobs side-by-side for a candidate.
    """
    engine = JobFitEngine()
    profile_id = req.profile_id or "demo-candidate-82"

    profile = await session.get(Profile, profile_id)
    ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    ev_res = await session.execute(ev_stmt)
    evidence_items = list(ev_res.scalars().all())
    evidence_items = _get_evidence_fallback(profile_id, evidence_items)

    job_ids = req.job_ids if req.job_ids else ["jd-neuralflow-ai", "jd-cloudscale-swe", "jd-fintech-backend"]
    results = engine.compare_multiple_jobs(job_ids, profile, evidence_items)
    return results
