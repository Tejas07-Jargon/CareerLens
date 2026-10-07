"""
Profiles API routes.

POST   /profiles              Create a profile and trigger analysis
GET    /profiles/{id}/stream  Progress via Server-Sent Events
GET    /profiles/{id}/report  Fetch the latest ScoreRun
POST   /profiles/{id}/whatif  Run what-if simulation
DELETE /profiles/{id}         Delete all data (DPDP Act right to erasure)
"""

import asyncio
import json
from typing import AsyncIterator, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_session
from app.models.profile import Profile
from app.models.consent import Consent
from app.models.score_run import ScoreRun
from app.models.audit_log import AuditLog
from app.models.dynamic_profile import SkillProfile, QuizAttempt, Recommendation, SkillTopic

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProfileCreateForm(BaseModel):
    github_username: Optional[str] = None
    portfolio_url: Optional[str] = None
    design_portfolio_url: Optional[str] = None
    target_role: Optional[str] = None
    interests: Optional[str] = None
    weekly_hours_available: Optional[int] = None
    agreed_to_analysis: bool
    agreed_to_cohort_sharing: bool = False
    cohort_id: Optional[str] = None


class WhatIfRequest(BaseModel):
    actions: list  # [{description, skill_hints, strength, source}]


# ── POST /profiles ────────────────────────────────────────────────────────────

