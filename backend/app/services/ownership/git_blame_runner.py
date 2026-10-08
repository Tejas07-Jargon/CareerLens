"""
Production Git Blame Runner for Safe, Full-History Line Attribution.

Executes low-level Git commands against bare clones:
- Enforces strict execution limits (no checkout, no hooks, no network terminal prompts).
- Performs shallow history verification (rejects shallow clones).
- Lists blob trees via git ls-tree.
- Runs full-history porcelain blame with whitespace/move/copy flags (-w -M -C).
- Caches and batches commit message inspection for co-authorship parsing.
"""

import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import structlog

log = structlog.get_logger(__name__)

SAFE_GIT_ENV = {
    **os.environ,
    "GIT_TERMINAL_PROMPT": "0",
    "GCM_INTERACTIVE": "false",
    "GIT_LFS_SKIP_SMUDGE": "1",
    "PAGER": "cat",
}


class GitBlameRunner:
    """
    Encapsulates Git CLI commands for bare repository analysis.
    """

    @staticmethod
    def run_git(
        args: List[str],
        git_dir: Path,
        timeout_sec: int = 30,
        check: bool = True
    ) -> subprocess.CompletedProcess:
        """Run a git command in the context of a bare git repository."""
        cmd = ["git"] + args
        return subprocess.run(
            cmd,
            cwd=str(git_dir),
            env=SAFE_GIT_ENV,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_sec,
            check=check,
        )

    @classmethod
    def clone_bare(
        cls,
        repo_full_name: str,
        dest_dir: Path,
        timeout_sec: int = 90,
        token: Optional[str] = None
    ) -> bool:
        """
        Execute safe full-history bare clone.
        """
        from app.services.adapters.github_adapter import is_github_token_valid
        
        if token and is_github_token_valid(token):
            remote_url = f"https://x-access-token:{token}@github.com/{repo_full_name}.git"
        else:
            remote_url = f"https://github.com/{repo_full_name}.git"
        cmd = [
            "git", "clone",
            "--bare",
            "--single-branch",
            "--no-tags",
            "--quiet",
            "--",
            remote_url,
            str(dest_dir)
        ]
        try:
            subprocess.run(
                cmd,
                env=SAFE_GIT_ENV,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_sec,
                check=True
            )
            return True
        except subprocess.CalledProcessError as exc:
            log.warning(
                "Bare clone failed",
                repo=repo_full_name,
                stderr=exc.stderr,
                returncode=exc.returncode
            )
            return False
        except subprocess.TimeoutExpired:
            log.warning("Bare clone timed out", repo=repo_full_name, timeout=timeout_sec)
            return False

    @classmethod
    def is_shallow(cls, git_dir: Path) -> bool:
        """
        Check if repository is shallow.
        Returns True if shallow (or if verification fails), False for full-history repo.
        """
        try:
            res = cls.run_git(["rev-parse", "--is-shallow-repository"], git_dir, timeout_sec=10)
            return res.stdout.strip().lower() == "true"
        except Exception as exc:
            log.warning("Failed to check shallow status, assuming shallow for safety", error=str(exc))
            return True

    @classmethod
    def get_head_sha(cls, git_dir: Path) -> str:
        """Retrieve HEAD SHA."""
        try:
            res = cls.run_git(["rev-parse", "HEAD"], git_dir, timeout_sec=10)
            return res.stdout.strip()
        except Exception as exc:
            log.warning("Failed to get HEAD SHA", error=str(exc))
            return "UNKNOWN_HEAD"

    @classmethod
    def list_blobs(cls, git_dir: Path) -> List[Tuple[str, int]]:
        """
        List all tracked blobs at HEAD via git ls-tree.
        Returns list of (file_path, size_bytes).
        """
        try:
            res = cls.run_git(["ls-tree", "-r", "-l", "--full-tree", "HEAD"], git_dir, timeout_sec=30)
        except Exception as exc:
            log.warning("Failed to list tree blobs", error=str(exc))
            return []

        blobs: List[Tuple[str, int]] = []
        for line in res.stdout.splitlines():
            if not line:
                continue
            # Format: <mode> SP <type> SP <object> SP <size> TAB <file>
            parts = line.split(maxsplit=4)
            if len(parts) >= 5 and parts[1] == "blob":
                size_str = parts[3].strip()
                file_path = parts[4].strip()
                # If size is '-', it is a gitlink or unexpanded object
                size_bytes = int(size_str) if size_str.isdigit() else 0
                blobs.append((file_path, size_bytes))

        return blobs

    @classmethod
    def get_commit_messages(
        cls,
        git_dir: Path,
        commit_shas: Set[str]
    ) -> Dict[str, str]:
        """
        Batch retrieve full commit messages for a set of commit SHAs.
        Uses git log --no-walk with null separators.
        """
        if not commit_shas:
            return {}

        results: Dict[str, str] = {}
        sha_list = list(commit_shas)

        # Batch in chunks of 100 SHAs to stay safely within command-line length limits
        chunk_size = 100
        for i in range(0, len(sha_list), chunk_size):
            chunk = sha_list[i:i + chunk_size]
            try:
                # %H = commit hash, %B = raw body, %x00 = null byte
                args = ["log", "--no-walk", "--format=%H%x00%B%x00"] + chunk
                res = cls.run_git(args, git_dir, timeout_sec=20)
                raw_entries = res.stdout.split("\x00")
                # raw_entries are alternating [hash, body, "", hash, body, ""]
                idx = 0
                while idx + 1 < len(raw_entries):
                    c_sha = raw_entries[idx].strip()
                    c_body = raw_entries[idx + 1]
                    if c_sha:
                        results[c_sha] = c_body
                    idx += 2
            except Exception as exc:
                log.warning("Batch commit message fetch error", error=str(exc))
                # Fallback to individual retrieval if batch fails
                for sha in chunk:
                    try:
                        res = cls.run_git(["show", "-s", "--format=%B", sha], git_dir, timeout_sec=5)
                        results[sha] = res.stdout
                    except Exception:
                        results[sha] = ""

        return results

    @classmethod
    def get_commit_authors_summary(
        cls,
        git_dir: Path,
        max_commits: int = 3000
    ) -> List[Tuple[str, str, str]]:
        """
        Extract commit history metadata (sha, author_email, author_name) for up to max_commits.
        Used for determining commit counts per contributor (for solo repository verification).
        """
        try:
            # Format: %H (sha), %aE (email), %aN (name)
            args = ["log", f"-n{max_commits}", "--format=%H%x00%aE%x00%aN", "HEAD"]
            res = cls.run_git(args, git_dir, timeout_sec=20)
            commits = []
            for line in res.stdout.splitlines():
                if not line:
                    continue
                parts = line.split("\x00")
                if len(parts) >= 3:
                    commits.append((parts[0].strip(), parts[1].strip(), parts[2].strip()))
            return commits
        except Exception as exc:
            log.warning("Failed to get commit author summary", error=str(exc))
            return []

    @classmethod
    def blame_file(
        cls,
        git_dir: Path,
        file_path: str,
        timeout_sec: int = 20
    ) -> Optional[List[dict]]:
        """
        Run git blame with whitespace (-w), intra-file move (-M), and cross-file copy (-C) flags.
        Returns parsed list of line dictionaries:
        [
            {
                "commit_sha": str,
                "final_line_no": int,
                "author_mail": str,
                "author_name": str,
                "line_content": str,
            }, ...
        ]
        """
        args = ["blame", "-w", "-M", "-C", "--line-porcelain", "HEAD", "--", file_path]
        try:
            res = cls.run_git(args, git_dir, timeout_sec=timeout_sec)
        except subprocess.TimeoutExpired:
            log.warning("Blame timeout on file", path=file_path, timeout=timeout_sec)
            return None
        except Exception as exc:
            log.warning("Blame failed on file", path=file_path, error=str(exc))
            return None

        lines = res.stdout.split("\n")
        blame_entries: List[dict] = []

        current_entry: dict = {}
        for line in lines:
            if not line:
                continue

            # In porcelain format, the source code line begins with a literal tab
            if line.startswith("\t"):
                line_content = line[1:]
                current_entry["line_content"] = line_content
                blame_entries.append(current_entry)
                current_entry = {}
                continue

            # Header line: <sha> <orig_line> <final_line> [<group_lines>]
            parts = line.split()
            if len(parts) >= 3 and len(parts[0]) == 40 and all(c in "0123456789abcdef" for c in parts[0]):
                current_entry["commit_sha"] = parts[0]
                current_entry["final_line_no"] = int(parts[2])
                continue

            if line.startswith("author-mail "):
                current_entry["author_mail"] = line[len("author-mail "):].strip().strip("<>")
            elif line.startswith("author "):
                current_entry["author_name"] = line[len("author "):].strip()

        return blame_entries
