"""
Temporal consistency analyser.

Builds a 12-month weekly activity time series from the student's GitHub
contribution calendar and computes three consistency metrics:

Metrics
───────
active_week_ratio   Fraction of weeks with ≥ 1 contribution in the last 52 weeks
longest_gap_weeks   Longest contiguous stretch of zero-contribution weeks
trend_slope         Linear regression slope of weekly contributions (+ = growing)

Returns an Evidence record for each metric, plus the raw weekly series stored
in the locator for the frontend timeline chart.

Implementation note: GitHub's /users/{user}/events feed only covers ~90 days.
We instead use the contribution calendar via the GraphQL API (requires a token).
Fall back to per-repo commit history via REST if GraphQL is unavailable.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import structlog

from app.core.config import settings
from app.models.evidence import Evidence

log = structlog.get_logger(__name__)


class TemporalConsistencyService:
    """
    Computes consistency and growth signals from GitHub activity.

    Usage
    -----
    svc = TemporalConsistencyService(github_username="octocat", profile_id="...")
    evidence = svc.analyse()
    """

    GRAPHQL_URL = "https://api.github.com/graphql"
    WEEKS = 52  # analyse 12 months

    def __init__(self, github_username: str, profile_id: str):
        self.username = github_username
        self.profile_id = profile_id

    def analyse(self) -> List[Evidence]:
        weekly_series = self._fetch_weekly_series()
        if not weekly_series:
            return []

        active_week_ratio = self._active_week_ratio(weekly_series)
        longest_gap = self._longest_gap(weekly_series)
        trend_slope = self._trend_slope(weekly_series)

        return [
            self._make_evidence(
                metric="active_week_ratio",
                value=active_week_ratio,
                skill_hints=["Consistency", "Learning Habit"],
                weekly_series=weekly_series,
            ),
            self._make_evidence(
                metric="longest_gap_weeks",
                # Invert: a shorter gap is better; normalise to [0,1]
                value=max(0.0, 1.0 - longest_gap / self.WEEKS),
                skill_hints=["Consistency"],
                weekly_series=weekly_series,
            ),
            self._make_evidence(
                metric="trend_slope",
                # Sigmoid: positive slope → depth > 0.5
                value=self._sigmoid(trend_slope),
                skill_hints=["Growth", "Learning Habit"],
                weekly_series=weekly_series,
            ),
        ]

    # ── Data fetching ─────────────────────────────────────────────────────────

    def _fetch_weekly_series(self) -> List[int]:
        """
        Returns a list of 52 integers (contribution count per ISO week, oldest first).
        Tries GraphQL first, falls back to REST per-repo commit history.
        """
        series = self._fetch_via_graphql()
        if series:
            return series
        log.warning("GraphQL unavailable, falling back to REST commit history")
        return self._fetch_via_rest()

    def _fetch_via_graphql(self) -> List[int]:
        """Use GitHub's contributionsCollection GraphQL query."""
        if not settings.GITHUB_TOKEN:
            return []

        import httpx

        now = datetime.now(timezone.utc)
        from_dt = (now - timedelta(weeks=self.WEEKS)).isoformat()
        query = f"""
        {{
          user(login: "{self.username}") {{
            contributionsCollection(from: "{from_dt}", to: "{now.isoformat()}") {{
              contributionCalendar {{
                weeks {{
                  contributionDays {{
                    contributionCount
                  }}
                }}
              }}
            }}
          }}
        }}
        """
        try:
            with httpx.Client(timeout=15) as client:
                resp = client.post(
                    self.GRAPHQL_URL,
                    json={"query": query},
                    headers={"Authorization": f"Bearer {settings.GITHUB_TOKEN}"},
                )
            data = resp.json()
            weeks_data = (
                data.get("data", {})
                .get("user", {})
                .get("contributionsCollection", {})
                .get("contributionCalendar", {})
                .get("weeks", [])
            )
            series = [
                sum(d["contributionCount"] for d in week.get("contributionDays", []))
                for week in weeks_data
            ]
            return series[-self.WEEKS:]  # keep last 52 weeks
        except Exception as exc:
            log.warning("GraphQL fetch failed", error=str(exc))
            return []

    def _fetch_via_rest(self) -> List[int]:
        """
        Fall back: aggregate commits per week from top repos via REST API.
        """
        from github import Github, Auth
        if not settings.GITHUB_TOKEN:
            return []

        auth = Auth.Token(settings.GITHUB_TOKEN)
        gh = Github(auth=auth)
        try:
            user = gh.get_user(self.username)
        except Exception:
            return []

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(weeks=self.WEEKS)
        week_counts: Dict[int, int] = {}

        for repo in list(user.get_repos())[:10]:
            if repo.fork:
                continue
            try:
                commits = repo.get_commits(author=self.username, since=cutoff)
                for commit in commits:
                    commit_date = commit.commit.author.date
                    if commit_date.tzinfo is None:
                        commit_date = commit_date.replace(tzinfo=timezone.utc)
                    week_num = (now - commit_date).days // 7
                    if 0 <= week_num < self.WEEKS:
                        week_counts[week_num] = week_counts.get(week_num, 0) + 1
            except Exception:
                continue

        # Convert to oldest-first list
        return [week_counts.get(w, 0) for w in range(self.WEEKS - 1, -1, -1)]

    # ── Metrics ───────────────────────────────────────────────────────────────

    def _active_week_ratio(self, series: List[int]) -> float:
        active = sum(1 for c in series if c > 0)
        return active / len(series) if series else 0.0

    def _longest_gap(self, series: List[int]) -> int:
        """Return the longest run of consecutive zero weeks."""
        max_gap = current = 0
        for c in series:
            if c == 0:
                current += 1
                max_gap = max(max_gap, current)
            else:
                current = 0
        return max_gap

    def _trend_slope(self, series: List[int]) -> float:
        """Ordinary-least-squares slope of the weekly series."""
        n = len(series)
        if n < 2:
            return 0.0
        x_mean = (n - 1) / 2
        y_mean = sum(series) / n
        numer = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(series))
        denom = sum((i - x_mean) ** 2 for i in range(n))
        return numer / denom if denom else 0.0

    @staticmethod
    def _sigmoid(x: float, scale: float = 5.0) -> float:
        """Map slope to [0,1] with inflection at 0."""
        return 1.0 / (1.0 + math.exp(-scale * x))

    # ── Evidence construction ─────────────────────────────────────────────────

    def _make_evidence(
        self,
        metric: str,
        value: float,
        skill_hints: List[str],
        weekly_series: List[int],
    ) -> Evidence:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        return Evidence(
            profile_id=self.profile_id,
            source="github_calendar",
            source_url=f"https://github.com/{self.username}",
            evidence_type=f"consistency_{metric}",
            skill_hints=skill_hints,
            reliability=0.90,
            depth=value,
            recency=1.0,
            authenticity=1.0,
            locator={
                "username": self.username,
                "metric": metric,
                "value": value,
                # weekly_series stored for the frontend timeline chart
                "weekly_series": weekly_series,
            },
            extractor_id=f"temporal_consistency_v1::{metric}",
            observed_at=now,
        )
