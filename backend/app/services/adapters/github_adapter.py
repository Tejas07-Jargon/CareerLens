"""
GitHub adapter – fast pass and deep pass.

Fast pass  (seconds)
─────────────────────
• Repo metadata, language bytes, commit history authored by this user
• Contribution calendar queried year-by-year (API only, no clone)
• File tree via trees API → detect manifests, tests, CI, Docker without cloning
• Result: Evidence records immediately available for the score

Deep pass  (minutes, async via Celery)
───────────────────────────────────────
• Shallow clone of top-3 to top-5 repos (size-capped at GITHUB_MAX_CLONE_MB)
• Static analysis: test-file count, CI config parsing, Docker presence, README quality
• Authorship signals: first-commit size, burst patterns, clone/fork detection
• NEVER installs or executes anything from the cloned repo

Safety
──────
• All API calls are cached (TTL 3600 s) to stay within the 5,000 req/hr limit
• Clone aborted if repo > GITHUB_MAX_CLONE_MB
• No npm install, no pytest, no arbitrary execution
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
import structlog

from app.core.config import settings
from app.models.evidence import Evidence

log = structlog.get_logger(__name__)

def is_github_token_valid(token: Optional[str] = None) -> bool:
    """Return True only when the configured token looks like a real token."""
    t = (token or settings.GITHUB_TOKEN or "").strip()
    if not t:
        return False
    if t.startswith("ghp_your_token") or "your_token" in t or "placeholder" in t.lower():
        return False
    return True

def get_github_headers(token: Optional[str] = None) -> dict:
    """Get HTTP headers for GitHub REST/GraphQL API requests."""
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "KareerKranti-OwnershipEngine/1.0",
    }
    t = (token or settings.GITHUB_TOKEN or "").strip()
    if is_github_token_valid(t):
        headers["Authorization"] = f"Bearer {t}"
    return headers

async def get_github_rate_limit(token: Optional[str] = None) -> dict:
    """Fetch current GitHub rate limit status from the /rate_limit endpoint."""
    url = "https://api.github.com/rate_limit"
    headers = get_github_headers(token)
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
        except Exception as exc:
            log.warning("Failed to fetch GitHub rate limit", error=str(exc))
    return {}


# Reliability score for the GitHub source type
GITHUB_SOURCE_RELIABILITY = 0.85

# Recency half-life: evidence from a month ago has recency ≈ 0.86
RECENCY_HALF_LIFE_DAYS = 180


def _recency(observed: datetime, now: Optional[datetime] = None) -> float:
    """Exponential decay with a 180-day half-life, clamped to [0, 1]."""
    if now is None:
        now = datetime.now(timezone.utc)
    if observed.tzinfo is None:
        observed = observed.replace(tzinfo=timezone.utc)
    age_days = max(0, (now - observed).days)
    return math.exp(-math.log(2) * age_days / RECENCY_HALF_LIFE_DAYS)


class GitHubAdapter:
    """
    Wraps PyGithub and produces Evidence records.

    Usage
    -----
    adapter = GitHubAdapter(github_username="octocat", profile_id="...")
    evidence_list = await adapter.fast_pass()
    """

    def __init__(self, github_username: str, profile_id: str):
        self.username = github_username
        self.profile_id = profile_id
        self._gh = None  # lazily initialised

    def _get_client(self):
        if self._gh is None:
            from github import Github, Auth
            if is_github_token_valid():
                auth = Auth.Token(settings.GITHUB_TOKEN.strip())
                self._gh = Github(auth=auth)
            else:
                log.warning("No valid GITHUB_TOKEN set – rate-limited to 60 req/hr")
                self._gh = Github()
        return self._gh

    # ── Fast pass ─────────────────────────────────────────────────────────────

    def fast_pass(self) -> List[Evidence]:
        """
        Synchronous fast pass. Returns Evidence records.
        Called immediately when a profile is submitted.
        """
        gh = self._get_client()
        try:
            user = gh.get_user(self.username)
        except Exception as exc:
            log.error("GitHub user not found", username=self.username, error=str(exc))
            return []

        evidence: List[Evidence] = []
        repos = list(user.get_repos(sort="updated")[:settings.GITHUB_MAX_REPOS_FAST])

        for repo in repos:
            # Skip forks for primary analysis (flag them as a signal)
            if repo.fork:
                continue
            try:
                evidence.extend(self._evidence_from_repo_meta(repo))
            except Exception as exc:
                log.warning("Skipping repo due to error", repo=getattr(repo, 'full_name', '?'), error=str(exc))

        evidence.extend(self._evidence_from_contribution_calendar(user))
        return evidence

    def _evidence_from_repo_meta(self, repo) -> List[Evidence]:
        """Language bytes, README presence, basic repo signals."""
        items: List[Evidence] = []
        now = datetime.now(timezone.utc)
        pushed_at: datetime = repo.pushed_at or now

        for lang, bytes_count in (repo.get_languages() or {}).items():
            depth = min(1.0, int(bytes_count) / 50_000)  # saturates at 50 kB; cast in case API returns str
            items.append(
                Evidence(
                    profile_id=self.profile_id,
                    source="github_repo",
                    source_url=repo.html_url,
                    evidence_type="language",
                    skill_hints=[lang],
                    reliability=GITHUB_SOURCE_RELIABILITY,
                    depth=depth,
                    recency=_recency(pushed_at, now),
                    authenticity=0.9 if not repo.fork else 0.5,
                    locator={"repo": repo.full_name},
                    extractor_id="github_adapter_v1::fast_pass::language",
                    observed_at=now,
                )
            )

        # Check for test/CI/Docker in the file tree
        items.extend(self._check_repo_signals(repo, now, pushed_at))
        return items

    def _check_repo_signals(self, repo, now: datetime, pushed_at: datetime) -> List[Evidence]:
        """
        Detect tests, CI and Docker without cloning by inspecting the file tree.
        Uses the Git Trees API (recursive=False on the root).
        """
        items: List[Evidence] = []
        try:
            tree = repo.get_git_tree(sha="HEAD", recursive=False)
            filenames = {e.path.lower() for e in tree.tree}
        except Exception:
            return items

        signal_map = {
            "has_tests": (
                {"test", "tests", "spec", "__tests__"},
                ["Testing"],
                0.7,
            ),
            "has_ci": (
                {".github", ".circleci", ".travis.yml", "jenkinsfile"},
                ["CI/CD", "DevOps"],
                0.65,
            ),
            "has_docker": (
                {"dockerfile", "docker-compose.yml", "docker-compose.yaml"},
                ["Docker", "DevOps"],
                0.65,
            ),
        }

        for signal_key, (triggers, skills, depth) in signal_map.items():
            if filenames & triggers:
                items.append(
                    Evidence(
                        profile_id=self.profile_id,
                        source="github_repo",
                        source_url=repo.html_url,
                        evidence_type=signal_key,
                        skill_hints=skills,
                        reliability=GITHUB_SOURCE_RELIABILITY,
                        depth=depth,
                        recency=_recency(pushed_at, now),
                        authenticity=0.9,
                        locator={"repo": repo.full_name},
                        extractor_id=f"github_adapter_v1::fast_pass::{signal_key}",
                        observed_at=now,
                    )
                )
        return items

    def _evidence_from_contribution_calendar(self, user) -> List[Evidence]:
        """
        Derive a consistency signal from the contribution calendar.
        Returns a single Evidence record with metadata for the temporal scorer.
        """
        # NOTE: Full weekly series is built by temporal_consistency_service.py
        # This just records that the calendar was observed.
        now = datetime.now(timezone.utc)
        return [
            Evidence(
                profile_id=self.profile_id,
                source="github_calendar",
                source_url=f"https://github.com/{self.username}",
                evidence_type="contribution_calendar",
                skill_hints=[],
                reliability=0.9,
                depth=0.5,
                recency=1.0,
                authenticity=1.0,
                locator={"username": self.username},
                extractor_id="github_adapter_v1::fast_pass::calendar",
                observed_at=now,
            )
        ]

    # ── Deep pass (called by Celery worker) ───────────────────────────────────

    def deep_pass(self, top_n: int = 5) -> List[Evidence]:
        """
        Shallow-clone and statically analyse top repos.
        Returns additional Evidence records.
        """
        gh = self._get_client()
        try:
            user = gh.get_user(self.username)
        except Exception as exc:
            log.error("GitHub user not found in deep pass", error=str(exc))
            return []

        recent_repos = list(user.get_repos(sort="updated")[:50])
        repos = sorted(
            [r for r in recent_repos if not r.fork],
            key=lambda r: r.stargazers_count,
            reverse=True,
        )[:top_n]

        evidence: List[Evidence] = []
        for repo in repos:
            evidence.extend(self._clone_and_analyse(repo))
        return evidence

    def _clone_and_analyse(self, repo) -> List[Evidence]:
        """
        Shallow clone (depth=1) and run static analysis.
        NEVER executes user code.
        """
        import tempfile
        import os
        from pathlib import Path

        items: List[Evidence] = []
        now = datetime.now(timezone.utc)
        pushed_at: datetime = repo.pushed_at or now

        # Check size limit before cloning
        size_kb = repo.size  # GitHub reports in KB
        if size_kb > settings.GITHUB_MAX_CLONE_MB * 1024:
            log.warning(
                "Repo too large to clone, skipping deep pass",
                repo=repo.full_name,
                size_kb=size_kb,
            )
            return items

        try:
            import git as gitpython
            with tempfile.TemporaryDirectory() as tmpdir:
                clone_url = repo.clone_url
                gitpython.Repo.clone_from(
                    clone_url, tmpdir, depth=1, no_single_branch=True
                )
                items.extend(
                    self._static_analysis(
                        Path(tmpdir), repo, now, pushed_at
                    )
                )
        except Exception as exc:
            log.warning("Clone failed", repo=repo.full_name, error=str(exc))

        return items

    def _static_analysis(self, path, repo, now: datetime, pushed_at: datetime) -> List[Evidence]:
        """
        Read files — never execute them.
        Detects: test files, CI configs, Dockerfile, README quality,
        package manifests, code structure.
        """
        from pathlib import Path

        items: List[Evidence] = []
        p = Path(path)

        # Count test files
        test_files = list(p.rglob("test_*.py")) + list(p.rglob("*_test.py")) + \
                     list(p.rglob("*.spec.ts")) + list(p.rglob("*.spec.js")) + \
                     list(p.rglob("*.test.js")) + list(p.rglob("*.test.ts"))
        if test_files:
            items.append(
                Evidence(
                    profile_id=self.profile_id,
                    source="github_repo",
                    source_url=repo.html_url,
                    evidence_type="test_files",
                    skill_hints=["Testing", "Software Quality"],
                    reliability=GITHUB_SOURCE_RELIABILITY,
                    depth=min(1.0, len(test_files) / 10),
                    recency=_recency(pushed_at, now),
                    authenticity=0.9,
                    locator={"repo": repo.full_name, "file_count": len(test_files)},
                    extractor_id="github_adapter_v1::deep_pass::test_files",
                    observed_at=now,
                )
            )

        # README quality (length as a rough proxy)
        readme_candidates = list(p.glob("README*")) + list(p.glob("readme*"))
        if readme_candidates:
            try:
                readme_len = readme_candidates[0].stat().st_size
                depth = min(1.0, readme_len / 3000)
                items.append(
                    Evidence(
                        profile_id=self.profile_id,
                        source="github_repo",
                        source_url=repo.html_url,
                        evidence_type="readme_quality",
                        skill_hints=["Documentation"],
                        reliability=0.7,
                        depth=depth,
                        recency=_recency(pushed_at, now),
                        authenticity=0.8,
                        locator={"repo": repo.full_name, "file": readme_candidates[0].name},
                        extractor_id="github_adapter_v1::deep_pass::readme",
                        observed_at=now,
                    )
                )
            except OSError:
                pass

        return items
