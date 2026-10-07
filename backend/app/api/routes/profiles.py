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
    # Multipart form: JSON fields + file uploads
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
        github_username=github_username,
        portfolio_url=portfolio_url,
        design_portfolio_url=design_portfolio_url,
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

    # Trigger analysis
    from app.workers.analysis_tasks import run_fast_analysis
    task = run_fast_analysis.delay(profile_id)

    # Store task ID
    profile.celery_task_id = task.id
    await session.commit()

    return {"profile_id": profile_id, "status": "pending"}


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
    from app.models.evidence import Evidence
    from app.services.scoring.scorer import (
        ScoreInput, EvidenceItem, RoleWeights, compute_score
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
