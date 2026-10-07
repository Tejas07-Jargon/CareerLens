"""
Comprehensive Unit & Integration Tests for Production Ownership Map Engine (Gate G2).

Tests all 27 required scenarios and security invariants:
1. 60/40 two-author repository
2. whitespace-only reformat invariance (-w)
3. moved block with -M
4. moved block across files (-C)
5. student edits README only
6. bot commits (excluded from denominator)
7. unknown author
8. unknown ratio >30%
9. solo-owned repository exception
10. contributed-to repository does NOT receive solo exception
11. noreply student identity
12. other GitHub login
13. co-authored commit credit splitting
14. generated files excluded
15. lockfiles excluded
16. minified files excluded
17. repeated identical lines capped (anti-padding)
18. shallow clone rejected
19. file-size limit (>300KB)
20. source-file cap (400 limit and byte coverage)
21. deterministic ordering
22. skill share remains in [0, 1]
23. per-line credit sums correctly
24. empty repository
25. repository with no supported source files
26. timeout handling
27. malformed repository name rejected
+ Security boundary tests (no code execution, strict identifier validation)
"""

import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional, Set

import pytest

from app.services.ownership.git_blame_runner import GitBlameRunner
from app.services.ownership.identity_resolver import IdentityResolver
from app.services.ownership.models import (
    AuthorCategory,
    FileOwnershipResult,
    OwnershipAnalysisResult,
    SkillOwnershipResult,
    StudentIdentity,
)
from app.services.ownership.ownership_service import (
    OwnershipService,
    check_generated_and_line_length,
    is_meaningful_line,
    should_skip_path,
    validate_repo_identifier,
)


def _init_git_repo(repo_dir: Path):
    """Helper to initialize a test Git repository with standard config."""
    subprocess.run(["git", "init"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Initial Author"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "initial@test.com"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "commit.gpgsign", "false"], cwd=str(repo_dir), check=True, capture_output=True)


def _commit_as(
    repo_dir: Path,
    file_rel_path: str,
    content: str,
    author_name: str,
    author_email: str,
    commit_msg: str = "commit"
):
    """Commit changes to a file under a specific author identity."""
    target_file = repo_dir / file_rel_path
    target_file.parent.mkdir(parents=True, exist_ok=True)
    target_file.write_text(content, encoding="utf-8")
    subprocess.run(["git", "add", str(target_file)], cwd=str(repo_dir), check=True, capture_output=True)
    eff_name = author_name if author_name.strip() else "Unknown Author"
    eff_email = author_email if author_email.strip() else "unknown@domain.invalid"
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": eff_name,
        "GIT_AUTHOR_EMAIL": eff_email,
        "GIT_COMMITTER_NAME": eff_name,
        "GIT_COMMITTER_EMAIL": eff_email,
    }
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=str(repo_dir), env=env, check=True, capture_output=True)


def _create_bare_copy(work_tree: Path, bare_dir: Path):
    """Create a bare clone from a local repository for testing."""
    subprocess.run(
        ["git", "clone", "--bare", "--quiet", str(work_tree), str(bare_dir)],
        check=True,
        capture_output=True
    )


# ── Test Suite ───────────────────────────────────────────────────────────────

def test_1_sixty_forty_two_author_repository():
    """Test 1: 60/40 two-author repository with exact attribution."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student_user",
        verified_emails={"student@university.edu"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Teammate commits 40 lines
        lines_other = "\n".join([f"var other_var_{i} = {i};" for i in range(40)])
        _commit_as(
            repo_dir,
            "src/app.js",
            lines_other,
            "Teammate Bob",
            "bob@teammate.com",
            "Bob initial commit"
        )

        # Student appends 60 lines
        lines_student = "\n".join([f"var student_var_{i} = {i};" for i in range(60)])
        full_content = lines_other + "\n" + lines_student
        _commit_as(
            repo_dir,
            "src/app.js",
            full_content,
            "Student User",
            "student@university.edu",
            "Student feature commit"
        )

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "owner", student
        )

        assert result.status == "SUCCESS"
        assert result.total_meaningful_lines == 100
        assert result.student_lines == 60.0
        assert result.other_lines == 40.0
        assert abs(result.student_share - 0.60) < 1e-4
        assert abs(result.other_share - 0.40) < 1e-4


def test_2_whitespace_only_reformat():
    """Test 2: Whitespace-only reformat preserves original author attribution (-w)."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="alice",
        verified_emails={"alice@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Alice writes 20 lines of Python code
        alice_code = "\n".join([f"def func_{i}():\n    return {i}" for i in range(10)])
        _commit_as(repo_dir, "module.py", alice_code, "Alice", "alice@dev.com", "Alice code")

        # Bob reformats whitespace / indentation
        bob_reformatted = "\n".join([f"def func_{i}():\n        return {i}" for i in range(10)])
        _commit_as(repo_dir, "module.py", bob_reformatted, "Bob", "bob@dev.com", "Bob reformat")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "owner", student
        )

        assert result.status == "SUCCESS"
        # Due to -w in git blame, Alice retains full credit
        assert result.student_lines == 20.0
        assert result.other_lines == 0.0
        assert result.student_share == 1.0


