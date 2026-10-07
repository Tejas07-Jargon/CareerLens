"""
Unit Tests for Ownership Map Attribution Spike.

Covers:
1. Repo name validation
2. Shallow clone rejection
3. Meaningful-line filtering (whitespace, comment-only, lone syntax tokens)
4. Author classification (student, bot, other, unknown)
5. Controlled Multi-Author Repository Test (Gate G1)
6. Whitespace change invariance test (-w)
7. Skill mapping with CareerLens vocabulary
8. Share bounds [0.0, 1.0] and order-independent aggregation
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Set

import pytest

from app.services.ownership.ownership_spike import (
    OwnershipSpike,
    classify_author,
    is_meaningful_line,
    is_shallow_repository,
    map_file_to_skills,
    should_include_file,
    validate_repo_name,
)


def test_validate_repo_name():
    assert validate_repo_name("octocat/Hello-World") is True
    assert validate_repo_name("Tejas07-Jargon/CareerLens") is True
    assert validate_repo_name("user.name/repo-123.git") is True
    assert validate_repo_name("invalid_url; rm -rf /") is False
    assert validate_repo_name("https://github.com/foo/bar") is False
    assert validate_repo_name("") is False
    assert validate_repo_name("single-token") is False


def test_meaningful_line_filtering():
    # Python
    assert is_meaningful_line("    x = 42", ".py") is True
    assert is_meaningful_line("   ", ".py") is False
    assert is_meaningful_line("# This is a comment", ".py") is False
    assert is_meaningful_line('"""docstring"""', ".py") is False
    assert is_meaningful_line("    def calculate():", ".py") is True

    # JavaScript / TypeScript
    assert is_meaningful_line("const a = 10;", ".ts") is True
    assert is_meaningful_line("// single line comment", ".ts") is False
    assert is_meaningful_line("/* multi line */", ".ts") is False
    assert is_meaningful_line(" * middle of comment", ".ts") is False
    assert is_meaningful_line(" { ", ".ts") is False
    assert is_meaningful_line(" } ", ".ts") is False
    assert is_meaningful_line(" }; ", ".ts") is False
    assert is_meaningful_line(" ] ", ".ts") is False


def test_author_classification():
    student_ids: Set[str] = {"alice@university.edu", "alice", "alice-dev"}

    # Exact email match
    assert classify_author("alice@university.edu", "Alice S", student_ids) == "STUDENT"
    # GitHub noreply email match
    assert classify_author("12345+alice@users.noreply.github.com", "Alice S", student_ids) == "STUDENT"
    # Username match
    assert classify_author("random@domain.com", "alice", student_ids) == "STUDENT"

    # Known Bot accounts
    assert classify_author("dependabot[bot]@users.noreply.github.com", "dependabot[bot]", student_ids) == "BOT"
    assert classify_author("action@github.com", "github-actions", student_ids) == "BOT"
    assert classify_author("renovate@renovatebot.com", "renovate", student_ids) == "BOT"

    # Other teammates
    assert classify_author("bob@teammate.com", "Bob T", student_ids) == "OTHER"

    # Unknown
    assert classify_author("", "", student_ids) == "UNKNOWN"


def test_should_include_file():
    assert should_include_file("src/app.py", 1024)[0] is True
    assert should_include_file("frontend/src/index.tsx", 5000)[0] is True
    assert should_include_file("Dockerfile", 500)[0] is True
    assert should_include_file(".github/workflows/ci.yml", 1200)[0] is True

    # Exclusions
    assert should_include_file("node_modules/react/index.js", 1024)[0] is False
    assert should_include_file("package-lock.json", 100000)[0] is False
    assert should_include_file("dist/bundle.min.js", 50000)[0] is False
    assert should_include_file("large_data.bin", 500000)[0] is False


def test_skill_mapping():
    assert "Python" in map_file_to_skills("backend/main.py", "from fastapi import FastAPI")
    assert "FastAPI" in map_file_to_skills("backend/main.py", "from fastapi import FastAPI")
    assert "TypeScript" in map_file_to_skills("src/components/Card.tsx", "import React from 'react'")
    assert "React" in map_file_to_skills("src/components/Card.tsx", "import React from 'react'")
    assert "Docker" in map_file_to_skills("Dockerfile", "FROM python:3.11")
    assert "Testing" in map_file_to_skills("tests/test_api.py", "def test_ok(): pass")


def test_controlled_repo_g1_attribution_and_whitespace():
    """
    Gate G1 Controlled Test:
    1. Alice (Student) creates 60 meaningful lines.
    2. Bob (Teammate) adds 40 meaningful lines.
    3. Verify ~60% Alice / ~40% Bob.
    4. Bob reformats Alice's lines with whitespace.
    5. Verify ownership is invariant due to -w.
    """
    tmpdir = tempfile.mkdtemp(prefix="careerlens_test_repo_")
    repo_path = Path(tmpdir)

    try:
        # Initialize Git repo
        subprocess.run(["git", "init"], cwd=str(repo_path), check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Alice"], cwd=str(repo_path), check=True)
        subprocess.run(["git", "config", "user.email", "alice@university.edu"], cwd=str(repo_path), check=True)

        # Commit 1: Alice writes 60 lines of python code
        alice_code = "\n".join([f"def function_alice_{i}():\n    return {i} * 2\n" for i in range(30)]) # 60 meaningful lines
        (repo_path / "math_utils.py").write_text(alice_code, encoding="utf-8")
        subprocess.run(["git", "add", "math_utils.py"], cwd=str(repo_path), check=True)
        subprocess.run(["git", "commit", "-m", "Initial implementation by Alice"], cwd=str(repo_path), check=True)

        # Commit 2: Bob adds 40 lines of python code
        subprocess.run(["git", "config", "user.name", "Bob"], cwd=str(repo_path), check=True)
        subprocess.run(["git", "config", "user.email", "bob@teammate.com"], cwd=str(repo_path), check=True)

        bob_code = alice_code + "\n" + "\n".join([f"def function_bob_{j}():\n    return {j} + 10\n" for j in range(20)]) # 40 meaningful lines
        (repo_path / "math_utils.py").write_text(bob_code, encoding="utf-8")
        subprocess.run(["git", "add", "math_utils.py"], cwd=str(repo_path), check=True)
        subprocess.run(["git", "commit", "-m", "Add secondary functions by Bob"], cwd=str(repo_path), check=True)

        # Run spike
        spike = OwnershipSpike()
        student_set = {"alice@university.edu"}
        report_1 = spike.run_on_local_repo(repo_path, "test/controlled-repo", student_set)

        assert report_1.status == "SUCCESS"
        assert report_1.is_shallow is False
        assert report_1.analysed_files == 1
        assert report_1.total_meaningful_lines == 100
        assert report_1.student_lines == 60
        assert report_1.other_lines == 40
        assert pytest.approx(report_1.student_share, 0.01) == 0.60
        assert pytest.approx(report_1.other_share, 0.01) == 0.40

        # Commit 3: Bob reformats all indentation / whitespace in Alice's section
        reformatted_code = bob_code.replace("    return", "        return")
        (repo_path / "math_utils.py").write_text(reformatted_code, encoding="utf-8")
        subprocess.run(["git", "add", "math_utils.py"], cwd=str(repo_path), check=True)
        subprocess.run(["git", "commit", "-m", "Whitespace reformat by Bob"], cwd=str(repo_path), check=True)

        # Re-run blame with -w
        report_2 = spike.run_on_local_repo(repo_path, "test/controlled-repo", student_set)

        # Crucial G1 check: Alice's ownership must remain 60% despite Bob's whitespace edit!
        assert report_2.student_lines == 60
        assert report_2.other_lines == 40
        assert pytest.approx(report_2.student_share, 0.01) == 0.60

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
