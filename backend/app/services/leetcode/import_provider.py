from typing import Dict, Any, List, Optional
from .provider import Provider
from .capabilities import LeetCodeCapability
from ...schemas.leetcode import ImportProviderPayload


class ImportProvider(Provider):
    """
    Import Provider for LeetCode data.
    Since LeetCode lacks an official API, this provider parses user-uploaded
    JSON exports (e.g., from browser extensions) to synchronize their profile.
    """

    @property
    def name(self) -> str:
        return "ImportProvider"

    def get_capabilities(self) -> set[LeetCodeCapability]:
        return {
            LeetCodeCapability.PROFILE_STATS,
            LeetCodeCapability.DIFFICULTY_STATS,
            LeetCodeCapability.LANGUAGE_STATS,
            LeetCodeCapability.TOPIC_STATS,
            LeetCodeCapability.QUESTION_LEVEL_DATA,
            LeetCodeCapability.SUBMISSION_HISTORY,
            LeetCodeCapability.CONTEST_HISTORY,
            LeetCodeCapability.HISTORICAL_SNAPSHOTS,
        }

    async def get_profile(self, username: str, payload: Optional[ImportProviderPayload] = None) -> Dict[str, Any]:
        if not payload:
            raise ValueError("ImportProvider requires a payload")
        return payload.profile

    async def get_submissions(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        if not payload:
            raise ValueError("ImportProvider requires a payload")
        return payload.submissions

    async def get_contests(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        if not payload:
            raise ValueError("ImportProvider requires a payload")
        return payload.contests