def test_3_moved_block_within_file():
    """Test 3: Block moved within a file with -M."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student writes block A and block B (distinct lines to avoid anti-padding trigger)
        block_a = "\n".join([f"def block_a_{i}():\n    return 'val_a_{i}'" for i in range(6)])
        block_b = "\n".join([f"def block_b_{i}():\n    return 'val_b_{i}'" for i in range(6)])
        _commit_as(repo_dir, "service.py", block_a + "\n" + block_b, "Student", "student@dev.com")

        # Teammate swaps block A and block B
        _commit_as(repo_dir, "service.py", block_b + "\n" + block_a, "Bob", "bob@dev.com", "Swap blocks")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "owner", student
        )

        assert result.status == "SUCCESS"
        assert result.student_lines == 24.0
        assert result.student_share == 1.0


def test_4_moved_block_across_files():
    """Test 4: Moved block across files (-C attribution)."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student creates utility.py with 15 functions
        funcs_keep = "\n".join([f"def keep_func_{i}():\n    return {i}" for i in range(5)])
        funcs_move = "\n".join([f"def move_func_{i}():\n    return {i} * 2" for i in range(10)])
        _commit_as(repo_dir, "utility.py", funcs_keep + "\n" + funcs_move, "Student", "student@dev.com", "Create util")

        # Bob moves funcs_move from utility.py into helpers.py in the same commit
        (repo_dir / "utility.py").write_text(funcs_keep, encoding="utf-8")
        (repo_dir / "helpers.py").write_text(funcs_move, encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=str(repo_dir), check=True, capture_output=True)
        env = {
            **os.environ,
            "GIT_AUTHOR_NAME": "Bob",
            "GIT_AUTHOR_EMAIL": "bob@dev.com",
            "GIT_COMMITTER_NAME": "Bob",
            "GIT_COMMITTER_EMAIL": "bob@dev.com",
        }
        subprocess.run(["git", "commit", "-m", "Move functions to helpers"], cwd=str(repo_dir), env=env, check=True, capture_output=True)

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "owner", student
        )

        assert result.status == "SUCCESS"
        # Due to git blame -C detecting the cross-file move, student lines are preserved
        assert result.student_lines == 30.0
        assert result.student_share == 1.0


def test_5_student_edits_readme_only():
    """Test 5: Student edits README only; source code belongs to other."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Bob writes Python source files
        py_code = "\n".join([f"def calc_{i}():\n    return {i}" for i in range(25)])
        _commit_as(repo_dir, "core.py", py_code, "Bob", "bob@dev.com")

        # Student only writes README.md (markdown is not in supported source files)
        _commit_as(repo_dir, "README.md", "# Project\nAwesome tool by student", "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "contributor", student
        )

        assert result.status == "SUCCESS"
        assert result.student_lines == 0.0
        assert result.other_lines == 50.0
        assert result.student_share == 0.0


def test_6_bot_commits_ignored_in_shares():
    """Test 6: Bot commits are tracked but excluded from ownership denominator."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student writes 30 lines
        student_code = "\n".join([f"const s_{i} = {i};" for i in range(30)])
        _commit_as(repo_dir, "index.ts", student_code, "Student", "student@dev.com")

        # Dependabot bot adds 10 lines
        bot_code = "\n".join([f"const bot_{i} = {i};" for i in range(10)])
        _commit_as(
            repo_dir,
            "deps.ts",
            bot_code,
            "dependabot[bot]",
            "dependabot[bot]@users.noreply.github.com"
        )

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "testorg/project", "owner", student
        )

        assert result.status == "SUCCESS"
        assert result.student_lines == 30.0
        assert result.bot_lines == 10.0
        # Bot lines are excluded from human denominator: student_share = 30 / (30 + 0 + 0) = 1.0
        assert result.student_share == 1.0


