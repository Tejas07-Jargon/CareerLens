"""
Production Identity Resolver for GitHub Code Ownership.

Resolves Git commit authors and co-authors into deterministic categories:
- STUDENT (matched via verified email, numeric ID, login, noreply formats)
- OTHER_HUMAN (identifiable non-student, non-bot contributor)
- BOT (automation bots such as dependabot, github-actions, etc.)
- UNKNOWN (unidentifiable, corrupted, or missing email/identity)

Follows conservative attribution rules:
- No cryptographic binding claims ("GitHub account match", not "verified applicant ownership").
- Never stores teammate PII permanently; only computes classification categories.
"""

import re
from typing import List, Optional, Set, Tuple

from app.services.ownership.models import AuthorCategory, StudentIdentity

BOT_PATTERNS: List[re.Pattern] = [
    re.compile(r"dependabot", re.IGNORECASE),
    re.compile(r"github-actions", re.IGNORECASE),
    re.compile(r"renovate", re.IGNORECASE),
    re.compile(r"\[bot\]", re.IGNORECASE),
    re.compile(r"snyk-bot", re.IGNORECASE),
    re.compile(r"greenkeeper", re.IGNORECASE),
    re.compile(r"action@github\.com", re.IGNORECASE),
    re.compile(r"actions@github\.com", re.IGNORECASE),
    re.compile(r"codecov", re.IGNORECASE),
    re.compile(r"semantic-release-bot", re.IGNORECASE),
    re.compile(r"^bot@", re.IGNORECASE),
]

CO_AUTHORED_BY_REGEX = re.compile(
    r"^[ \t]*co-authored-by:[ \t]*(?P<name>[^<]+?)[ \t]*(?:<(?P<email>[^>]+)>)?$",
    re.IGNORECASE | re.MULTILINE
)

NOREPLY_GITHUB_SUFFIX = "@users.noreply.github.com"


class IdentityResolver:
    """
    Resolves author identities for Git blame and commit analysis.
    """

    @staticmethod
    def is_bot(email: str, name: str) -> bool:
        """Check if author email or name matches known automation bot patterns."""
        clean_email = email.strip().lower().strip("<>")
        clean_name = name.strip().lower()

        for pattern in BOT_PATTERNS:
            if pattern.search(clean_email) or pattern.search(clean_name):
                return True
        return False

    @classmethod
    def classify_author(
        cls,
        email: str,
        name: str,
        student_identity: Optional[StudentIdentity] = None
    ) -> AuthorCategory:
        """
        Classify a single author (email + name) into AuthorCategory.
        """
        clean_email = email.strip().lower().strip("<>")
        clean_name = name.strip().lower()

        # Check for empty / unknown identity first
        if not clean_email and not clean_name:
            return AuthorCategory.UNKNOWN
        if clean_email in {"none", "unknown", "null", "undefined"} and not clean_name:
            return AuthorCategory.UNKNOWN

        # Bot check takes precedence
        if cls.is_bot(clean_email, clean_name):
            return AuthorCategory.BOT

        # Student match check
        if student_identity:
            if cls.is_student_author(clean_email, clean_name, student_identity):
                return AuthorCategory.STUDENT

        # If email is present and valid, or name is present, classify as OTHER_HUMAN or UNKNOWN
        if clean_email or clean_name:
            if (
                clean_email.startswith("unknown@")
                or clean_email.startswith("nobody@")
                or clean_email.endswith(".invalid")
                or clean_email.endswith(".local")
                or clean_name in {"unknown", "unknown author", "nobody", "none"}
            ):
                return AuthorCategory.UNKNOWN
            return AuthorCategory.OTHER_HUMAN

        return AuthorCategory.UNKNOWN

    @classmethod
    def is_student_author(
        cls,
        clean_email: str,
        clean_name: str,
        student: StudentIdentity
    ) -> bool:
        """
        Determines whether email/name matches the student's known GitHub identity.
        Checks:
        1. Explicit verified emails or noreply emails
        2. Standard GitHub noreply: username@users.noreply.github.com
        3. Numeric GitHub noreply: <user_id>+<username>@users.noreply.github.com
        4. Any ID prefix: <digits>+<username>@users.noreply.github.com
        5. Exact match on GitHub login name
        """
        login_lower = student.github_login.strip().lower()

        # Check verified & configured emails
        if clean_email:
            norm_verified = {e.strip().lower() for e in student.verified_emails}
            norm_noreply = {e.strip().lower() for e in student.noreply_emails}
            if clean_email in norm_verified or clean_email in norm_noreply:
                return True

            # GitHub noreply patterns
            if clean_email.endswith(NOREPLY_GITHUB_SUFFIX):
                prefix = clean_email[:-len(NOREPLY_GITHUB_SUFFIX)]
                # Cases: 'username' or '123456+username'
                if prefix == login_lower:
                    return True
                if "+" in prefix:
                    parts = prefix.split("+", 1)
                    if parts[1] == login_lower:
                        return True

            # If user_id is provided, check user_id+login pattern explicitly
            if student.user_id:
                expected_noreply = f"{student.user_id}+{login_lower}{NOREPLY_GITHUB_SUFFIX}"
                if clean_email == expected_noreply:
                    return True

        # Check exact username / display name matching login
        if clean_name and clean_name == login_lower:
            return True

        return False

    @staticmethod
    def parse_co_authors(commit_message: str) -> List[Tuple[str, str]]:
        """
        Parse Co-authored-by trailers from a commit message.
        Returns a list of (name, email) tuples for co-authors.
        """
        if not commit_message or "co-authored-by" not in commit_message.lower():
            return []

        co_authors: List[Tuple[str, str]] = []
        for match in CO_AUTHORED_BY_REGEX.finditer(commit_message):
            name = (match.group("name") or "").strip()
            email = (match.group("email") or "").strip()
            if name or email:
                co_authors.append((name, email))

        return co_authors

    @classmethod
    def resolve_commit_attribution(
        cls,
        primary_email: str,
        primary_name: str,
        commit_message: str,
        student_identity: Optional[StudentIdentity] = None
    ) -> List[Tuple[AuthorCategory, float]]:
        """
        Calculates attribution fractions for a commit (primary author + co-authors).
        Credit is split equally among all valid contributors.
        
        Example:
        - Primary = STUDENT, Co-author = OTHER -> [(STUDENT, 0.5), (OTHER_HUMAN, 0.5)]
        - Primary = STUDENT, Co-author = BOT -> [(STUDENT, 0.5), (BOT, 0.5)]
          (Note: BOT lines will be ignored in student/other/unknown aggregates)
        - Primary = STUDENT alone -> [(STUDENT, 1.0)]
        """
        primary_cat = cls.classify_author(primary_email, primary_name, student_identity)
        co_authors = cls.parse_co_authors(commit_message)

        if not co_authors:
            return [(primary_cat, 1.0)]

        # Classify all contributors
        categories: List[AuthorCategory] = [primary_cat]
        for c_name, c_email in co_authors:
            c_cat = cls.classify_author(c_email, c_name, student_identity)
            categories.append(c_cat)

        total_contributors = len(categories)
        share_per_contributor = 1.0 / total_contributors

        return [(cat, share_per_contributor) for cat in categories]
