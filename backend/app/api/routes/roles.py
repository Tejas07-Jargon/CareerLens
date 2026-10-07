"""Roles API – list available role profiles and their skill weights."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.role_profile import RoleProfile

router = APIRouter()


@router.get("/")
async def list_roles(session: AsyncSession = Depends(get_session)):
    """Return all role profiles with their skill counts and JD sample sizes."""
    result = await session.execute(select(RoleProfile))
    roles = result.scalars().all()
    return [
        {
            "role_name": r.role_name,
            "role_track": r.role_track,
            "jd_sample_size": r.jd_sample_size,
            "top_skills": sorted(r.skill_weights, key=r.skill_weights.get, reverse=True)[:10],
        }
        for r in roles
    ]


@router.get("/{role_name}")
async def get_role(role_name: str, session: AsyncSession = Depends(get_session)):
    """Return full skill weights for a specific role."""
    from fastapi import HTTPException
    result = await session.execute(
        select(RoleProfile).where(RoleProfile.role_name == role_name)
    )
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return {
        "role_name": role.role_name,
        "role_track": role.role_track,
        "jd_sample_size": role.jd_sample_size,
        "skill_weights": role.skill_weights,
        "proof_thresholds": role.proof_thresholds,
        "sample_titles": role.sample_titles,
    }
