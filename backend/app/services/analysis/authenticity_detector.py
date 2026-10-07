"""
Authenticity detector – produces signals, never verdicts.

Labels every finding as "signal for review", not a definitive accusation.
Five transparent signals:
  1. fork_flag          – repo is a fork of another repo
  2. first_commit_size  – unusually large first commit (code dump)
  3. burst_commit       – 50+ commits in under 24 hours
  4. template_clone     – file-tree overlap with known starter templates
  5. commit_msg_quality – average commit message length (very short = suspicious)

Each signal is stored as an Evidence record with authenticity_signal type and
a depth reflecting how strong the signal is.
"""

from typing import List

import structlog

from app.core.config import settings
from app.models.evidence import Evidence

log = structlog.get_logger(__name__)

# Known starter template filenames (extend as needed)
TEMPLATE_FINGERPRINTS = {
    "create-react-app": {"src/App.js", "src/index.js", "public/index.html"},
    "vite-react": {"src/App.jsx", "src/main.jsx", "index.html"},
    "express-generator": {"bin/www", "routes/index.js", "routes/users.js"},
    "django-startproject": {"manage.py", "wsgi.py", "asgi.py"},
}


class AuthenticityDetector:
    """
    Analyses repos for authenticity signals.

    Usage
    -----
    detector = AuthenticityDetector(github_username="...", profile_id="...")
    evidence = detector.analyse()
    """

    def __init__(self, github_username: str, profile_id: str):
        self.username = github_username
        self.profile_id = profile_id

    def analyse(self) -> List[Evidence]:
        if not settings.GITHUB_TOKEN:
            log.warning("No GITHUB_TOKEN, skipping authenticity analysis")
            return []

        from github import Github, Auth
        auth = Auth.Token(settings.GITHUB_TOKEN)
        gh = Github(auth=auth)

        try:
            user = gh.get_user(self.username)
        except Exception as exc:
            log.error("GitHub user not found", error=str(exc))
            return []

        evidence: List[Evidence] = []
        repos = [r for r in list(user.get_repos())[:20]]

        for repo in repos:
            evidence.extend(self._analyse_repo(repo))

        return evidence

    def _analyse_repo(self, repo) -> List[Evidence]:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        items: List[Evidence] = []

        # Signal 1: fork flag
        if repo.fork:
            items.append(self._signal(
                repo, now,
                signal="fork_flag",
                detail="Repository is a fork",
                depth=0.7,
                skills=["Open Source Contribution"],
            ))
            return items  # no further signals needed for forks

        # Signal 2: first commit size
        try:
            commits = list(repo.get_commits())
            if commits:
                first = commits[-1]
                files_changed = first.stats.total
                if files_changed > 200:
                    items.append(self._signal(
                        repo, now,
                        signal="first_commit_size",
                        detail=f"First commit changed {files_changed} files",
                        depth=min(1.0, files_changed / 500),
                        skills=[],
                    ))

                # Signal 3: burst commits
                if len(commits) > 1:
                    from datetime import timedelta
                    recent = sorted(
                        [c.commit.author.date for c in commits[:100]],
                        reverse=True,
                    )
                    for i in range(len(recent) - 1):
                        if (recent[i] - recent[i + 1]) < timedelta(hours=24):
                            burst_count = 1
                            j = i + 1
                            while j < len(recent) and (recent[i] - recent[j]) < timedelta(hours=24):
                                burst_count += 1
                                j += 1
                            if burst_count > 50:
                                items.append(self._signal(
                                    repo, now,
                                    signal="burst_commit",
                                    detail=f"{burst_count} commits in < 24h",
                                    depth=min(1.0, burst_count / 100),
                                    skills=[],
                                ))
                            break

                # Signal 5: commit message quality
                sample = commits[:30]
                avg_msg_len = sum(
                    len(c.commit.message.strip()) for c in sample
                ) / max(len(sample), 1)
                if avg_msg_len < 10:
                    items.append(self._signal(
                        repo, now,
                        signal="commit_msg_quality",
                        detail=f"Average commit message length: {avg_msg_len:.1f} chars",
                        depth=max(0.1, avg_msg_len / 80),
                        skills=[],
                    ))

        except Exception as exc:
            log.warning("Commit analysis failed", repo=repo.full_name, error=str(exc))

        # Signal 4: template clone (file tree check)
        try:
            tree = repo.get_git_tree(sha="HEAD", recursive=False)
            filenames = {e.path for e in tree.tree}
            for template_name, fingerprint in TEMPLATE_FINGERPRINTS.items():
                overlap = fingerprint & filenames
                if len(overlap) == len(fingerprint):
                    items.append(self._signal(
                        repo, now,
                        signal="template_clone",
                        detail=f"File tree matches {template_name} starter template",
                        depth=0.6,
                        skills=[],
                    ))
        except Exception:
            pass

        return items

    def _signal(
        self,
        repo,
        now,
        signal: str,
        detail: str,
        depth: float,
        skills: List[str],
    ) -> Evidence:
        return Evidence(
            profile_id=self.profile_id,
            source="github_repo",
            source_url=repo.html_url,
            evidence_type=f"authenticity_signal_{signal}",
            skill_hints=skills,
            reliability=0.6,
            depth=depth,
            recency=1.0,
            authenticity=1.0,
            locator={
                "repo": repo.full_name,
                "signal": signal,
                "detail": detail,
                "label": "signal for review",  # Never a verdict
            },
            extractor_id=f"authenticity_detector_v1::{signal}",
            observed_at=now,
        )
