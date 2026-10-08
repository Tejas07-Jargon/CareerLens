from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Dict, Any, List, Optional

from ...models.leetcode import (
    LeetCodeProfile, LeetCodeSolvedProblem, LeetCodeSubmission,
    LeetCodeProblem, LeetCodeProblemTopic, LeetCodeContest
)
import datetime


# ---------------------------------------------------------------------------
# Thresholds (deterministic, documented in code)
# STRONGLY_REPRESENTED_MIN: minimum solved problems in a topic to be "strong"
# UNDERREPRESENTED_MAX: maximum solved problems in a topic to be "underrepresented"
# ---------------------------------------------------------------------------
STRONGLY_REPRESENTED_MIN = 5
UNDERREPRESENTED_MAX = 2


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
                "advanced_metrics": None,
                "contest_history": [],
                "problem_solving_intelligence": None,
                "capabilities": {
                    "submissions": False,
                    "topics": False,
                    "languages": False,
                    "question_drilldown": False,
                    "contests": False,
                    "calendar": False,
                }
            }

        # -----------------------------------------------------------------------
        # Capability detection
        # -----------------------------------------------------------------------
        sub_count_result = await self.db.execute(
            select(func.count(LeetCodeSubmission.submission_id))
            .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
        )
        has_submissions = (sub_count_result.scalar() or 0) > 0

        solved_count_result = await self.db.execute(
            select(func.count(LeetCodeSolvedProblem.id))
            .where(LeetCodeSolvedProblem.leetcode_profile_id == lc_profile.id)
        )
        has_solved_data = (solved_count_result.scalar() or 0) > 0

        has_aggregate_topics = bool(getattr(lc_profile, 'aggregate_topics', None))
        has_aggregate_languages = bool(getattr(lc_profile, 'aggregate_languages', None))
        has_aggregate_submissions = bool(getattr(lc_profile, 'aggregate_submissions', None))

        # -----------------------------------------------------------------------
        # TOPIC INTELLIGENCE — canonical solved data
        # -----------------------------------------------------------------------
        topics: List[Dict] = []
        topic_difficulty: List[Dict] = []   # raw rows for heatmap
        topic_difficulty_heatmap: List[Dict] = []  # structured for frontend

        if has_solved_data:
            # Topic counts — NOTE: a single solved problem can have N topics,
            # so topic.solved counts how many of the user's solved problems
            # are tagged with that topic. This is NOT the unique solved count.
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

            # Topic × Difficulty
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

            # Build structured heatmap: per topic, {easy, medium, hard}
            heatmap_dict: Dict[str, Dict] = {}
            for row in topic_difficulty:
                t = row["topic"]
                d = row["difficulty"]
                c = row["count"]
                if t not in heatmap_dict:
                    heatmap_dict[t] = {"topic": t, "Easy": 0, "Medium": 0, "Hard": 0, "total": 0}
                heatmap_dict[t][d] = c
                heatmap_dict[t]["total"] += c
            # Sort by total desc
            topic_difficulty_heatmap = sorted(
                heatmap_dict.values(), key=lambda x: x["total"], reverse=True
            )

        # Fall back to aggregate data when no canonical solved data exists
        if not topics and has_aggregate_topics:
            topics = [{"topic": k, "solved": v} for k, v in lc_profile.aggregate_topics.items()]
            topics = sorted(topics, key=lambda x: x["solved"], reverse=True)

        # -----------------------------------------------------------------------
        # LANGUAGE INTELLIGENCE
        # -----------------------------------------------------------------------
        languages: List[Dict] = []
        language_difficulty: List[Dict] = []

        if has_submissions:
            # Language distribution — unique_solved = distinct questions accepted per language
            lang_query = (
                select(
                    LeetCodeSubmission.lang,
                    func.count(func.distinct(LeetCodeSubmission.question_id)).label("unique_solved")
                )
                .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
                .where(LeetCodeSubmission.status_display == "Accepted")
                .group_by(LeetCodeSubmission.lang)
                .order_by(func.count(func.distinct(LeetCodeSubmission.question_id)).desc())
            )
            lang_res = await self.db.execute(lang_query)
            languages = [{"lang": row.lang, "unique_solved": row.unique_solved} for row in lang_res]

            # Language × Difficulty
            if has_solved_data:
                lang_diff_query = (
                    select(
                        LeetCodeSubmission.lang,
                        LeetCodeProblem.difficulty,
                        func.count(func.distinct(LeetCodeSubmission.question_id)).label("count")
                    )
                    .join(LeetCodeProblem, LeetCodeSubmission.question_id == LeetCodeProblem.question_id)
                    .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
                    .where(LeetCodeSubmission.status_display == "Accepted")
                    .group_by(LeetCodeSubmission.lang, LeetCodeProblem.difficulty)
                )
                ld_res = await self.db.execute(lang_diff_query)
                for row in ld_res:
                    language_difficulty.append({
                        "lang": row.lang,
                        "difficulty": row.difficulty,
                        "count": row.count
                    })

        if not languages and has_aggregate_languages:
            languages = [{"lang": k, "unique_solved": v} for k, v in lc_profile.aggregate_languages.items()]
            languages = sorted(languages, key=lambda x: x["unique_solved"], reverse=True)

        # -----------------------------------------------------------------------
        # SUBMISSION INTELLIGENCE
        # -----------------------------------------------------------------------
        submissions_timeline: List[Dict] = []
        submission_outcomes: List[Dict] = []

        if has_submissions:
            # Monthly submissions over time
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

            # Submission outcome distribution
            outcome_query = (
                select(
                    LeetCodeSubmission.status_display,
                    func.count(LeetCodeSubmission.submission_id).label("count")
                )
                .where(LeetCodeSubmission.leetcode_profile_id == lc_profile.id)
                .group_by(LeetCodeSubmission.status_display)
                .order_by(func.count(LeetCodeSubmission.submission_id).desc())
            )
            outcome_res = await self.db.execute(outcome_query)
            submission_outcomes = [
                {"status": row.status_display, "count": row.count}
                for row in outcome_res
            ]

        # -----------------------------------------------------------------------
        # PRACTICE CONSISTENCY — submission calendar
        # -----------------------------------------------------------------------
        advanced_metrics: Dict = {}
        calendar_heatmap: Dict = {}  # unix_ts_str -> count

        if has_aggregate_submissions:
            agg_subs = dict(lc_profile.aggregate_submissions or {})
            recent_submissions_raw = agg_subs.pop("recent", [])

            # Parse calendar
            sorted_timestamps: List[int] = []
            for ts_str in agg_subs.keys():
                try:
                    sorted_timestamps.append(int(ts_str))
                except ValueError:
                    pass
            sorted_timestamps.sort()

            # Streak calculation
            current_streak = 0
            longest_streak = 0
            active_days = len(sorted_timestamps)

            if active_days > 0:
                temp_streak = 1
                for i in range(1, len(sorted_timestamps)):
                    diff = sorted_timestamps[i] - sorted_timestamps[i - 1]
                    # Allow up to 1.5 days between entries (same-day submissions cluster)
                    if diff <= 86400 * 1.5:
                        temp_streak += 1
                    else:
                        longest_streak = max(longest_streak, temp_streak)
                        temp_streak = 1
                longest_streak = max(longest_streak, temp_streak)

                now_ts = datetime.datetime.now().timestamp()
                if now_ts - sorted_timestamps[-1] <= 86400 * 2:
                    current_streak = temp_streak
                else:
                    current_streak = 0

            # Compute submissions_timeline from calendar if not already from DB
            if not submissions_timeline and agg_subs:
                monthly_counts: Dict[str, int] = {}
                for ts_str, count in agg_subs.items():
                    try:
                        ts = int(ts_str)
                        month_key = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m')
                        monthly_counts[month_key] = monthly_counts.get(month_key, 0) + count
                    except ValueError:
                        pass
                submissions_timeline = sorted(
                    [{"month": k, "count": v} for k, v in monthly_counts.items()],
                    key=lambda x: x["month"]
                )

            # Recent momentum: last 30 days vs previous 30 days
            now_dt = datetime.datetime.now()
            last_30_start = (now_dt - datetime.timedelta(days=30)).timestamp()
            prev_30_start = (now_dt - datetime.timedelta(days=60)).timestamp()

            last_30_days = sum(
                v for ts_str, v in agg_subs.items()
                if _safe_int(ts_str, -1) >= last_30_start
            )
            prev_30_days = sum(
                v for ts_str, v in agg_subs.items()
                if prev_30_start <= _safe_int(ts_str, -1) < last_30_start
            )

            momentum_pct: Optional[float] = None
            if prev_30_days > 0:
                momentum_pct = round(((last_30_days - prev_30_days) / prev_30_days) * 100, 1)
            elif last_30_days > 0:
                momentum_pct = 100.0  # went from 0 to something

            calendar_heatmap = agg_subs

            advanced_metrics = {
                "active_days": active_days,
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_30_days_activity": last_30_days,
                "prev_30_days_activity": prev_30_days,
                "momentum_pct": momentum_pct,
            }

        # -----------------------------------------------------------------------
        # CONTEST INTELLIGENCE
        # -----------------------------------------------------------------------
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

        # -----------------------------------------------------------------------
        # PROBLEM-SOLVING INTELLIGENCE PANEL
        # Deterministic, derived from canonical analytics
        # -----------------------------------------------------------------------
        total_solved = getattr(lc_profile, 'total_solved', 0) or 0
        easy_solved = getattr(lc_profile, 'easy_solved', 0) or 0
        medium_solved = getattr(lc_profile, 'medium_solved', 0) or 0
        hard_solved = getattr(lc_profile, 'hard_solved', 0) or 0

        # Difficulty Reach: which tiers has the user reached?
        difficulty_reach = {
            "Easy": easy_solved > 0,
            "Medium": medium_solved > 0,
            "Hard": hard_solved > 0
        }

        # Topic breadth
        topic_count = len(topics)

        # Topic concentration: what % of topic associations are in top 3 topics
        topic_concentration_pct: Optional[float] = None
        if topics:
            total_associations = sum(t["solved"] for t in topics)
            top3_associations = sum(t["solved"] for t in topics[:3])
            if total_associations > 0:
                topic_concentration_pct = round((top3_associations / total_associations) * 100, 1)

        # Language diversity
        language_count = len(languages)

        # Strongly represented vs underrepresented
        # Threshold: STRONGLY_REPRESENTED_MIN = 5, UNDERREPRESENTED_MAX = 2
        strongly_represented = [t["topic"] for t in topics if t["solved"] >= STRONGLY_REPRESENTED_MIN]
        underrepresented = [t["topic"] for t in topics if t["solved"] <= UNDERREPRESENTED_MAX and t["solved"] > 0]

        # Persona based on top topic
        persona = _compute_persona(topics)

        # FAANG Readiness Score
        max_rating = max((c["rating"] for c in contest_history), default=1200.0)
        medium_score = min(medium_solved / 150.0, 1.0) * 40
        hard_score = min(hard_solved / 50.0, 1.0) * 30
        rating_score = min(max(max_rating - 1200, 0) / 600.0, 1.0) * 30
        readiness_score = int(medium_score + hard_score + rating_score)

        # Recent momentum label
        momentum_label = "No data"
        mp = advanced_metrics.get("momentum_pct")
        if mp is not None:
            if mp > 10:
                momentum_label = f"↑ +{mp:.0f}%"
            elif mp < -10:
                momentum_label = f"↓ {mp:.0f}%"
            else:
                momentum_label = "→ Stable"

        advanced_metrics["persona"] = persona
        advanced_metrics["readiness_score"] = readiness_score

        problem_solving_intelligence = {
            "difficulty_reach": difficulty_reach,
            "difficulty_depth": {
                "Easy": easy_solved,
                "Medium": medium_solved,
                "Hard": hard_solved,
                "total": total_solved
            },
            "topic_breadth": topic_count,
            "topic_concentration_pct": topic_concentration_pct,
            "top3_topics": [t["topic"] for t in topics[:3]],
            "language_diversity": language_count,
            "active_days": advanced_metrics.get("active_days"),
            "current_streak": advanced_metrics.get("current_streak"),
            "longest_streak": advanced_metrics.get("longest_streak"),
            "momentum_label": momentum_label,
            "momentum_pct": advanced_metrics.get("momentum_pct"),
            "strongly_represented": strongly_represented[:6],
            "underrepresented": underrepresented[:6],
            "persona": persona,
            "readiness_score": readiness_score,
            # Threshold documentation for frontend display
            "thresholds": {
                "strongly_represented_min": STRONGLY_REPRESENTED_MIN,
                "underrepresented_max": UNDERREPRESENTED_MAX,
            }
        }

        return {
            "topics": topics,
            "topic_difficulty_heatmap": topic_difficulty_heatmap,
            "topic_difficulty_raw": topic_difficulty,  # raw rows for filtering
            "languages": languages,
            "language_difficulty": language_difficulty,
            "submissions_timeline": submissions_timeline,
            "submission_outcomes": submission_outcomes,
            "calendar_heatmap": calendar_heatmap,
            "contest_history": contest_history,
            "advanced_metrics": advanced_metrics,
            "problem_solving_intelligence": problem_solving_intelligence,
            "capabilities": {
                "submissions": has_submissions or len(submissions_timeline) > 0,
                "topics": has_solved_data or has_aggregate_topics,
                "languages": has_submissions or has_aggregate_languages,
                "question_drilldown": has_solved_data,
                "contests": len(contest_history) > 0,
                "calendar": has_aggregate_submissions,
                "topic_difficulty_heatmap": has_solved_data,
                "language_difficulty": has_submissions and has_solved_data,
                "submission_outcomes": has_submissions,
                "momentum": has_aggregate_submissions,
            }
        }


def _safe_int(value: str, default: int) -> int:
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _compute_persona(topics: List[Dict]) -> str:
    if not topics:
        return "The Novice"
    top_topic = topics[0]["topic"]
    if top_topic in ["Dynamic Programming", "Memoization"]:
        return "The Dynamic Programmer"
    elif top_topic in ["Tree", "Graph", "Binary Tree", "Depth-First Search", "Breadth-First Search"]:
        return "The Tree/Graph Master"
    elif top_topic in ["Math", "Geometry", "Combinatorics", "Number Theory"]:
        return "The Math Wiz"
    elif top_topic in ["String", "Two Pointers", "Sliding Window"]:
        return "The Array/String Manipulator"
    elif top_topic in ["Database", "SQL"]:
        return "The Data Engineer"
    elif top_topic in ["Array", "Hash Table", "Binary Search"]:
        return "The Core DSA Practitioner"
    else:
        return "The Generalist"