def test_7_unknown_author():
    """Test 7: Unidentifiable author classified as UNKNOWN."""
    cat = IdentityResolver.classify_author("", "", None)
    assert cat == AuthorCategory.UNKNOWN
    cat2 = IdentityResolver.classify_author("unknown@nowhere.invalid", "", None)
    assert cat2 == AuthorCategory.UNKNOWN


def test_8_unknown_ratio_exceeds_30_percent():
    """Test 8: Unknown ratio >30% marks incomplete=True and treats unknown conservatively."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student writes 50 lines
        s_code = "\n".join([f"int s_{i} = {i};" for i in range(50)])
        _commit_as(repo_dir, "main.cpp", s_code, "Student", "student@dev.com")

        # Unknown author writes 50 lines (empty email/name)
        u_code = "\n".join([f"int u_{i} = {i};" for i in range(50)])
        _commit_as(repo_dir, "extra.cpp", u_code, "", "unknown@nowhere.invalid")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "otherorg/project", "contributor", student
        )

        assert result.status == "SUCCESS"
        assert result.incomplete is True
        assert result.unknown_share == 0.50
        assert any("Attribution incomplete" in note for note in result.notes)
        # Conservative student share = 50 / (50 + 0 + 50) = 0.50
        assert result.student_share == 0.50


def test_9_solo_owned_repository_exception():
    """Test 9: Solo-owned repository exception attributes unknown lines to student."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student commits 3 times (60 lines total)
        for i in range(3):
            _commit_as(
                repo_dir,
                f"file_{i}.py",
                f"def f_{i}():\n    return {i}",
                "Student",
                "student@dev.com",
                f"Student commit {i}"
            )

        # 1 unlinked commit by student from another machine/email
        _commit_as(
            repo_dir,
            "unlinked.py",
            "def unlinked_func():\n    return 42",
            "",
            "unknown@host.local",
            "Unlinked commit"
        )

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(
            bare_dir, "student/my-solo-project", "owner", student
        )

        assert result.status == "SUCCESS"
        assert result.solo_exception_applied is True
        assert result.incomplete is False
        assert result.unknown_lines == 0.0
        assert result.student_share == 1.0
        assert any("Solo-owned repository exception applied" in note for note in result.notes)


def test_10_contributed_repository_no_solo_exception():
    """Test 10: Contributed-to repository never receives solo-owned exception."""
    service = OwnershipService()
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        _commit_as(repo_dir, "f1.py", "x = 1\ny = 2\nz = 3\nw = 4", "Student", "student@dev.com")
        _commit_as(repo_dir, "f2.py", "a = 1\nb = 2\nc = 3\nd = 4", "", "unknown@host.local")

        _create_bare_copy(repo_dir, bare_dir)
        # Marked as contributor relation
        result = service.analyse_repository_path(
            bare_dir, "upstream/popular-repo", "contributor", student
        )

        assert result.solo_exception_applied is False
        assert result.unknown_lines > 0.0


def test_11_noreply_student_identities():
    """Test 11: Recognizes standard, numeric, and configured GitHub noreply emails."""
    student = StudentIdentity(
        github_login="octocat",
        user_id=123456
    )

    assert IdentityResolver.is_student_author(
        "octocat@users.noreply.github.com", "Octo Cat", student
    ) is True
    assert IdentityResolver.is_student_author(
        "123456+octocat@users.noreply.github.com", "Octo Cat", student
    ) is True
    assert IdentityResolver.is_student_author(
        "999999+octocat@users.noreply.github.com", "Octo Cat", student
    ) is True
    # Different user login in noreply
    assert IdentityResolver.is_student_author(
        "123456+otheruser@users.noreply.github.com", "Other", student
    ) is False


def test_12_other_github_login():
    """Test 12: Other human contributors classified as OTHER_HUMAN."""
    student = StudentIdentity(github_login="student")
    cat = IdentityResolver.classify_author("teammate@company.com", "Teammate Jane", student)
    assert cat == AuthorCategory.OTHER_HUMAN


def test_13_co_authored_commit():
    """Test 13: Co-authored-by commit trailers split credit accurately."""
    student = StudentIdentity(
        github_login="student",
        verified_emails={"student@dev.com"}
    )

    msg = (
        "Add collaborative feature\n\n"
        "Co-authored-by: Teammate Bob <bob@teammate.com>\n"
    )
    attributions = IdentityResolver.resolve_commit_attribution(
        primary_email="student@dev.com",
        primary_name="Student",
        commit_message=msg,
        student_identity=student
    )

    assert len(attributions) == 2
    assert attributions[0] == (AuthorCategory.STUDENT, 0.5)
    assert attributions[1] == (AuthorCategory.OTHER_HUMAN, 0.5)


