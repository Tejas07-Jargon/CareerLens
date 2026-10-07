"""
Resumes API routes.

Provides endpoints for evidence-aware resume generation, live editing,
JD optimization, ATS validation, AI content suggestions, and PDF export.
"""

from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_session
from app.models.profile import Profile
from app.models.score_run import ScoreRun
from app.models.evidence import Evidence
from app.models.resume import ResumeVersion
from app.services.resume.resume_generator import ResumeGenerator
from app.services.resume.resume_optimizer import ResumeOptimizer
from app.services.resume.ats_validator import ATSValidator
from app.services.resume.ai_suggester import AISuggester
from app.services.resume.pdf_exporter import ResumePDFExporter

router = APIRouter()


# ── Pydantic Request Schemas ───────────────────────────────────────────────────

class ResumeBuildRequest(BaseModel):
    target_role: Optional[str] = "Software Engineer"
    custom_jd_text: Optional[str] = None
    template_id: Optional[str] = "modern"
    title: Optional[str] = None


class ResumeUpdateRequest(BaseModel):
    title: Optional[str] = None
    target_role: Optional[str] = None
    target_jd_text: Optional[str] = None
    template_id: Optional[str] = None
    content: Dict[str, Any]


class AISuggestionRequest(BaseModel):
    section: str  # "summary" | "project_bullet"
    current_text: str
    target_role: Optional[str] = "Software Engineer"
    project_name: Optional[str] = ""
    technologies: Optional[List[str]] = []
    verified_skills: Optional[List[str]] = []


class VersionCompareRequest(BaseModel):
    version_id_a: str
    version_id_b: str


class PDFExportRequest(BaseModel):
    content: Dict[str, Any]
    template_id: Optional[str] = "modern"


# ── GET /resumes/sample/{role_name} ──────────────────────────────────────────

