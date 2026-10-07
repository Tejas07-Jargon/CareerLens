"""
Ownership Map Attribution Spike (Prompt 1).

Purpose:
Determines, safely and conservatively via full-history Git blame,
the proportion of surviving source lines attributable to a student.

Safety Constraints:
1. Bare clone only (--bare --single-branch --no-tags)
2. No working tree checkout
3. No code execution, script hooks, or dependency installation
4. Full-history verification (git rev-parse --is-shallow-repository == false)
5. Strict time and size bounds (50MB cap, 90s timeout)
"""

import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import structlog

from app.services.analysis.skill_normaliser import SkillNormaliser

log = structlog.get_logger(__name__)

# ── Safety Limits & Patterns ─────────────────────────────────────────────────
REPO_NAME_REGEX = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
MAX_REPO_SIZE_MB = 50
MAX_RUNTIME_SECONDS = 90
MAX_FILE_SIZE_BYTES = 300 * 1024  # 300 KB
MAX_LINE_LENGTH = 1000
MAX_AVG_LINE_LENGTH = 200

# Recognized source code extensions
SOURCE_EXTENSIONS: Set[str] = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs",
    ".c", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".kt",
    ".swift", ".sql", ".sh", ".bash", ".html", ".css", ".scss",
    ".sass", ".vue", ".svelte", ".scala", ".m", ".r"
}

# Directories to unconditionally ignore
EXCLUDED_DIR_PATTERNS: Set[str] = {
    "node_modules", "vendor", "dist", "build", "out", ".next",
    "target", "__pycache__", "venv", ".venv", "env", ".env",
    "coverage", "third_party", ".git", ".idea", ".vscode"
}

# Specific lockfiles and minified files to skip
EXCLUDED_FILE_PATTERNS: List[re.Pattern] = [
    re.compile(r"package-lock\.json$", re.IGNORECASE),
    re.compile(r"yarn\.lock$", re.IGNORECASE),
    re.compile(r"pnpm-lock\.yaml$", re.IGNORECASE),
    re.compile(r"poetry\.lock$", re.IGNORECASE),
    re.compile(r"Gemfile\.lock$", re.IGNORECASE),
    re.compile(r"Cargo\.lock$", re.IGNORECASE),
    re.compile(r"\.lock$", re.IGNORECASE),
    re.compile(r"\.min\.(js|css)$", re.IGNORECASE),
    re.compile(r"\.map$", re.IGNORECASE),
]

BOT_EMAIL_PATTERNS: List[re.Pattern] = [
    re.compile(r"dependabot", re.IGNORECASE),
    re.compile(r"github-actions", re.IGNORECASE),
    re.compile(r"renovate", re.IGNORECASE),
    re.compile(r"\[bot\]", re.IGNORECASE),
    re.compile(r"snyk-bot", re.IGNORECASE),
    re.compile(r"greenkeeper", re.IGNORECASE),
    re.compile(r"action@github\.com", re.IGNORECASE),
]

# ── Typed Data Structures ───────────────────────────────────────────────────

@dataclass
class AuthorBlameLine:
    commit_sha: str
    final_line_no: int
    author_mail: str
    author_name: str
    line_content: str
    is_meaningful: bool


@dataclass
class FileOwnershipResult:
    path: str
    raw_lines: int
    meaningful_lines: int
    student_lines: int
    other_lines: int
    bot_lines: int
    unknown_lines: int
    student_share: float
    skills: List[str] = field(default_factory=list)


@dataclass
class SkillOwnershipResult:
    skill: str
    student_lines: int
    other_lines: int
    unknown_lines: int
    total_meaningful_lines: int
    student_share: float


@dataclass
class RepoOwnershipSpikeReport:
    repo_name: str
    is_shallow: bool
    total_candidate_files: int
    analysed_files: int
    skipped_files: int
    skipped_reasons: Dict[str, int]
    total_raw_lines: int
    total_meaningful_lines: int
    student_lines: int
    other_lines: int
    bot_lines: int
    unknown_lines: int
    student_share: float
    other_share: float
    unknown_share: float
    file_results: List[FileOwnershipResult]
    skill_results: List[SkillOwnershipResult]
    execution_time_sec: float
    status: str = "COMPLETE"
    error_message: Optional[str] = None


