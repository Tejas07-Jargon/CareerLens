from typing import Dict, Any, List, Optional
from .provider import Provider
from .capabilities import LeetCodeCapability
from ...schemas.leetcode import ImportProviderPayload


class OfficialProvider(Provider):
    """
    Official LeetCode API Provider.
    Since LeetCode does not provide an official API, this provider explicitly
    declares no capabilities and raises NotImplementedError if called.
    """

    @property
    def name(self) -> str:
        return "OfficialProvider"

    def get_capabilities(self) -> set[LeetCodeCapability]:
        # Absolutely no capabilities are supported since there is no official API.
        return set()

    async def get_profile(self, username: str, payload: Optional[ImportProviderPayload] = None) -> Dict[str, Any]:
        raise NotImplementedError("LeetCode does not provide an official API. Data must be imported.")

    async def get_submissions(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError("LeetCode does not provide an official API. Data must be imported.")

    async def get_contests(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError("LeetCode does not provide an official API. Data must be imported.")
