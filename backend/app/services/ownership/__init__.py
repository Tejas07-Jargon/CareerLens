"""
Kareer Kranti Ownership Map Module (Production Engine).
"""

from app.services.ownership.git_blame_runner import GitBlameRunner
from app.services.ownership.identity_resolver import IdentityResolver
from app.services.ownership.models import (
    AuthorCategory,
    FileOwnershipResult,
    LineRange,
    OwnershipAnalysisResult,
    SkillOwnershipResult,
    StudentIdentity,
)
from app.services.ownership.ownership_service import (
    OwnershipService,
    is_meaningful_line,
    should_skip_path,
    validate_repo_identifier,
)

from app.services.ownership.factor import (
    calculate_ownership_factor,
    get_ownership_confidence_label,
)

__all__ = [
    "OwnershipService",
    "IdentityResolver",
    "GitBlameRunner",
    "StudentIdentity",
    "AuthorCategory",
    "FileOwnershipResult",
    "SkillOwnershipResult",
    "LineRange",
    "OwnershipAnalysisResult",
    "is_meaningful_line",
    "should_skip_path",
    "validate_repo_identifier",
    "calculate_ownership_factor",
    "get_ownership_confidence_label",
]