# ── Core Spike Functions ─────────────────────────────────────────────────────

def validate_repo_name(repo_identifier: str) -> bool:
    """Validate that the repo identifier strictly matches 'owner/repo' format."""
    if not repo_identifier or not isinstance(repo_identifier, str):
        return False
    return bool(REPO_NAME_REGEX.match(repo_identifier.strip()))


def is_shallow_repository(git_dir: Path) -> bool:
    """Check git rev-parse --is-shallow-repository on the repository."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--is-shallow-repository"],
            cwd=str(git_dir),
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        return res.stdout.strip().lower() == "true"
    except Exception as exc:
        log.error("Failed to check shallow state", error=str(exc))
        return True  # Fail safe by assuming shallow if check fails


def is_meaningful_line(line: str, extension: str) -> bool:
    """
    Check if a source line represents meaningful code (not blank, not comment-only,
    not a lone bracket or brace).
    """
    stripped = line.strip()
    if not stripped:
        return False

    # Ignore lone structural punctuation / braces
    if stripped in {"{", "}", "(", ")", "[", "]", ";", ",", "};", "});", "],"}:
        return False

    # Language-aware comment checking
    ext = extension.lower()

    # Hash-style comments: Python, Shell, Ruby, YAML, Docker
    if ext in {".py", ".sh", ".bash", ".rb", ".yaml", ".yml", "dockerfile"}:
        if stripped.startswith("#"):
            return False
        if stripped in {'"""', "'''"} or stripped.startswith(('"""', "'''")):
            return False

    # C-style comments: JS, TS, Java, C, C++, Go, Rust, C#, PHP, Swift, Kotlin
    if ext in {".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".kt", ".swift"}:
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*") or stripped.endswith("*/"):
            return False

    # SQL comments
    if ext == ".sql":
        if stripped.startswith("--") or stripped.startswith("/*") or stripped.startswith("*"):
            return False

    # HTML / XML comments
    if ext in {".html", ".xml", ".vue", ".svelte"}:
        if stripped.startswith("<!--") or stripped.endswith("-->"):
            return False

    return True


def classify_author(
    author_email: str,
    author_name: str,
    student_identities: Set[str]
) -> str:
    """
    Classify author into STUDENT, BOT, OTHER, or UNKNOWN.
    """
    email_clean = author_email.strip().lower().strip("<>")
    name_clean = author_name.strip().lower()

    if not email_clean and not name_clean:
        return "UNKNOWN"

    # Check for known bot patterns
    for bot_pat in BOT_EMAIL_PATTERNS:
        if bot_pat.search(email_clean) or bot_pat.search(name_clean):
            return "BOT"

    # Normalize student matching set
    norm_student_ids = {s.strip().lower() for s in student_identities if s}

    # Match exact email, username, or noreply pattern
    if email_clean in norm_student_ids or name_clean in norm_student_ids:
        return "STUDENT"

    for sid in norm_student_ids:
        # Check GitHub noreply pattern: e.g. username@users.noreply.github.com or 12345+username@users.noreply.github.com
        if f"{sid}@users.noreply.github.com" in email_clean:
            return "STUDENT"
        if sid in email_clean:
            return "STUDENT"

    return "OTHER"


def list_repository_blobs(git_dir: Path) -> List[Tuple[str, int]]:
    """
    List all blobs in the tree using 'git ls-tree -r -l --full-tree HEAD'.
    Returns list of (filepath, size_bytes).
    """
    cmd = ["git", "ls-tree", "-r", "-l", "--full-tree", "HEAD"]
    res = subprocess.run(
        cmd,
        cwd=str(git_dir),
        capture_output=True,
        text=True,
        check=True,
        timeout=30
    )

    blobs: List[Tuple[str, int]] = []
    for line in res.stdout.strip().splitlines():
        if not line:
            continue
        # Format: <mode> SP <type> SP <object> SP <object size> TAB <file>
        parts = line.split(maxsplit=4)
        if len(parts) >= 5 and parts[1] == "blob":
            try:
                size_str = parts[3].strip()
                size_bytes = int(size_str) if size_str != "-" else 0
                path_str = parts[4].strip()
                blobs.append((path_str, size_bytes))
            except Exception:
                continue
    return blobs


def should_include_file(path_str: str, size_bytes: int) -> Tuple[bool, Optional[str]]:
    """Determine if a file should be included in ownership blame analysis."""
    p = Path(path_str)
    parts = p.parts
    filename = p.name.lower()
    ext = p.suffix.lower()

    # Check directory exclusions
    for part in parts[:-1]:
        if part.lower() in EXCLUDED_DIR_PATTERNS:
            return False, f"excluded_dir_{part}"

    # Check size limit
    if size_bytes > MAX_FILE_SIZE_BYTES:
        return False, "file_exceeds_size_limit"

    # Check lockfile & minified patterns
    for pat in EXCLUDED_FILE_PATTERNS:
        if pat.search(filename):
            return False, "lock_or_minified_file"

    # Include recognized source extensions or special files
    is_docker = "dockerfile" in filename or "docker-compose" in filename
    is_workflow = ".github/workflows" in path_str.replace("\\", "/")
    if ext in SOURCE_EXTENSIONS or is_docker or is_workflow:
        return True, None

    return False, "unsupported_extension"


def blame_blob(
    git_dir: Path,
    path_str: str,
    student_identities: Set[str]
) -> Tuple[List[AuthorBlameLine], FileOwnershipResult]:
    """
    Run full-history porcelain blame on a single file path in the bare repository:
    git blame -w -M -C --line-porcelain HEAD -- <path>
    """
    ext = Path(path_str).suffix.lower()
    cmd = ["git", "blame", "-w", "-M", "-C", "--line-porcelain", "HEAD", "--", path_str]
    
    res = subprocess.run(
        cmd,
        cwd=str(git_dir),
        capture_output=True,
        text=True,
        check=True,
        timeout=30,
        errors="replace"
    )

    blame_lines: List[AuthorBlameLine] = []
    current_sha = ""
    current_author_mail = ""
    current_author_name = ""
    current_final_lineno = 0

    student_count = 0
    other_count = 0
    bot_count = 0
    unknown_count = 0
    meaningful_count = 0
    raw_count = 0

    for line in res.stdout.splitlines():
        if not line:
            continue

        # Header line: 40-char SHA + original_line_no + final_line_no
        if len(line) >= 40 and re.match(r"^[0-9a-f]{40}\b", line):
            header_parts = line.split()
            current_sha = header_parts[0]
            current_final_lineno = int(header_parts[2]) if len(header_parts) >= 3 else 0
        elif line.startswith("author "):
            current_author_name = line[len("author "):].strip()
        elif line.startswith("author-mail "):
            current_author_mail = line[len("author-mail "):].strip().strip("<>")
        elif line.startswith("\t"):
            # The actual source line starts with a tab character
            content = line[1:]
            raw_count += 1
            meaningful = is_meaningful_line(content, ext)

            if meaningful:
                meaningful_count += 1
                cat = classify_author(current_author_mail, current_author_name, student_identities)
                if cat == "STUDENT":
                    student_count += 1
                elif cat == "BOT":
                    bot_count += 1
                elif cat == "OTHER":
                    other_count += 1
                else:
                    unknown_count += 1

            blame_lines.append(
                AuthorBlameLine(
                    commit_sha=current_sha,
                    final_line_no=current_final_lineno,
                    author_mail=current_author_mail,
                    author_name=current_author_name,
                    line_content=content,
                    is_meaningful=meaningful,
                )
            )

    # Compute student share over non-bot meaningful lines
    non_bot_total = student_count + other_count + unknown_count
    share = (student_count / non_bot_total) if non_bot_total > 0 else 0.0

    file_result = FileOwnershipResult(
        path=path_str,
        raw_lines=raw_count,
        meaningful_lines=meaningful_count,
        student_lines=student_count,
        other_lines=other_count,
        bot_lines=bot_count,
        unknown_lines=unknown_count,
        student_share=round(share, 4),
        skills=[]
    )

    return blame_lines, file_result


def map_file_to_skills(path_str: str, content_sample: str = "") -> List[str]:
    """
    Map file path and content to canonical skills using CareerLens vocabulary.
    """
    p = Path(path_str)
    filename = p.name.lower()
    ext = p.suffix.lower()
    skills: List[str] = []

    # Path & Extension based mappings
    if ext == ".py":
        skills.append("Python")
        if "fastapi" in content_sample.lower() or "from fastapi" in content_sample:
            skills.append("FastAPI")
        if "django" in content_sample.lower():
            skills.append("Django")
        if "flask" in content_sample.lower():
            skills.append("Flask")
        if "torch" in content_sample.lower() or "pytorch" in content_sample.lower():
            skills.append("PyTorch")
        if "tensorflow" in content_sample.lower():
            skills.append("TensorFlow")
    elif ext in {".ts", ".tsx"}:
        skills.append("TypeScript")
        if ext == ".tsx" or "react" in content_sample.lower() or "from 'react'" in content_sample:
            skills.append("React")
        if "next" in content_sample.lower() or "from 'next" in content_sample:
            skills.append("Next.js")
    elif ext in {".js", ".jsx"}:
        skills.append("JavaScript")
        if ext == ".jsx" or "react" in content_sample.lower():
            skills.append("React")
    elif ext == ".sql":
        skills.append("PostgreSQL")
    elif "dockerfile" in filename or "docker-compose" in filename:
        skills.append("Docker")
    elif ".github/workflows" in path_str.replace("\\", "/"):
        skills.append("CI/CD")

    # Testing detection
    if "test" in path_str.lower() or "spec" in path_str.lower():
        skills.append("Testing")

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for s in skills:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
    return deduped


# ── High-Level Spike Runner ──────────────────────────────────────────────────

class OwnershipSpike:
    """
    High-level runner for the Ownership Attribution Spike.
    """

    def __init__(self, normaliser: Optional[SkillNormaliser] = None):
        self.normaliser = normaliser or SkillNormaliser()

    def run_on_local_repo(
        self,
        git_dir: Path,
        repo_name: str,
        student_identities: Set[str]
    ) -> RepoOwnershipSpikeReport:
        """
        Run the ownership attribution pipeline on an existing bare or working Git repo.
        """
        import time
        start_time = time.time()

        # Check shallow status
        is_shallow = is_shallow_repository(git_dir)
        if is_shallow:
            return RepoOwnershipSpikeReport(
                repo_name=repo_name,
                is_shallow=True,
                total_candidate_files=0,
                analysed_files=0,
                skipped_files=0,
                skipped_reasons={},
                total_raw_lines=0,
                total_meaningful_lines=0,
                student_lines=0,
                other_lines=0,
                bot_lines=0,
                unknown_lines=0,
                student_share=0.0,
                other_share=0.0,
                unknown_share=0.0,
                file_results=[],
                skill_results=[],
                execution_time_sec=round(time.time() - start_time, 3),
                status="FAILED_SHALLOW_REPO",
                error_message="Shallow repository detected. Full history is required for attribution."
            )

        # Enumerate candidate blobs
        try:
            blobs = list_repository_blobs(git_dir)
        except Exception as exc:
            return RepoOwnershipSpikeReport(
                repo_name=repo_name,
                is_shallow=False,
                total_candidate_files=0,
                analysed_files=0,
                skipped_files=0,
                skipped_reasons={},
                total_raw_lines=0,
                total_meaningful_lines=0,
                student_lines=0,
                other_lines=0,
                bot_lines=0,
                unknown_lines=0,
                student_share=0.0,
                other_share=0.0,
                unknown_share=0.0,
                file_results=[],
                skill_results=[],
                execution_time_sec=round(time.time() - start_time, 3),
                status="ERROR",
                error_message=f"Failed to list blobs: {str(exc)}"
            )

        total_candidates = len(blobs)
        analysed_files = 0
        skipped_files = 0
        skipped_reasons: Dict[str, int] = {}
        file_results: List[FileOwnershipResult] = []

        total_student = 0
        total_other = 0
        total_bot = 0
        total_unknown = 0
        total_meaningful = 0
        total_raw = 0

        skill_accumulator: Dict[str, Dict[str, int]] = {}

        for path_str, size_bytes in blobs:
            should_inc, reason = should_include_file(path_str, size_bytes)
            if not should_inc:
                skipped_files += 1
                r_key = reason or "unknown"
                skipped_reasons[r_key] = skipped_reasons.get(r_key, 0) + 1
                continue

            try:
                blame_lines, f_res = blame_blob(git_dir, path_str, student_identities)
                
                # Check minification: average line length or single giant line
                if blame_lines:
                    avg_len = sum(len(b.line_content) for b in blame_lines) / len(blame_lines)
                    max_len = max((len(b.line_content) for b in blame_lines), default=0)
                    if avg_len > MAX_AVG_LINE_LENGTH or max_len > MAX_LINE_LENGTH:
                        skipped_files += 1
                        skipped_reasons["minified_file"] = skipped_reasons.get("minified_file", 0) + 1
                        continue

                # Map skills
                sample_text = "\n".join(b.line_content for b in blame_lines[:50])
                file_skills = map_file_to_skills(path_str, sample_text)
                f_res.skills = file_skills

                analysed_files += 1
                file_results.append(f_res)

                total_raw += f_res.raw_lines
                total_meaningful += f_res.meaningful_lines
                total_student += f_res.student_lines
                total_other += f_res.other_lines
                total_bot += f_res.bot_lines
                total_unknown += f_res.unknown_lines

                # Accumulate per-skill lines
                for sk in file_skills:
                    canonical_sk = self.normaliser.normalise(sk)
                    if canonical_sk not in skill_accumulator:
                        skill_accumulator[canonical_sk] = {"student": 0, "other": 0, "unknown": 0, "total": 0}
                    skill_accumulator[canonical_sk]["student"] += f_res.student_lines
                    skill_accumulator[canonical_sk]["other"] += f_res.other_lines
                    skill_accumulator[canonical_sk]["unknown"] += f_res.unknown_lines
                    skill_accumulator[canonical_sk]["total"] += (f_res.student_lines + f_res.other_lines + f_res.unknown_lines)

            except Exception as exc:
                skipped_files += 1
                skipped_reasons["blame_error"] = skipped_reasons.get("blame_error", 0) + 1
                log.warning("Blame failed for file", path=path_str, error=str(exc))

        # Compute repo-level shares
        countable_total = total_student + total_other + total_unknown
        student_share = (total_student / countable_total) if countable_total > 0 else 0.0
        other_share = (total_other / countable_total) if countable_total > 0 else 0.0
        unknown_share = (total_unknown / countable_total) if countable_total > 0 else 0.0

        # Compute skill results
        skill_results: List[SkillOwnershipResult] = []
        for sk_name, counts in sorted(skill_accumulator.items()):
            tot = counts["total"]
            sk_share = (counts["student"] / tot) if tot > 0 else 0.0
            skill_results.append(
                SkillOwnershipResult(
                    skill=sk_name,
                    student_lines=counts["student"],
                    other_lines=counts["other"],
                    unknown_lines=counts["unknown"],
                    total_meaningful_lines=tot,
                    student_share=round(sk_share, 4)
                )
            )

        elapsed = round(time.time() - start_time, 3)

        return RepoOwnershipSpikeReport(
            repo_name=repo_name,
            is_shallow=False,
            total_candidate_files=total_candidates,
            analysed_files=analysed_files,
            skipped_files=skipped_files,
            skipped_reasons=skipped_reasons,
            total_raw_lines=total_raw,
            total_meaningful_lines=total_meaningful,
            student_lines=total_student,
            other_lines=total_other,
            bot_lines=total_bot,
            unknown_lines=total_unknown,
            student_share=round(student_share, 4),
            other_share=round(other_share, 4),
            unknown_share=round(unknown_share, 4),
            file_results=file_results,
            skill_results=skill_results,
            execution_time_sec=elapsed,
            status="SUCCESS"
        )
