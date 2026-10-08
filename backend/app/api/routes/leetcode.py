from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any

from app.core.database import get_session
from app.services.leetcode.sync_service import SyncService
from app.schemas.leetcode import ImportProviderPayload, LeetCodeSyncRunResponse, LeetCodeProfileResponse
from app.models.leetcode import (
    LeetCodeProfile, LeetCodeSubmission, 
    LeetCodeProblem, LeetCodeSolvedProblem, LeetCodeProblemTopic
)

router = APIRouter()

@router.post("/{profile_id}/leetcode/import", response_model=LeetCodeSyncRunResponse)
async def import_leetcode_data(
    profile_id: str,
    payload: ImportProviderPayload,
    db: AsyncSession = Depends(get_session)
):
    """
    Import LeetCode data via user-provided JSON.
    """
    service = SyncService(db)
    try:
        run = await service.sync_via_import(profile_id, payload)
        return run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
class ScrapePayload(BaseModel):
    username: str

@router.post("/{profile_id}/leetcode/scrape", response_model=LeetCodeSyncRunResponse)
async def scrape_leetcode_data(
    profile_id: str,
    payload: ScrapePayload,
    db: AsyncSession = Depends(get_session)
):
    """
    Scrape LeetCode data from public GraphQL endpoints.
    """
    service = SyncService(db)
    try:
        run = await service.sync_via_scrape(profile_id, payload.username)
        return run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{profile_id}/leetcode", response_model=LeetCodeProfileResponse)
async def get_leetcode_profile(
    profile_id: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Get the synchronized LeetCode profile for the user.
    """
    result = await db.execute(select(LeetCodeProfile).where(LeetCodeProfile.profile_id == profile_id))
    profile = result.scalars().first()
    
    if not profile:
        raise HTTPException(
            status_code=404, 
            detail="LeetCode profile not found. Please sync or import data first."
        )
        
    return profile

from app.services.leetcode.analytics import AnalyticsService

@router.get("/{profile_id}/leetcode/analytics")
async def get_leetcode_analytics(
    profile_id: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Return deterministic analytics computed from the stored source data.
    """
    # Verify profile exists
    result = await db.execute(select(LeetCodeProfile).where(LeetCodeProfile.profile_id == profile_id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No LeetCode profile found")
        
    service = AnalyticsService(db)
    return await service.get_analytics(profile_id)

@router.get("/{profile_id}/leetcode/problems")
async def get_leetcode_problems(
    profile_id: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Get canonical solved problems for the Question Explorer.
    """
    result = await db.execute(select(LeetCodeProfile).where(LeetCodeProfile.profile_id == profile_id))
    profile = result.scalars().first()
    if not profile:
        return []
        
    query = (
        select(
            LeetCodeProblem.question_id,
            LeetCodeProblem.title,
            LeetCodeProblem.difficulty,
            LeetCodeSolvedProblem.status,
            LeetCodeSolvedProblem.recent_submission_time
        )
        .join(LeetCodeSolvedProblem, LeetCodeSolvedProblem.question_id == LeetCodeProblem.question_id)
        .where(LeetCodeSolvedProblem.leetcode_profile_id == profile.id)
    )
    res = await db.execute(query)
    
    problems = []
    for row in res:
        # Also fetch topics
        topic_res = await db.execute(
            select(LeetCodeProblemTopic.topic_name)
            .where(LeetCodeProblemTopic.question_id == row.question_id)
        )
        topics = [t for t in topic_res.scalars().all()]
        
        problems.append({
            "question_id": row.question_id,
            "title": row.title,
            "difficulty": row.difficulty,
            "status": row.status,
            "last_accepted": row.recent_submission_time,
            "topics": topics
        })
        
    if not problems and hasattr(profile, 'aggregate_submissions') and isinstance(profile.aggregate_submissions, dict):
        recent = profile.aggregate_submissions.get('recent', [])
        for i, sub in enumerate(recent):
            problems.append({
                "question_id": i + 1,
                "title": sub.get('title', 'Unknown'),
                "difficulty": 'Unknown',
                "status": sub.get('statusDisplay', 'Unknown'),
                "last_accepted": None, # sub has timestamp but format varies
                "topics": []
            })
            
    return problems