@router.post("/", status_code=202)
async def create_profile(
    request: Request,
    full_name: Optional[str] = Form(None),
    github_username: Optional[str] = Form(None),
    portfolio_url: Optional[str] = Form(None),
    design_portfolio_url: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None),
    interests: Optional[str] = Form(None),
    weekly_hours_available: Optional[int] = Form(None),
    agreed_to_analysis: bool = Form(...),
    agreed_to_cohort_sharing: bool = Form(False),
    cohort_id: Optional[str] = Form(None),
    resume_file: Optional[UploadFile] = File(None),
    linkedin_pdf: Optional[UploadFile] = File(None),
    design_portfolio_file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
):
    if not agreed_to_analysis:
        raise HTTPException(status_code=422, detail="Consent to analysis is required.")

    import uuid
    from pathlib import Path
    profile_id = str(uuid.uuid4())

    # Save uploaded files
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)

    resume_filename = None
    if resume_file:
        resume_filename = f"{profile_id}_resume{Path(resume_file.filename).suffix}"
        (upload_dir / resume_filename).write_bytes(await resume_file.read())

    linkedin_pdf_filename = None
    if linkedin_pdf:
        linkedin_pdf_filename = f"{profile_id}_linkedin.pdf"
        (upload_dir / linkedin_pdf_filename).write_bytes(await linkedin_pdf.read())

    design_filename = None
    if design_portfolio_file:
        design_filename = f"{profile_id}_portfolio{Path(design_portfolio_file.filename).suffix}"
        (upload_dir / design_filename).write_bytes(await design_portfolio_file.read())

    # Create profile
    profile = Profile(
        id=profile_id,
        display_name=full_name,
        github_username=github_username,
        portfolio_url=portfolio_url,
        design_portfolio_url=design_portfolio_url,
        design_portfolio_filename=design_filename,
        target_role=target_role,
        interests=interests,
        weekly_hours_available=weekly_hours_available,
        cohort_id=cohort_id,
        resume_filename=resume_filename,
        linkedin_pdf_filename=linkedin_pdf_filename,
        status="pending",
    )
    session.add(profile)

    # Record consent
    consent = Consent(
        profile_id=profile_id,
        agreed_to_analysis=agreed_to_analysis,
        agreed_to_cohort_sharing=agreed_to_cohort_sharing,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(consent)

    # Audit log
    session.add(AuditLog(
        profile_id=profile_id,
        actor="student",
        action="profile.create",
        ip_address=request.client.host if request.client else None,
    ))

    await session.commit()

    # Trigger analysis — try Celery/Redis first, fall back instantly to local asyncio
    _celery_dispatched = False
    try:
        # Quick Redis liveness check (0.5 s timeout) before handing off to Celery.
        # Without this, Celery retries for 20+ seconds and the profile stays "pending".
        import redis as _redis
        from app.core.config import settings as _s
        _r = _redis.from_url(_s.REDIS_URL, socket_connect_timeout=0.5, socket_timeout=0.5)
        _r.ping()  # raises if Redis is down

        from app.workers.analysis_tasks import run_fast_analysis
        task = run_fast_analysis.delay(profile_id)
        profile.celery_task_id = task.id
        await session.commit()
        _celery_dispatched = True
    except Exception:
        pass  # Redis not available — fall through to local execution

    if not _celery_dispatched:
        # Fallback: run analysis in-process as an asyncio background task
        from app.services.analysis_orchestrator import AnalysisOrchestrator
        async def run_full_fallback(pid: str):
            orchestrator = AnalysisOrchestrator()
            await orchestrator.run_fast_analysis(pid)
            await orchestrator.run_deep_analysis(pid)
            
        asyncio.create_task(run_full_fallback(profile_id))

    return {"profile_id": profile_id, "status": "pending"}


# ── GET /profiles ─────────────────────────────────────────────────────────────

@router.get("/")
async def list_profiles(session: AsyncSession = Depends(get_session)):
    # Fetch all registered profiles and their readiness
    stmt = select(Profile).order_by(Profile.created_at.desc())
    result = await session.execute(stmt)
    profiles = result.scalars().all()
    
    # Format for the batch tab
    batch_data = []
    for p in profiles:
        # Determine status based on score
        score = p.overall_readiness_score or 0
        if score >= 80:
            status = "Ready"
        elif score >= 65:
            status = "Near-Ready"
        elif score >= 50:
            status = "Developing"
        else:
            status = "Needs Work"
            
        color = "var(--green)" if status == "Ready" else "var(--blue)" if status == "Near-Ready" else "var(--orange)" if status == "Developing" else "var(--pink)"
            
        batch_data.append({
            "id": p.id,
            "name": p.display_name or p.github_username or "Unknown Candidate",
            "role": p.target_role or "Unspecified",
            "score": round(score),
            "status": status,
            "gaps": [],  # We can pull weakest_skills if needed, but keeping it empty for now or populate a few
            "color": color
        })
        
    return batch_data

# ── GET /profiles ─────────────────────────────────────────────────────────────

@router.get("/")
async def get_all_profiles(session: AsyncSession = Depends(get_session)):
    stmt = select(Profile).order_by(Profile.created_at.desc())
    result = await session.execute(stmt)
    profiles = result.scalars().all()
    
    data = []
    for p in profiles:
        score = p.overall_readiness_score or 0
        if score >= 80:
            status = "Ready"
            color = "var(--green)"
        elif score >= 65:
            status = "Near-Ready"
            color = "var(--blue)"
        elif score >= 50:
            status = "Developing"
            color = "var(--orange)"
        else:
            status = "Needs Work"
            color = "var(--pink)"
            
        data.append({
            "id": p.id,
            "name": p.display_name or p.github_username or "Unknown Candidate",
            "role": p.target_role or "Unspecified",
            "score": round(score),
            "status": status,
            "gaps": [],
            "color": color
        })
    return data

# ── GET /profiles ─────────────────────────────────────────────────────────────

@router.get("/")
async def get_all_profiles(session: AsyncSession = Depends(get_session)):
    stmt = select(Profile).order_by(Profile.created_at.desc())
    result = await session.execute(stmt)
    profiles = result.scalars().all()
    
    data = []
    for p in profiles:
        score = p.overall_readiness_score or 0
        if score >= 80:
            status = "Ready"
            color = "var(--green)"
        elif score >= 65:
            status = "Near-Ready"
            color = "var(--blue)"
        elif score >= 50:
            status = "Developing"
            color = "var(--orange)"
        else:
            status = "Needs Work"
            color = "var(--pink)"
            
        data.append({
            "id": p.id,
            "name": p.display_name or p.github_username or "Unknown Candidate",
            "role": p.target_role or "Unspecified",
            "score": round(score),
            "status": status,
            "gaps": [],
            "color": color
        })
    return data

# ── GET /profiles/{id}/stream ─────────────────────────────────────────────────

@router.get("/{profile_id}/stream")
async def stream_progress(
    profile_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Server-Sent Events stream of analysis progress."""

    async def event_generator() -> AsyncIterator[str]:
        last_status = None
        for _ in range(120):  # poll up to 2 minutes
            profile = await session.get(Profile, profile_id)
            if profile is None:
                yield f"data: {json.dumps({'error': 'Profile not found'})}\n\n"
                return
            
            # Refresh to ensure we get the latest status updated by background tasks
            await session.refresh(profile)

            if profile.status != last_status:
                last_status = profile.status
                payload = {"status": profile.status}

                # Once fast pass is done, include the latest score
                if profile.status in {"fast_pass_complete", "complete"}:
                    stmt = (
                        select(ScoreRun)
                        .where(ScoreRun.profile_id == profile_id)
                        .order_by(ScoreRun.created_at.desc())
                        .limit(1)
                    )
                    result = await session.execute(stmt)
                    score_run = result.scalar_one_or_none()
                    if score_run:
                        payload["score"] = {
                            "mid": score_run.score_mid,
                            "lo": score_run.score_lo,
                            "hi": score_run.score_hi,
                        }

                yield f"data: {json.dumps(payload)}\n\n"

            if profile.status in {"complete", "error"}:
                yield "event: done\ndata: {}\n\n"
                return

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── GET /profiles/search ──────────────────────────────────────────────────────

@router.get("/search")
async def search_profile(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Profile).where(Profile.github_username == username)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Candidate doesn't exist")
        
    return {"profile_id": profile.id}


# ── GET /profiles/search ──────────────────────────────────────────────────────

@router.get("/search")
async def search_profile(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Profile).where(Profile.github_username == username)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Candidate doesn't exist")
        
    return {"profile_id": profile.id}


# ── GET /profiles/search ──────────────────────────────────────────────────────

@router.get("/search")
async def search_profile(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Profile).where(Profile.github_username == username)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Candidate doesn't exist")
        
    return {"profile_id": profile.id}


# ── GET /profiles/search ──────────────────────────────────────────────────────

@router.get("/search")
async def search_profile(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    stmt = select(Profile).where(Profile.github_username == username)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Candidate doesn't exist")
        
    return {"profile_id": profile.id}


# ── GET /profiles/{id}/report ─────────────────────────────────────────────────

@router.get("/{profile_id}/report")
async def get_report(
    profile_id: str,
    session: AsyncSession = Depends(get_session),
):
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    stmt = (
        select(ScoreRun)
        .where(ScoreRun.profile_id == profile_id)
        .order_by(ScoreRun.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    score_run = result.scalar_one_or_none()

    if score_run is None:
        raise HTTPException(status_code=404, detail="Analysis not yet complete")

    return {
        "profile_id": profile_id,
        "status": profile.status,
        "security_flags": profile.security_flags,
        "score": {
            "mid": score_run.score_mid,
            "lo": score_run.score_lo,
            "hi": score_run.score_hi,
        },
        "components": score_run.components,
        "credibility": score_run.credibility,
        "claim_statuses": score_run.claim_statuses,
        "role_fits": score_run.role_fits,
        "gaps": score_run.gaps,
        "roadmap": score_run.roadmap,
    }


# ── POST /profiles/{id}/whatif ────────────────────────────────────────────────

@router.post("/{profile_id}/whatif")
async def whatif(
    profile_id: str,
    body: WhatIfRequest,
    session: AsyncSession = Depends(get_session),
):
    from sqlalchemy.orm import selectinload
    from app.models.ownership import RepoAttribution
    from app.models.evidence import Evidence
    from app.services.scoring.scorer import (
        ScoreInput, EvidenceItem, RoleWeights, compute_score, apply_ownership_to_evidence_items
    )
    from app.services.scoring.whatif_simulator import WhatIfSimulator, WhatIfAction

    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Load latest score run for base result
    stmt = (
        select(ScoreRun)
        .where(ScoreRun.profile_id == profile_id)
        .order_by(ScoreRun.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    score_run = result.scalar_one_or_none()
    if score_run is None:
        raise HTTPException(status_code=404, detail="No score run found")

    # Load evidence
    ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    ev_result = await session.execute(ev_stmt)
    db_evidence = ev_result.scalars().all()

    # Load attributions
    attr_stmt = (
        select(RepoAttribution)
        .where(RepoAttribution.profile_id == profile_id)
        .options(selectinload(RepoAttribution.skill_ownerships))
    )
    attr_result = await session.execute(attr_stmt)
    attributions = attr_result.scalars().all()

    ev_items = [
        EvidenceItem(
            id=ev.id,
            skill_hints=ev.skill_hints,
            strength=ev.strength,
            source=ev.source,
            locator=ev.locator,
        )
        for ev in db_evidence
    ]
    ev_items = apply_ownership_to_evidence_items(ev_items, attributions)

    role_weights = RoleWeights(
        role_name=score_run.role,
        skill_weights={},
        proof_thresholds={},
    )

    claim_skills = [
        cs["skill"]
        for cs in score_run.claim_statuses
        if cs.get("skill")
    ]

    base_input = ScoreInput(
        evidence_items=ev_items,
        claim_skills=claim_skills,
        role_weights=role_weights,
        supplied_sources=[],
    )
    base_result = compute_score(base_input)

    from app.services.scoring.whatif_simulator import WhatIfSimulator, WhatIfAction
    simulator = WhatIfSimulator(base_input=base_input, base_result=base_result)

    actions = [
        WhatIfAction(
            description=a["description"],
            skill_hints=a.get("skill_hints", []),
            strength=float(a.get("strength", 0.7)),
            source=a.get("source", "github_repo"),
        )
        for a in body.actions
    ]

    results = simulator.simulate(actions)
    return [
        {
            "action": r.action_description,
            "before_mid": r.before_mid,
            "after_mid": r.after_mid,
            "delta": r.delta,
            "before_range": [r.before_lo, r.before_hi],
            "after_range": [r.after_lo, r.after_hi],
        }
        for r in results
    ]


# ── DELETE /profiles/{id} ─────────────────────────────────────────────────────

@router.delete("/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """DPDP Act right to erasure — deletes all data for this profile."""
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Audit before deleting
    session.add(AuditLog(
        profile_id=profile_id,
        actor="student",
        action="profile.delete",
        ip_address=request.client.host if request.client else None,
    ))

    # Delete uploaded files
    from pathlib import Path
    for filename in [
        profile.resume_filename,
        profile.linkedin_pdf_filename,
    ]:
        if filename:
            p = Path("uploads") / filename
            if p.exists():
                p.unlink()

    await session.delete(profile)
    await session.commit()


# ── GET /profiles/{id}/dashboard ──────────────────────────────────────────────

@router.get("/{profile_id}/dashboard")
async def get_dashboard(
    profile_id: str,
    session: AsyncSession = Depends(get_session)
):
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get Skills
    skills_stmt = select(SkillProfile).where(SkillProfile.profile_id == profile_id)
    skills_res = await session.execute(skills_stmt)
    skills_db = skills_res.scalars().all()
    
    # Sort skills by mastery
    sorted_skills = sorted(skills_db, key=lambda s: s.mastery_score, reverse=True)
    
    # Recommendations
    recs_stmt = select(Recommendation).where(Recommendation.profile_id == profile_id, Recommendation.status == "active")
    recs_res = await session.execute(recs_stmt)
    recommendations = [{"title": r.title, "description": r.description, "type": r.type} for r in recs_res.scalars().all()]
    
    # Evidence score fallback
    evidence_score = 0
    # You can fetch from evidence_confidence if you have that service integrated here
    
    # Formulate response
    return {
        "student": {
            "name": profile.display_name or "Guest Candidate",
            "target_role": profile.target_role or "Software Engineer"
        },
        "job_offer": {
            "company": profile.job_offer_company,
            "offered_at": profile.job_offer_at.isoformat() if profile.job_offer_at else None
        },
        "readiness": {
            "score": round(profile.overall_readiness_score or 0.0, 1),
            "change": 0, # Could be calculated from snapshots
            "trend": "up" if (profile.overall_readiness_score or 0) > 50 else "stable"
        },
        "evidence_confidence": evidence_score,
        "quiz_stats": {
            "total_quizzes": profile.total_quizzes,
            "average_score": round(profile.quiz_average or 0.0, 1),
            "current_streak": profile.quiz_streak
        },
        "strongest_skills": [
            {"name": s.skill_name, "score": round(s.mastery_score, 1), "trend": s.trend}
            for s in sorted_skills[:3]
        ],
        "weakest_skills": [
            {"name": s.skill_name, "score": round(s.mastery_score, 1), "trend": s.trend}
            for s in sorted_skills[-3:] if s.mastery_score > 0
        ],
        "recommendations": recommendations
    }


class JobOfferRequest(BaseModel):
    company_name: str

@router.post("/{profile_id}/offer")
async def make_job_offer(
    profile_id: str,
    body: JobOfferRequest,
    session: AsyncSession = Depends(get_session)
):
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.job_offer_company = body.company_name
    from datetime import datetime
    profile.job_offer_at = datetime.utcnow()
    await session.commit()
    return {"status": "success", "message": f"Job offered by {body.company_name}"}

# ── GET /profiles/{id}/roadmap ────────────────────────────────────────────────

@router.get("/{profile_id}/roadmap")
async def get_profile_roadmap(
    profile_id: str,
    target_role: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    from app.models.evidence import Evidence
    from app.services.roadmap.roadmap_engine import PersonalizedRoadmapEngine

    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Load latest score run for claim statuses
    stmt = (
        select(ScoreRun)
        .where(ScoreRun.profile_id == profile_id)
        .order_by(ScoreRun.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    score_run = result.scalar_one_or_none()

    claim_statuses = score_run.claim_statuses if score_run else []

    # Load evidence
    ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    ev_result = await session.execute(ev_stmt)
    db_evidence = ev_result.scalars().all()

    chosen_role = target_role or profile.target_role or "Software Engineer"
    engine = PersonalizedRoadmapEngine()
    roadmap_data = engine.generate_personalized_roadmap(
        target_role=chosen_role,
        claim_statuses=claim_statuses,
        evidence_items=db_evidence,
        security_flags=profile.security_flags or [],
    )
    roadmap_data["is_user_selected"] = bool(target_role is not None)
    return roadmap_data


# ── GET /profiles/{id}/roadmap/next ───────────────────────────────────────────

@router.get("/{profile_id}/roadmap/next")
async def get_next_milestone(
    profile_id: str,
    target_role: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    roadmap_data = await get_profile_roadmap(profile_id, target_role=target_role, session=session)
    next_m = roadmap_data.get("next_milestone")
    if next_m is None:
        raise HTTPException(status_code=404, detail="No remaining milestones found")
    return next_m


# ── GET /profiles/{id}/roadmap/milestones/{milestone_id} ──────────────────────

@router.get("/{profile_id}/roadmap/milestones/{milestone_id}")
async def get_milestone_detail(
    profile_id: str,
    milestone_id: str,
    target_role: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    roadmap_data = await get_profile_roadmap(profile_id, target_role=target_role, session=session)
    for m in roadmap_data.get("milestones", []):
        if m["id"] == milestone_id:
            return m
    raise HTTPException(status_code=404, detail="Milestone not found")


# ── GET /profiles/sample-roadmap/{role_name} ─────────────────────────────────

@router.get("/sample-roadmap/{role_name}")
async def get_sample_roadmap(
    role_name: str,
):
    from app.services.roadmap.roadmap_engine import PersonalizedRoadmapEngine
    engine = PersonalizedRoadmapEngine()
    return engine.generate_personalized_roadmap(
        target_role=role_name,
        claim_statuses=[],
        evidence_items=[],
        security_flags=[],
    )


