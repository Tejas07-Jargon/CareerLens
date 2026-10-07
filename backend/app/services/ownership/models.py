"""
Ownership Map Data Contracts & Models (Production).
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set


class AuthorCategory(str, Enum):
    STUDENT = "STUDENT"
    OTHER_HUMAN = "OTHER_HUMAN"
    BOT = "BOT"
    UNKNOWN = "UNKNOWN"


@dataclass
class StudentIdentity:
    """
    Candidate identity attributes for attributing code.
    Identities are matched via login, numeric ID, and verified/noreply emails.
    """
    github_login: str
    user_id: Optional[int] = None
    verified_emails: Set[str] = field(default_factory=set)
    noreply_emails: Set[str] = field(default_factory=set)

    def is_student(self, email: str, name: str) -> bool:
        clean_email = email.strip().lower().strip("<>")
        clean_name = name.strip().lower()
        login_lower = self.github_login.strip().lower()

        if clean_email:
            if clean_email in self.verified_emails or clean_email in self.noreply_emails:
                return True
            if f"{login_lower}@users.noreply.github.com" in clean_email:
                return True
            if self.user_id and f"{self.user_id}+{login_lower}@users.noreply.github.com" in clean_email:
                return True

        if clean_name and clean_name == login_lower:
            return True

        return False


@dataclass
class LineRange:
    """Contiguous range of student-authored lines for permalink pinning."""
    path: str
    start_line: int
    end_line: int
    line_count: int


@dataclass
class FileOwnershipResult:
    """Ownership breakdown for a single analyzed file."""
    path: str
    size_bytes: int
    raw_lines: int
    meaningful_lines: int
    student_lines: float
    other_lines: float
    bot_lines: float
    unknown_lines: float
    student_share: float
    skills: List[str] = field(default_factory=list)


@dataclass
class SkillOwnershipResult:
    """Surviving code attribution per canonical skill."""
    skill: str
    student_lines: float
    other_lines: float
    unknown_lines: float
    total_meaningful_lines: float
    student_share: float
    top_ranges: List[LineRange] = field(default_factory=list)


@dataclass
class OwnershipAnalysisResult:
    """Complete, deterministic result contract for a repository ownership analysis."""
    repo: str
    relation: str  # "owner" | "contributor"
    head_sha: str
    method: str  # "git_blame_full_history"
    coverage: float  # byte-level coverage (0.0 to 1.0)
    files_total: int
    files_analysed: int
    files_skipped: int
    skipped_reasons: Dict[str, int]
    student_lines: float
    other_lines: float
    unknown_lines: float
    bot_lines: float
    total_meaningful_lines: float
    student_share: float
    other_share: float
    unknown_share: float
    incomplete: bool
    solo_exception_applied: bool
    notes: List[str]
    skill_results: List[SkillOwnershipResult]
    file_results: List[FileOwnershipResult]
    execution_time_sec: float
    status: str = "SUCCESS"  # "SUCCESS" | "SHALLOW_REJECTED" | "ERROR" | "TIMEOUT"
    error_message: Optional[str] = None