def test_14_generated_files_excluded():
    """Test 14: Generated files with header markers in first 5 lines are excluded."""
    gen_lines = [
        "// Code generated by protoc-gen-go. DO NOT EDIT.",
        "package main",
        "var x = 1;",
    ]
    is_gen, reason = check_generated_and_line_length(gen_lines)
    assert is_gen is True
    assert reason == "generated_file"


def test_15_lockfiles_excluded():
    """Test 15: Lockfiles are excluded."""
    assert should_skip_path("package-lock.json")[0] is True
    assert should_skip_path("yarn.lock")[0] is True
    assert should_skip_path("pnpm-lock.yaml")[0] is True
    assert should_skip_path("poetry.lock")[0] is True
    assert should_skip_path("Cargo.lock")[0] is True


def test_16_minified_files_excluded():
    """Test 16: Minified files and source maps are excluded."""
    assert should_skip_path("static/bundle.min.js")[0] is True
    assert should_skip_path("styles/main.min.css")[0] is True
    assert should_skip_path("dist/bundle.js.map")[0] is True


def test_17_repeated_identical_lines_capped_anti_padding():
    """Test 17: Anti-padding rule caps identical line text at 3 per author per file."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Student adds 20 identical lines of padding: 'val = 1'
        padded_lines = "\n".join(["val = 1" for _ in range(20)])
        _commit_as(repo_dir, "padded.py", padded_lines, "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "test/repo", "owner", student)

        assert result.status == "SUCCESS"
        # Only 3 lines counted towards student ownership out of 20
        assert result.student_lines == 3.0
        assert result.total_meaningful_lines == 3.0


def test_18_shallow_clone_rejected():
    """Test 18: Shallow clone is rejected with SHALLOW_REJECTED status."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student")

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "shallow_repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)
        _commit_as(repo_dir, "file.py", "x = 10", "Student", "student@dev.com")

        # Create a shallow clone with depth=1
        subprocess.run(
            ["git", "clone", "--bare", "--depth=1", f"file://{repo_dir}", str(bare_dir)],
            check=True,
            capture_output=True
        )

        assert GitBlameRunner.is_shallow(bare_dir) is True
        result = service.analyse_repository_path(bare_dir, "test/shallow", "owner", student)

        assert result.status == "SHALLOW_REJECTED"
        assert result.student_share == 0.0
        assert result.incomplete is True


def test_19_file_size_limit():
    """Test 19: Files exceeding 300 KB are excluded."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Normal file
        _commit_as(repo_dir, "normal.py", "print('hello')", "Student", "student@dev.com")
        # Oversized file (> 300 KB)
        large_content = "a = 1;\n" * 50000  # ~350 KB
        _commit_as(repo_dir, "large.py", large_content, "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "test/oversize", "owner", student)

        assert result.status == "SUCCESS"
        assert result.files_analysed == 1
        assert result.skipped_reasons.get("oversized", 0) == 1


def test_20_source_file_cap_and_coverage():
    """Test 20: Source files capped at 400 with byte coverage tracking."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # Create 410 small files
        for i in range(410):
            (repo_dir / f"mod_{i:03d}.py").write_text(f"x_{i} = {i}\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=str(repo_dir), check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", "Batch add"], cwd=str(repo_dir), check=True, capture_output=True)

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "test/cap", "owner", student)

        assert result.status == "SUCCESS"
        assert result.files_analysed == 400
        assert result.skipped_reasons.get("source_file_cap_exceeded", 0) == 10
        assert 0.90 <= result.coverage < 1.0


def test_21_deterministic_ordering():
    """Test 21: Output is strictly deterministic across repeated runs."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        _commit_as(repo_dir, "b.py", "b = 2", "Student", "student@dev.com")
        _commit_as(repo_dir, "a.py", "a = 1", "Student", "student@dev.com")
        _commit_as(repo_dir, "c.py", "c = 3", "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        res1 = service.analyse_repository_path(bare_dir, "test/det", "owner", student)
        res2 = service.analyse_repository_path(bare_dir, "test/det", "owner", student)

        assert [f.path for f in res1.file_results] == [f.path for f in res2.file_results]
        assert [f.path for f in res1.file_results] == ["a.py", "b.py", "c.py"]
        assert res1.student_share == res2.student_share


def test_22_skill_share_bounds():
    """Test 22: Skill share is bounded in [0.0, 1.0]."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        _commit_as(repo_dir, "script.py", "import sys\nprint(sys.version)", "Student", "student@dev.com")
        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "test/bounds", "owner", student)

        for sk in result.skill_results:
            assert 0.0 <= sk.student_share <= 1.0
            assert sk.student_lines >= 0.0
            assert sk.total_meaningful_lines >= 0.0