@router.get("/sample/{role_name}")
async def get_sample_resume(role_name: str):
    """
    Returns a verified sample resume benchmark for demo purposes.
    """
    generator = ResumeGenerator()
    optimizer = ResumeOptimizer()
    validator = ATSValidator()

    # Create a mock demo profile
    demo_profile = Profile(
        id="demo-candidate-82",
        display_name="Pushkar Kumar",
        github_username="demo-student",
        target_role=role_name,
    )
    
    initial_content = generator.generate_initial_resume(
        profile=demo_profile,
        target_role=role_name,
    )
    opt_result = optimizer.analyze(initial_content, target_role=role_name)
    val_result = validator.validate(initial_content, known_evidence_skills=["Python", "SQL", "FastAPI", "Git", "Docker"])

    return {
        "id": "sample-resume-demo",
        "profile_id": "demo-candidate-82",
        "title": f"{role_name} Resume (Benchmark)",
        "target_role": role_name,
        "template_id": "modern",
        "content": initial_content,
        "quality_score": opt_result["quality_score"],
        "jd_alignment_pct": opt_result["overall_alignment"],
        "evidence_coverage_pct": opt_result["evidence_backed_claims"],
        "version_num": 1,
        "optimization": opt_result,
        "validation": val_result,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


# ── POST /profiles/{profile_id}/resumes/generate ──────────────────────────────

@router.post("/profiles/{profile_id}/generate")
async def generate_profile_resume(
    profile_id: str,
    req: ResumeBuildRequest,
    session: AsyncSession = Depends(get_session),
):
    profile = await session.get(Profile, profile_id)
    if profile is None and profile_id != "demo-candidate-82":
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile is None:
        return await get_sample_resume(req.target_role or "Software Engineer")

    # Fetch latest score run
    stmt = (
        select(ScoreRun)
        .where(ScoreRun.profile_id == profile_id)
        .order_by(ScoreRun.created_at.desc())
        .limit(1)
    )
    res = await session.execute(stmt)
    score_run = res.scalar_one_or_none()

    # Fetch evidence items
    ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    ev_res = await session.execute(ev_stmt)
    evidence_items = ev_res.scalars().all()

    generator = ResumeGenerator()
    optimizer = ResumeOptimizer()
    validator = ATSValidator()

    chosen_role = req.target_role or profile.target_role or "Software Engineer"
    content = generator.generate_initial_resume(
        profile=profile,
        score_run=score_run,
        evidence_items=evidence_items,
        target_role=chosen_role,
    )

    opt_result = optimizer.analyze(content, target_role=chosen_role, custom_jd=req.custom_jd_text)
    known_skills = [s for ev in evidence_items for s in (ev.skill_hints or [])]
    val_result = validator.validate(content, known_evidence_skills=known_skills, target_role=chosen_role)

    # Get version count
    v_stmt = select(ResumeVersion).where(ResumeVersion.profile_id == profile_id)
    v_res = await session.execute(v_stmt)
    existing_resumes = v_res.scalars().all()
    version_num = len(existing_resumes) + 1

    resume_ver = ResumeVersion(
        id=str(uuid.uuid4()),
        profile_id=profile_id,
        title=req.title or f"{chosen_role} Resume v{version_num}",
        target_role=chosen_role,
        target_jd_text=req.custom_jd_text,
        template_id=req.template_id or "modern",
        content=content,
        quality_score=float(opt_result["quality_score"]),
        jd_alignment_pct=float(opt_result["overall_alignment"]),
        evidence_coverage_pct=float(opt_result["evidence_backed_claims"]),
        version_num=version_num,
    )
    session.add(resume_ver)
    await session.commit()
    await session.refresh(resume_ver)

    return {
        "id": resume_ver.id,
        "profile_id": resume_ver.profile_id,
        "title": resume_ver.title,
        "target_role": resume_ver.target_role,
        "target_jd_text": resume_ver.target_jd_text,
        "template_id": resume_ver.template_id,
        "content": resume_ver.content,
        "quality_score": resume_ver.quality_score,
        "jd_alignment_pct": resume_ver.jd_alignment_pct,
        "evidence_coverage_pct": resume_ver.evidence_coverage_pct,
        "version_num": resume_ver.version_num,
        "optimization": opt_result,
        "validation": val_result,
        "created_at": resume_ver.created_at.isoformat(),
        "updated_at": resume_ver.updated_at.isoformat(),
    }


# ── GET /profiles/{profile_id}/resumes ────────────────────────────────────────

@router.get("/profiles/{profile_id}/list")
async def list_profile_resumes(
    profile_id: str,
    session: AsyncSession = Depends(get_session),
):
    if profile_id == "demo-candidate-82":
        sample = await get_sample_resume("Software Engineer")
        return [sample]

    stmt = (
        select(ResumeVersion)
        .where(ResumeVersion.profile_id == profile_id)
        .order_by(ResumeVersion.updated_at.desc())
    )
    res = await session.execute(stmt)
    resumes = res.scalars().all()
    return resumes


# ── GET /resumes/{resume_id} ──────────────────────────────────────────────────

@router.get("/{resume_id}")
async def get_resume_version(
    resume_id: str,
    session: AsyncSession = Depends(get_session),
):
    if resume_id == "sample-resume-demo":
        return await get_sample_resume("Software Engineer")

    resume = await session.get(ResumeVersion, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume version not found")

    optimizer = ResumeOptimizer()
    validator = ATSValidator()
    
    # Fetch evidence for validation
    ev_stmt = select(Evidence).where(Evidence.profile_id == resume.profile_id)
    ev_res = await session.execute(ev_stmt)
    evidence_items = ev_res.scalars().all()
    known_skills = [s for ev in evidence_items for s in (ev.skill_hints or [])]

    opt_result = optimizer.analyze(resume.content, target_role=resume.target_role, custom_jd=resume.target_jd_text)
    val_result = validator.validate(resume.content, known_evidence_skills=known_skills, target_role=resume.target_role)

    return {
        "id": resume.id,
        "profile_id": resume.profile_id,
        "title": resume.title,
        "target_role": resume.target_role,
        "target_jd_text": resume.target_jd_text,
        "template_id": resume.template_id,
        "content": resume.content,
        "quality_score": resume.quality_score,
        "jd_alignment_pct": resume.jd_alignment_pct,
        "evidence_coverage_pct": resume.evidence_coverage_pct,
        "version_num": resume.version_num,
        "optimization": opt_result,
        "validation": val_result,
        "created_at": resume.created_at.isoformat(),
        "updated_at": resume.updated_at.isoformat(),
    }


# ── PUT /resumes/{resume_id} ──────────────────────────────────────────────────

@router.put("/{resume_id}")
async def update_resume_version(
    resume_id: str,
    req: ResumeUpdateRequest,
    session: AsyncSession = Depends(get_session),
):
    optimizer = ResumeOptimizer()
    validator = ATSValidator()

    if resume_id == "sample-resume-demo":
        target_role = req.target_role or "Software Engineer"
        opt_result = optimizer.analyze(req.content, target_role=target_role, custom_jd=req.target_jd_text)
        val_result = validator.validate(req.content, known_evidence_skills=["Python", "SQL", "FastAPI", "Git", "Docker"])
        return {
            "id": "sample-resume-demo",
            "profile_id": "demo-candidate-82",
            "title": req.title or f"{target_role} Resume (Benchmark)",
            "target_role": target_role,
            "target_jd_text": req.target_jd_text,
            "template_id": req.template_id or "modern",
            "content": req.content,
            "quality_score": opt_result["quality_score"],
            "jd_alignment_pct": opt_result["overall_alignment"],
            "evidence_coverage_pct": opt_result["evidence_backed_claims"],
            "version_num": 1,
            "optimization": opt_result,
            "validation": val_result,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    resume = await session.get(ResumeVersion, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume version not found")

    target_role = req.target_role or resume.target_role
    custom_jd = req.target_jd_text if req.target_jd_text is not None else resume.target_jd_text
    
    # Recalculate metrics
    opt_result = optimizer.analyze(req.content, target_role=target_role, custom_jd=custom_jd)
    
    ev_stmt = select(Evidence).where(Evidence.profile_id == resume.profile_id)
    ev_res = await session.execute(ev_stmt)
    evidence_items = ev_res.scalars().all()
    known_skills = [s for ev in evidence_items for s in (ev.skill_hints or [])]
    val_result = validator.validate(req.content, known_evidence_skills=known_skills, target_role=target_role)

    if req.title:
        resume.title = req.title
    resume.target_role = target_role
    resume.target_jd_text = custom_jd
    if req.template_id:
        resume.template_id = req.template_id
    resume.content = req.content
    resume.quality_score = float(opt_result["quality_score"])
    resume.jd_alignment_pct = float(opt_result["overall_alignment"])
    resume.evidence_coverage_pct = float(opt_result["evidence_backed_claims"])
    resume.updated_at = datetime.utcnow()

    await session.commit()
    await session.refresh(resume)

    return {
        "id": resume.id,
        "profile_id": resume.profile_id,
        "title": resume.title,
        "target_role": resume.target_role,
        "target_jd_text": resume.target_jd_text,
        "template_id": resume.template_id,
        "content": resume.content,
        "quality_score": resume.quality_score,
        "jd_alignment_pct": resume.jd_alignment_pct,
        "evidence_coverage_pct": resume.evidence_coverage_pct,
        "version_num": resume.version_num,
        "optimization": opt_result,
        "validation": val_result,
        "created_at": resume.created_at.isoformat(),
        "updated_at": resume.updated_at.isoformat(),
    }


# ── POST /resumes/{resume_id}/duplicate ───────────────────────────────────────

@router.post("/{resume_id}/duplicate")
async def duplicate_resume_version(
    resume_id: str,
    session: AsyncSession = Depends(get_session),
):
    if resume_id == "sample-resume-demo":
        sample = await get_sample_resume("Software Engineer")
        sample["id"] = str(uuid.uuid4())
        sample["version_num"] = 2
        sample["title"] = "Software Engineer Resume v2"
        return sample

    source = await session.get(ResumeVersion, resume_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source resume version not found")

    v_stmt = select(ResumeVersion).where(ResumeVersion.profile_id == source.profile_id)
    v_res = await session.execute(v_stmt)
    existing = v_res.scalars().all()
    new_version_num = len(existing) + 1

    new_resume = ResumeVersion(
        id=str(uuid.uuid4()),
        profile_id=source.profile_id,
        title=f"{source.target_role} Resume v{new_version_num}",
        target_role=source.target_role,
        target_jd_text=source.target_jd_text,
        template_id=source.template_id,
        content=dict(source.content),
        quality_score=source.quality_score,
        jd_alignment_pct=source.jd_alignment_pct,
        evidence_coverage_pct=source.evidence_coverage_pct,
        version_num=new_version_num,
    )
    session.add(new_resume)
    await session.commit()
    await session.refresh(new_resume)

    return new_resume


# ── POST /resumes/compare ─────────────────────────────────────────────────────

@router.post("/compare")
async def compare_resume_versions(
    req: VersionCompareRequest,
    session: AsyncSession = Depends(get_session),
):
    res_a = await session.get(ResumeVersion, req.version_id_a)
    res_b = await session.get(ResumeVersion, req.version_id_b)
    
    # Handle sample mock fallback
    if not res_a or not res_b:
        return {
            "v_a": {"version_num": 1, "quality_score": 82, "jd_alignment": 78, "evidence_coverage": 81},
            "v_b": {"version_num": 2, "quality_score": 88, "jd_alignment": 86, "evidence_coverage": 94},
            "deltas": {
                "quality_score_diff": 6.0,
                "jd_alignment_diff": 8.0,
                "evidence_coverage_diff": 13.0,
            },
            "improvements": [
                "Added Docker multi-stage containerization with verification locator",
                "Refined Machine Learning pipeline project description with quantified metric impact",
                "Enhanced professional summary targeting Software Engineer",
            ],
        }

    return {
        "v_a": {
            "id": res_a.id,
            "title": res_a.title,
            "version_num": res_a.version_num,
            "quality_score": res_a.quality_score,
            "jd_alignment": res_a.jd_alignment_pct,
            "evidence_coverage": res_a.evidence_coverage_pct,
        },
        "v_b": {
            "id": res_b.id,
            "title": res_b.title,
            "version_num": res_b.version_num,
            "quality_score": res_b.quality_score,
            "jd_alignment": res_b.jd_alignment_pct,
            "evidence_coverage": res_b.evidence_coverage_pct,
        },
        "deltas": {
            "quality_score_diff": round(res_b.quality_score - res_a.quality_score, 1),
            "jd_alignment_diff": round(res_b.jd_alignment_pct - res_a.jd_alignment_pct, 1),
            "evidence_coverage_diff": round(res_b.evidence_coverage_pct - res_a.evidence_coverage_pct, 1),
        },
    }


# ── POST /resumes/suggest ─────────────────────────────────────────────────────

@router.post("/suggest")
async def generate_ai_suggestion(req: AISuggestionRequest):
    suggester = AISuggester()
    if req.section == "summary":
        return suggester.suggest_summary(
            current_text=req.current_text,
            target_role=req.target_role or "Software Engineer",
            verified_skills=req.verified_skills or ["Python", "SQL", "FastAPI"],
        )
    else:
        return suggester.suggest_project_bullet(
            current_bullet=req.current_text,
            project_name=req.project_name or "Technical Project",
            technologies=req.technologies or ["Python", "FastAPI"],
        )


# ── POST /resumes/export-pdf ──────────────────────────────────────────────────

@router.post("/export-pdf")
async def export_pdf_direct(req: PDFExportRequest):
    exporter = ResumePDFExporter()
    pdf_bytes = exporter.generate_pdf(content=req.content, template_id=req.template_id or "modern")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=CareerLens_Resume.pdf"},
    )


# ── DELETE /resumes/{resume_id} ───────────────────────────────────────────────

@router.delete("/{resume_id}", status_code=204)
async def delete_resume_version(
    resume_id: str,
    session: AsyncSession = Depends(get_session),
):
    if resume_id != "sample-resume-demo":
        resume = await session.get(ResumeVersion, resume_id)
        if resume:
            await session.delete(resume)
            await session.commit()
    return None
