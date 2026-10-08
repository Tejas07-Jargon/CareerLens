from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import json
from datetime import datetime

from ...models.profile import Profile
from ...models.leetcode import (
    LeetCodeProfile, LeetCodeSyncRun, LeetCodeProblem, 
    LeetCodeSolvedProblem, LeetCodeSubmission, LeetCodeContest, LeetCodeSnapshot
)
from .capabilities import LeetCodeCapability
from .provider import Provider
from .import_provider import ImportProvider
from .scrape_provider import ScrapeProvider
from ...schemas.leetcode import ImportProviderPayload


class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_or_create_leetcode_profile(self, profile_id: str, username: str) -> LeetCodeProfile:
        result = await self.db.execute(select(LeetCodeProfile).where(LeetCodeProfile.profile_id == profile_id))
        lc_profile = result.scalars().first()
        
        if not lc_profile:
            lc_profile = LeetCodeProfile(profile_id=profile_id, username=username)
            self.db.add(lc_profile)
            await self.db.flush()
        elif lc_profile.username != username:
            lc_profile.username = username
            await self.db.flush()
            
        return lc_profile

    async def sync_via_import(self, profile_id: str, payload: ImportProviderPayload) -> LeetCodeSyncRun:
        """
        Orchestrate the sync using the ImportProvider.
        """
        provider = ImportProvider()
        
        from sqlalchemy.orm import load_only
        result = await self.db.execute(
            select(Profile)
            .options(load_only(Profile.id, Profile.display_name, Profile.leetcode_username, Profile.status))
            .where(Profile.id == profile_id)
        )
        user_profile = result.scalars().first()
        if not user_profile:
            raise ValueError(f"Profile {profile_id} not found")
            
        username = payload.profile.get("username", user_profile.leetcode_username or f"imported_{profile_id}")
        if not user_profile.leetcode_username:
            user_profile.leetcode_username = username
            
        lc_profile = await self._get_or_create_leetcode_profile(profile_id, username)
        
        # Log the start of the sync run
        sync_run = LeetCodeSyncRun(
            leetcode_profile_id=lc_profile.id,
            status="running",
            provider_name=provider.name,
            capabilities_used=[c.value for c in provider.get_capabilities()]
        )
        self.db.add(sync_run)
        await self.db.flush()
        
        try:
            # Sync Profile
            if provider.supports(LeetCodeCapability.PROFILE_STATS):
                prof_data = await provider.get_profile(username, payload)
                lc_profile.total_solved = prof_data.get("total_solved", 0)
                lc_profile.easy_solved = prof_data.get("easy_solved", 0)
                lc_profile.medium_solved = prof_data.get("medium_solved", 0)
                lc_profile.hard_solved = prof_data.get("hard_solved", 0)
                
                # Only overwrite acceptance rate if the provider explicitly returned a non-zero value,
                # otherwise preserve the previous value unless it's explicitly None in the payload
                # and we don't have previous data.
                new_acc = prof_data.get("acceptance_rate")
                if new_acc is not None and new_acc != 0.0:
                    lc_profile.acceptance_rate = new_acc
                elif new_acc is None and lc_profile.acceptance_rate == 0.0:
                    lc_profile.acceptance_rate = None
                
                lc_profile.global_ranking = prof_data.get("global_ranking")
                lc_profile.reputation = prof_data.get("reputation", 0)
                lc_profile.badges = prof_data.get("badges", [])
                
            # TODO: Add logic to sync submissions, problems, contests, and generate snapshot
            
            sync_run.status = "success"
            await self.db.commit()
            return sync_run
            
        except Exception as e:
            sync_run.status = "failed"
            sync_run.error_message = str(e)
            await self.db.commit()
            raise

    async def sync_via_scrape(self, profile_id: str, username: str) -> LeetCodeSyncRun:
        """
        Orchestrate the sync using the ScrapeProvider via GraphQL API.
        """
        provider = ScrapeProvider()
        
        from sqlalchemy.orm import load_only
        result = await self.db.execute(
            select(Profile)
            .options(load_only(Profile.id, Profile.display_name, Profile.leetcode_username, Profile.status))
            .where(Profile.id == profile_id)
        )
        user_profile = result.scalars().first()
        if not user_profile:
            raise ValueError(f"Profile {profile_id} not found")
            
        if not user_profile.leetcode_username:
            user_profile.leetcode_username = username
            
        lc_profile = await self._get_or_create_leetcode_profile(profile_id, username)
        
        # Log the start of the sync run
        sync_run = LeetCodeSyncRun(
            leetcode_profile_id=lc_profile.id,
            status="running",
            provider_name=provider.name,
            capabilities_used=[c.value for c in provider.get_capabilities()]
        )
        self.db.add(sync_run)
        await self.db.flush()
        
        try:
            # Sync Profile
            if provider.supports(LeetCodeCapability.PROFILE_STATS):
                prof_data = await provider.get_profile(username)
                lc_profile.total_solved = prof_data.get("total_solved", 0)
                lc_profile.easy_solved = prof_data.get("easy_solved", 0)
                lc_profile.medium_solved = prof_data.get("medium_solved", 0)
                lc_profile.hard_solved = prof_data.get("hard_solved", 0)
                
                new_acc = prof_data.get("acceptance_rate")
                if new_acc is not None and new_acc != 0.0:
                    lc_profile.acceptance_rate = new_acc
                elif new_acc is None and lc_profile.acceptance_rate == 0.0:
                    lc_profile.acceptance_rate = None
                    
                lc_profile.global_ranking = prof_data.get("global_ranking")
                lc_profile.reputation = prof_data.get("reputation", 0)
                
                lc_profile.aggregate_topics = prof_data.get("aggregate_topics", {})
                lc_profile.aggregate_languages = prof_data.get("aggregate_languages", {})
                
                cal = prof_data.get("submission_calendar", "{}")
                if isinstance(cal, str):
                    try:
                        cal = json.loads(cal)
                    except json.JSONDecodeError:
                        cal = {}
                lc_profile.aggregate_submissions = cal

                
                # Sync Contests
                contest_history = prof_data.get("contest_history", [])
                if contest_history:
                    # Clear old contests for this profile to replace with fresh sync
                    await self.db.execute(delete(LeetCodeContest).where(LeetCodeContest.leetcode_profile_id == lc_profile.id))
                    
                    for c in contest_history:
                        contest_data = c.get("contest", {})
                        timestamp_val = contest_data.get("startTime", 0)
                        
                        contest_record = LeetCodeContest(
                            leetcode_profile_id=lc_profile.id,
                            contest_name=contest_data.get("title", "Unknown Contest"),
                            rating=c.get("rating", 0.0),
                            global_rank=c.get("ranking", 0),
                            problems_solved=c.get("problemsSolved", 0),
                            total_problems=c.get("totalProblems", 0),
                            timestamp=datetime.fromtimestamp(timestamp_val)
                        )
                        self.db.add(contest_record)
                        
                # Sync Recent Submissions into actual database models so analytics work
                recent = prof_data.get("recent_submissions", [])
                if isinstance(lc_profile.aggregate_submissions, dict):
                    lc_profile.aggregate_submissions["recent"] = recent
                else:
                    lc_profile.aggregate_submissions = {"recent": recent}

                for sub in recent:
                    q_id_str = sub.get("titleSlug", "")
                    if not q_id_str:
                        continue
                    
                    q_id = sum(ord(c) * (i+1) * 31 for i, c in enumerate(q_id_str)) % 2147483647
                    
                    prob_res = await self.db.execute(select(LeetCodeProblem).where(LeetCodeProblem.question_id == q_id))
                    prob_obj = prob_res.scalars().first()
                    if not prob_obj:
                        prob_obj = LeetCodeProblem(
                            question_id=q_id,
                            title=sub.get("title", q_id_str),
                            title_slug=q_id_str,
                            difficulty="Medium"
                        )
                        self.db.add(prob_obj)
                        
                    if sub.get("statusDisplay") == "Accepted":
                        solved_res = await self.db.execute(
                            select(LeetCodeSolvedProblem)
                            .where(LeetCodeSolvedProblem.leetcode_profile_id == lc_profile.id)
                            .where(LeetCodeSolvedProblem.question_id == q_id)
                        )
                        solved_obj = solved_res.scalars().first()
                        sub_time = datetime.fromtimestamp(int(sub.get("timestamp", 0)))
                        if not solved_obj:
                            solved_obj = LeetCodeSolvedProblem(
                                leetcode_profile_id=lc_profile.id,
                                question_id=q_id,
                                status="Accepted",
                                recent_submission_time=sub_time
                            )
                            self.db.add(solved_obj)
                        else:
                            if sub_time > solved_obj.recent_submission_time:
                                solved_obj.recent_submission_time = sub_time
                                
                    sub_time = datetime.fromtimestamp(int(sub.get("timestamp", 0)))
                    sub_id_str = f"{q_id}_{int(sub.get('timestamp', 0))}"
                    sub_id = sum(ord(c) * (i+1) * 31 for i, c in enumerate(sub_id_str)) % 2147483647
                    exist_sub = await self.db.execute(
                        select(LeetCodeSubmission).where(LeetCodeSubmission.submission_id == sub_id)
                    )
                    if not exist_sub.scalars().first():
                        sub_obj = LeetCodeSubmission(
                            submission_id=sub_id,
                            leetcode_profile_id=lc_profile.id,
                            question_id=q_id,
                            lang=sub.get("lang", ""),
                            timestamp=sub_time,
                            status_display=sub.get("statusDisplay", "")
                        )
                        self.db.add(sub_obj)
                        
            # Scraper currently doesn't fetch full canonical history without auth.
            
            sync_run.status = "success"
            await self.db.commit()
            return sync_run
            
        except Exception as e:
            sync_run.status = "failed"
            sync_run.error_message = str(e)
            await self.db.commit()
            raise
