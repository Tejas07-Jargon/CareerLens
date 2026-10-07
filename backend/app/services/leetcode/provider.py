from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from .capabilities import LeetCodeCapability
from ...schemas.leetcode import ImportProviderPayload


class Provider(ABC):
    """
    Abstract base class for all LeetCode data providers.
    Because LeetCode has no official developer API, providers must explicitly
    declare their capabilities using the get_capabilities() method.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def get_capabilities(self) -> set[LeetCodeCapability]:
        """Return a set of capabilities supported by this provider."""
        pass

    def supports(self, capability: LeetCodeCapability) -> bool:
        return capability in self.get_capabilities()

    @abstractmethod
    async def get_profile(self, username: str, payload: Optional[ImportProviderPayload] = None) -> Dict[str, Any]:
        """Fetch profile stats, reputation, and badges."""
        pass

    @abstractmethod
    async def get_submissions(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        """Fetch submission history."""
        pass

    @abstractmethod
    async def get_contests(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        """Fetch contest history."""
        pass