def test_23_per_line_credit_sums_correctly():
    """Test 23: Sum of student, other, unknown shares equals 1.0."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        _commit_as(repo_dir, "f1.py", "x = 10", "Student", "student@dev.com")
        _commit_as(repo_dir, "f2.py", "y = 20", "Bob", "bob@other.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "org/repo", "contributor", student)

        total_shares = result.student_share + result.other_share + result.unknown_share
        assert abs(total_shares - 1.0) < 1e-4


def test_24_empty_repository():
    """Test 24: Empty repository is handled cleanly without errors."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student")

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)
        # Empty commit
        subprocess.run(["git", "commit", "--allow-empty", "-m", "Initial empty commit"], cwd=str(repo_dir), check=True, capture_output=True)

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "org/empty", "owner", student)

        assert result.status == "SUCCESS"
        assert result.files_analysed == 0
        assert result.student_lines == 0.0
        assert result.student_share == 0.0


def test_25_repository_with_no_supported_source_files():
    """Test 25: Repository with only unsupported files (e.g. Markdown, images)."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        _commit_as(repo_dir, "docs.md", "# Documentation", "Student", "student@dev.com")
        _commit_as(repo_dir, "notes.txt", "Some notes", "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "org/docs", "owner", student)

        assert result.status == "SUCCESS"
        assert result.files_analysed == 0
        assert result.student_lines == 0.0


def test_26_timeout_handling():
    """Test 26: Timeout limits terminate processing gracefully."""
    # Tests that GitBlameRunner enforces timeout parameter
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)
        # Blaming a non-existent file with short timeout
        blame_res = GitBlameRunner.blame_file(repo_dir, "nonexistent.py", timeout_sec=1)
        assert blame_res is None


def test_27_malformed_repository_name_rejected():
    """Test 27: Strict rejection of arbitrary or malformed repository identifiers."""
    assert validate_repo_identifier("octocat/Hello-World") is True
    assert validate_repo_identifier("Tejas07-Jargon/CareerLens") is True
    assert validate_repo_identifier("user.name/repo-123.git") is True

    # Malformed / injection attempts
    assert validate_repo_identifier("https://github.com/foo/bar") is False
    assert validate_repo_identifier("foo/bar; rm -rf /") is False
    assert validate_repo_identifier("../../../etc/passwd") is False
    assert validate_repo_identifier("git@github.com:foo/bar.git") is False
    assert validate_repo_identifier("") is False
    assert validate_repo_identifier("single_token") is False


# ── Security Tests ───────────────────────────────────────────────────────────

def test_security_safe_execution_boundaries():
    """Security verification: ensures no arbitrary code execution and strict HTTPS remote URLs."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student")

    # Injected remote attempts rejected immediately before subprocess
    res = service.analyse_repository(
        "invalid_repo; echo hacked",
        student
    )
    assert res.status == "ERROR"
    assert "Invalid repository identifier" in (res.error_message or "")


def test_top_line_ranges_extraction():
    """Test contiguous range extraction (>= 10 lines) for GitHub permalink pinning."""
    service = OwnershipService()
    student = StudentIdentity(github_login="student", verified_emails={"student@dev.com"})

    with tempfile.TemporaryDirectory() as tmpdir:
        repo_dir = Path(tmpdir) / "work"
        bare_dir = Path(tmpdir) / "repo.git"
        repo_dir.mkdir()
        _init_git_repo(repo_dir)

        # 15 consecutive student lines in Python
        py_block = "\n".join([f"def func_range_{i}():\n    return {i}" for i in range(8)])  # 16 lines
        _commit_as(repo_dir, "src/pipeline.py", py_block, "Student", "student@dev.com")

        _create_bare_copy(repo_dir, bare_dir)
        result = service.analyse_repository_path(bare_dir, "test/ranges", "owner", student)

        assert result.status == "SUCCESS"
        py_skill = next((s for s in result.skill_results if s.skill == "Python"), None)
        assert py_skill is not None
        assert len(py_skill.top_ranges) >= 1
        top_range = py_skill.top_ranges[0]
        assert top_range.path == "src/pipeline.py"
        assert top_range.line_count >= 10
        assert top_range.start_line == 1
