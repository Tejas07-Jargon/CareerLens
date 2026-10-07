from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Dict, Any, List

from ...models.leetcode import (
    LeetCodeProfile, LeetCodeSolvedProblem, LeetCodeSubmission, 
    LeetCodeProblem, LeetCodeProblemTopic, LeetCodeContest
)
import datetime


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_analytics(self, profile_id: str) -> Dict[str, Any]:
        result = await self.db.execute(
            select(LeetCodeProfile).where(LeetCodeProfile.profile_id == profile_id)
        )
        lc_profile = result.scalars().first()
        
        if not lc_profile:
            return {
                "topics": [],
                "submissions_timeline": [],
                "languages": [],
                "topic_difficulty_heatmap": [],
                "capabilities": {
                    "submissions": False,
                    "topics": False,
                    "languages": False
                }
            }
            
        # Check if we have submission data
        sub_count_result = await self.db.execute(
            select(func.count(LeetCodeSubmission.submission_id))
            .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
        )
        has_submissions = sub_count_result.scalar() > 0

        # Check if we have question-level solved data
        solved_count_result = await self.db.execute(
            select(func.count(LeetCodeSolvedProblem.id))
            .where(LeetCodeSolvedProblem.leetcode_profile_id == lc_profile.id)
        )
        has_solved_data = solved_count_result.scalar() > 0

        topics = []
        topic_difficulty = []
        if has_solved_data:
            # Topic counts based on solved problems
            topic_query = (
                select(
                    LeetCodeProblemTopic.topic_name,
                    func.count(LeetCodeSolvedProblem.id).label("solved")
                )
                .join(LeetCodeProblem, LeetCodeSolvedProblem.question_id == LeetCodeProblem.question_id)
                .join(LeetCodeProblemTopic, LeetCodeProblem.question_id == LeetCodeProblemTopic.question_id)
                .where(LeetCodeSolvedProblem.leetcode_profile_id == lc_profile.id)
                .group_by(LeetCodeProblemTopic.topic_name)
                .order_by(func.count(LeetCodeSolvedProblem.id).desc())
            )
            topic_res = await self.db.execute(topic_query)
            topics = [{"topic": row.topic_name, "solved": row.solved} for row in topic_res]

            # Topic x Difficulty
            td_query = (
                select(
                    LeetCodeProblemTopic.topic_name,
                    LeetCodeProblem.difficulty,
                    func.count(LeetCodeSolvedProblem.id).label("count")
                )
                .join(LeetCodeProblem, LeetCodeSolvedProblem.question_id == LeetCodeProblem.question_id)
                .join(LeetCodeProblemTopic, LeetCodeProblem.question_id == LeetCodeProblemTopic.question_id)
                .where(LeetCodeSolvedProblem.leetcode_profile_id == lc_profile.id)
                .group_by(LeetCodeProblemTopic.topic_name, LeetCodeProblem.difficulty)
            )
            td_res = await self.db.execute(td_query)
            for row in td_res:
                topic_difficulty.append({
                    "topic": row.topic_name,
                    "difficulty": row.difficulty,
                    "count": row.count
                })

        languages = []
        submissions_timeline = []
        if has_submissions:
            # Language breakdown
            lang_query = (
                select(
                    LeetCodeSubmission.lang,
                    func.count(func.distinct(LeetCodeSubmission.question_id)).label("unique_solved")
                )
                .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
                .where(LeetCodeSubmission.status_display == "Accepted")
                .group_by(LeetCodeSubmission.lang)
            )
            lang_res = await self.db.execute(lang_query)
            languages = [{"lang": row.lang, "unique_solved": row.unique_solved} for row in lang_res]
            
            # Submissions over time (monthly) - SQLite friendly syntax for strftime
            time_query = (
                select(
                    func.strftime('%Y-%m', LeetCodeSubmission.timestamp).label('month'),
                    func.count(LeetCodeSubmission.submission_id).label('count')
                )
                .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
                .group_by(func.strftime('%Y-%m', LeetCodeSubmission.timestamp))
                .order_by(func.strftime('%Y-%m', LeetCodeSubmission.timestamp))
            )
            time_res = await self.db.execute(time_query)
            submissions_timeline = [{"month": row.month, "count": row.count} for row in time_res]

        has_aggregate_topics = bool(getattr(lc_profile, 'aggregate_topics', None))
        has_aggregate_languages = bool(getattr(lc_profile, 'aggregate_languages', None))

        if not topics and has_aggregate_topics:
            topics = [{"topic": k, "solved": v} for k, v in lc_profile.aggregate_topics.items()]
            topics = sorted(topics, key=lambda x: x["solved"], reverse=True)
            
        if not languages and has_aggregate_languages:
            languages = [{"lang": k, "unique_solved": v} for k, v in lc_profile.aggregate_languages.items()]
            languages = sorted(languages, key=lambda x: x["unique_solved"], reverse=True)
            
        recent_submissions = []
        has_aggregate_submissions = bool(getattr(lc_profile, 'aggregate_submissions', None))
        if has_aggregate_submissions:
            # aggregate_submissions contains keys for UNIX timestamp to count mapping, and 'recent' for recent submissions array
            agg_subs = lc_profile.aggregate_submissions
            if "recent" in agg_subs:
                recent_submissions = agg_subs["recent"]
                # filter out 'recent' to parse calendar
                agg_subs = {k: v for k, v in agg_subs.items() if k != "recent"}
                
            # Sort the calendar by timestamp for streak calculations
            sorted_timestamps = []
            for ts_str in agg_subs.keys():
                try:
                    sorted_timestamps.append(int(ts_str))
                except ValueError:
                    pass
            sorted_timestamps.sort()

            # Calculate Streaks
            current_streak = 0
            longest_streak = 0
            active_days = len(sorted_timestamps)
            
            if active_days > 0:
                temp_streak = 1
                for i in range(1, len(sorted_timestamps)):
                    # Check if consecutive days (allow ~24-26 hour gap max)
                    diff = sorted_timestamps[i] - sorted_timestamps[i-1]
                    if diff <= 86400 * 1.5:  # within 1.5 days
                        temp_streak += 1
                    else:
                        if temp_streak > longest_streak:
                            longest_streak = temp_streak
                        temp_streak = 1
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
                    
                # Current streak (if last submission is within last 2 days)
                now = datetime.datetime.now().timestamp()
                if now - sorted_timestamps[-1] <= 86400 * 2:
                    current_streak = temp_streak
                else:
                    current_streak = 0
                    
            advanced_metrics = {
                "active_days": active_days,
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "submission_calendar": agg_subs
            }
                
            if not submissions_timeline and agg_subs:
                # aggregate_submissions is a map of unix timestamp (string) to count
                monthly_counts = {}
                for ts_str, count in agg_subs.items():
                    try:
                        ts = int(ts_str)
                        month_key = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m')
                        monthly_counts[month_key] = monthly_counts.get(month_key, 0) + count
                    except ValueError:
                        pass
                
                # convert to array and sort
                submissions_timeline = [{"month": k, "count": v} for k, v in monthly_counts.items()]
                submissions_timeline = sorted(submissions_timeline, key=lambda x: x["month"])
            
        contest_query = (
            select(LeetCodeContest)
            .where(LeetCodeContest.leetcode_profile_id == lc_profile.id)
            .order_by(LeetCodeContest.timestamp)
        )
        contest_res = await self.db.execute(contest_query)
        contest_history = [
            {
                "contest_name": row.contest_name,
                "rating": row.rating,
                "global_rank": row.global_rank,
                "problems_solved": row.problems_solved,
                "total_problems": row.total_problems,
                "timestamp": row.timestamp.isoformat()
            }
            for row in contest_res.scalars().all()
        ]
        
        # Calculate Persona
        persona = "The Novice"
        if topics:
            top_topic = topics[0]["topic"]
            if top_topic in ["Dynamic Programming", "Memoization"]:
                persona = "The Dynamic Programmer"
            elif top_topic in ["Tree", "Graph", "Binary Tree", "Depth-First Search", "Breadth-First Search"]:
                persona = "The Tree/Graph Master"
            elif top_topic in ["Math", "Geometry", "Combinatorics", "Number Theory"]:
                persona = "The Math Wiz"
            elif top_topic in ["String", "Two Pointers", "Sliding Window"]:
                persona = "The Array/String Manipulator"
            elif top_topic in ["Database", "SQL"]:
                persona = "The Data Engineer"
            else:
                persona = "The Generalist"
                
        # Calculate FAANG Readiness Score (0 - 100)
        # Weights: Mediums (40%), Hards (30%), Contests (30%)
        # Target for 100%: 150 Mediums, 50 Hards, 1800 Contest Rating
        mediums = getattr(lc_profile, 'medium_solved', 0) or 0
        hards = getattr(lc_profile, 'hard_solved', 0) or 0
        max_rating = max([c["rating"] for c in contest_history]) if contest_history else 1200
        
        medium_score = min(mediums / 150.0, 1.0) * 40
        hard_score = min(hards / 50.0, 1.0) * 30
        rating_score = min(max(max_rating - 1200, 0) / 600.0, 1.0) * 30
        
        readiness_score = int(medium_score + hard_score + rating_score)
        
        if 'advanced_metrics' not in locals():
            advanced_metrics = {}
            
        advanced_metrics["persona"] = persona
        advanced_metrics["readiness_score"] = readiness_score

        return {
            "topics": topics,
            "topic_difficulty_heatmap": topic_difficulty,
            "languages": languages,
            "submissions_timeline": submissions_timeline,
            "contest_history": contest_history,
            "advanced_metrics": advanced_metrics,
            "capabilities": {
                "submissions": has_submissions or len(submissions_timeline) > 0,
                "topics": has_solved_data or has_aggregate_topics,
                "languages": has_submissions or has_aggregate_languages,
                "question_drilldown": has_solved_data,
                "contests": len(contest_history) > 0
            }
        }
