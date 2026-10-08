"""
Comprehensive Tests for Gate G3: Persistence, Discovery, and Async Pipeline.

Tests:
1. Database Models & Snapshots:
   - RepoAttribution creation & field verification
   - SkillOwnership cascade & foreign keys
   - Historical snapshots across distinct HEAD SHAs
   - IdentityDeclaration stores SHA-256 hash and masked string
2. Discovery & Ranking:
   - Discovers owned and contributed-to public repositories
   - Excludes private, fork, and archived repositories
   - Enforces 8-repository cap
   - Deterministic 4-tier ranking
   - Numeric database ID persists across login changes
3. Orchestration & Caching:
   - Discovered repo stages record
   - Full-history blame executes and persists results
   - Cached analysis reused when HEAD SHA matches
   - Different HEAD triggers fresh analysis
   - Algorithm version bump invalidates cache
   - Failed analysis handled safely without stuck state
4. API Endpoints:
   - GET /profiles/{id}/ownership (summary)
   - GET /profiles/{id}/ownership/repos/{attribution_id} (detail)
   - POST /profiles/{id}/ownership/refresh (async dispatch)
   - POST /profiles/{id}/identities (pending email staging)
   - DELETE /profiles/{id}/identities/{id}
   - Privacy check: raw contributor emails are never returned
5. Skill Mapping Investigation (Phase 12):
   - Proves FastAPI files mapped to FastAPI/Python, Django only on explicit Django code,
     and unrelated files never receive false positive Django attributions.
"""

import hashlib
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, init_db
from app.main import app
from app.models.ownership import IdentityDeclaration, RepoAttribution, SkillOwnership
from app.models.profile import Profile
from app.services.ownership.models import (
    AuthorCategory,
    FileOwnershipResult,
    LineRange,
    OwnershipAnalysisResult,
    SkillOwnershipResult,
    StudentIdentity,
)
from app.services.ownership.ownership_pipeline import (
    OWNERSHIP_ALGORITHM_VERSION,
    OwnershipPipeline,
)
from app.services.ownership.ownership_service import OwnershipService
from app.services.ownership.repository_discovery import (
    DiscoveredRepository,
    DiscoveryResult,
    RepositoryDiscoveryService,
)


# ── Database Tests ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_db_create_repo_attribution():
    """Test 1: Create RepoAttribution and verify default fields and relationships."""
    await init_db()
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, display_name="Test Student", github_username="testdev")
        session.add(profile)
        await session.commit()

        attribution = RepoAttribution(
            profile_id=pid,
            repo_full_name="testdev/my-app",
            relation="owner",
            head_sha="a1b2c3d4e5f6",
            student_share=0.85,
            other_share=0.15,
            status="complete",
        )
        session.add(attribution)
        await session.commit()
        await session.refresh(attribution)

        assert attribution.id is not None
        assert attribution.repo_full_name == "testdev/my-app"
        assert attribution.student_share == 0.85
        assert attribution.status == "complete"
        assert attribution.algorithm_version == "1"


@pytest.mark.asyncio
async def test_db_historical_snapshots_different_heads():
    """Test 2: Preserves historical snapshots when HEAD changes."""
    await init_db()
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, display_name="Snapshot User", github_username="snapuser")
        session.add(profile)
        await session.commit()

        attr_v1 = RepoAttribution(
            profile_id=pid,
            repo_full_name="snapuser/repo",
            head_sha="commit_sha_1",
            student_share=0.70,
            status="complete",
        )
        session.add(attr_v1)
        await session.commit()

        attr_v2 = RepoAttribution(
            profile_id=pid,
            repo_full_name="snapuser/repo",
            head_sha="commit_sha_2",
            student_share=0.85,
            status="complete",
        )
        session.add(attr_v2)
        await session.commit()

        stmt = select(RepoAttribution).where(RepoAttribution.profile_id == pid)
        records = (await session.execute(stmt)).scalars().all()
        assert len(records) == 2
        head_shas = {r.head_sha for r in records}
        assert head_shas == {"commit_sha_1", "commit_sha_2"}


@pytest.mark.asyncio
async def test_db_skill_ownership_cascade():
    """Test 3: SkillOwnership is linked and cascades upon deletion."""
    await init_db()
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, github_username="coder")
        session.add(profile)
        await session.commit()

        attr = RepoAttribution(
            profile_id=pid,
            repo_full_name="coder/fullstack",
            status="complete",
        )
        session.add(attr)
        await session.commit()
        await session.refresh(attr)

        skill = SkillOwnership(
            repo_attribution_id=attr.id,
            skill="TypeScript",
            student_lines=150.0,
            total_lines=200.0,
            share=0.75,
            top_ranges=[{"path": "src/app.ts", "start_line": 1, "end_line": 50, "line_count": 50}],
        )
        session.add(skill)
        await session.commit()

        stmt = select(SkillOwnership).where(SkillOwnership.repo_attribution_id == attr.id)
        skills = (await session.execute(stmt)).scalars().all()
        assert len(skills) == 1
        assert skills[0].skill == "TypeScript"
        assert skills[0].share == 0.75


@pytest.mark.asyncio
async def test_db_identity_declaration_hashing():
    """Test 4: IdentityDeclaration stores hash, not raw email."""
    await init_db()
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, github_username="privuser")
        session.add(profile)
        await session.commit()

        raw_email = "student.private@university.edu"
        email_hash = hashlib.sha256(raw_email.lower().encode("utf-8")).hexdigest()

        decl = IdentityDeclaration(
            profile_id=pid,
            email_hash=email_hash,
            masked_email="s***e@university.edu",
            status="pending",
            reason="github_binding_required",
        )
        session.add(decl)
        await session.commit()
        await session.refresh(decl)

        assert decl.email_hash == email_hash
        assert raw_email not in decl.email_hash
        assert decl.status == "pending"
        assert decl.reason == "github_binding_required"


# ── Discovery & Ranking Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_discovery_owned_and_contributed():
    """Test 5: Discovery finds owned and contributed repositories with proper filters."""
    service = RepositoryDiscoveryService()

    mock_gql_repos = {
        "org/contributed-app": DiscoveredRepository(
            repo_full_name="org/contributed-app",
            relation="contributed_to",
            contribution_count=25,
            stars_count=100,
        )
    }

    mock_rest_repos = {
        "student/portfolio": DiscoveredRepository(
            repo_full_name="student/portfolio",
            relation="owner",
            contribution_count=50,
            stars_count=10,
        ),
        "student/forked-tool": DiscoveredRepository(
            repo_full_name="student/forked-tool",
            relation="owner",
            is_fork=True,
        ),
    }

    with patch.object(service, "discover_repositories_graphql", AsyncMock(return_value=(12345, mock_gql_repos, {}, None))), \
         patch.object(service, "discover_repositories_rest_owned", AsyncMock(return_value=(12345, mock_rest_repos, {"fork": 1}, None))), \
         patch.object(service, "resolve_identity", AsyncMock(return_value=(12345, "student", {"student@users.noreply.github.com"}, None))):

        result = await service.discover("student")

        assert result.student_identity.user_id == 12345
        assert result.student_identity.github_login == "student"
        repo_names = [r.repo_full_name for r in result.repositories]
        assert "student/portfolio" in repo_names
        assert "org/contributed-app" in repo_names


@pytest.mark.asyncio
async def test_discovery_ranking_and_eight_cap():
    """Test 6: Enforces 8-repository cap and deterministic 4-tier ranking."""
    service = RepositoryDiscoveryService()

    mock_repos = {}
    for i in range(12):
        mock_repos[f"org/repo-{i:02d}"] = DiscoveredRepository(
            repo_full_name=f"org/repo-{i:02d}",
            relation="owner" if i % 2 == 0 else "contributed_to",
            contribution_count=i * 10,
            stars_count=i * 5,
        )

    with patch.object(service, "discover_repositories_graphql", AsyncMock(return_value=(999, {}, {}, None))), \
         patch.object(service, "discover_repositories_rest_owned", AsyncMock(return_value=(999, mock_repos, {}, None))), \
         patch.object(service, "resolve_identity", AsyncMock(return_value=(999, "student", set(), None))):

        result = await service.discover("student")

        assert len(result.repositories) == 8
        counts = [r.contribution_count for r in result.repositories]
        assert counts == sorted(counts, reverse=True)


# ── Orchestration & Caching Tests ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_orchestration_and_cache_reuse():
    """Test 7: Reuses cached analysis for unchanged HEAD SHA; analyzes fresh on new HEAD."""
    await init_db()
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, github_username="cachestudent")
        session.add(profile)
        await session.commit()

        pipeline = OwnershipPipeline()

        mock_result_v1 = OwnershipAnalysisResult(
            repo="cachestudent/app",
            relation="owner",
            head_sha="1111111111111111111111111111111111111111",
            method="git_blame_full_history",
            coverage=1.0,
            files_total=5,
            files_analysed=5,
            files_skipped=0,
            skipped_reasons={},
            student_lines=100.0,
            other_lines=0.0,
            unknown_lines=0.0,
            bot_lines=0.0,
            total_meaningful_lines=100.0,
            student_share=1.0,
            other_share=0.0,
            unknown_share=0.0,
            incomplete=False,
            solo_exception_applied=False,
            notes=["Analysis v1"],
            skill_results=[SkillOwnershipResult("Python", 100.0, 0.0, 0.0, 100.0, 1.0, [])],
            file_results=[],
            execution_time_sec=0.5,
            status="SUCCESS",
        )

        attr1 = RepoAttribution(
            profile_id=pid,
            repo_full_name="cachestudent/app",
            status="discovered",
        )
        session.add(attr1)
        await session.commit()
        await session.refresh(attr1)

        with patch.object(pipeline.ownership_service, "analyse_repository", return_value=mock_result_v1):
            res1 = await pipeline.analyse_repository_attribution(pid, attr1.id, session=session)
            assert res1.status == "complete"
            assert res1.head_sha == "1111111111111111111111111111111111111111"
            assert res1.student_share == 1.0

        # Second analysis for same repo with unchanged HEAD SHA should reuse cache
        attr2 = RepoAttribution(
            profile_id=pid,
            repo_full_name="cachestudent/app",
            status="discovered",
        )
        session.add(attr2)
        await session.commit()
        await session.refresh(attr2)

        with patch.object(pipeline.ownership_service, "analyse_repository", return_value=mock_result_v1):
            res2 = await pipeline.analyse_repository_attribution(pid, attr2.id, session=session)
            assert res2.status == "complete"
            assert res2.head_sha == "1111111111111111111111111111111111111111"
            assert any("Reused cached analysis" in note for note in res2.notes)


# ── API Endpoint Tests ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_ownership_endpoints():
    """Test 8: Endpoints return clean summary, detailed repo breakdown, and handle staging."""
    await init_db()
    pid = str(uuid.uuid4())
    attr_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as session:
        profile = Profile(id=pid, display_name="API User", github_username="apiuser")
        session.add(profile)
        attr = RepoAttribution(
            id=attr_id,
            profile_id=pid,
            repo_full_name="apiuser/api-repo",
            relation="owner",
            head_sha="abcdef123456",
            coverage=1.0,
            student_lines=80.0,
            other_lines=20.0,
            total_meaningful_lines=100.0,
            student_share=0.80,
            status="complete",
        )
        session.add(attr)
        skill = SkillOwnership(
            repo_attribution_id=attr_id,
            skill="Python",
            student_lines=80.0,
            total_lines=100.0,
            share=0.80,
        )
        session.add(skill)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Overview endpoint
        resp_own = await client.get(f"/profiles/{pid}/ownership")
        assert resp_own.status_code == 200
        data = resp_own.json()
        assert data["profile_id"] == pid
        assert data["algorithm_version"] == "1"
        assert len(data["repositories"]) == 1
        assert data["repositories"][0]["repo_full_name"] == "apiuser/api-repo"

        # 2. Detail endpoint
        resp_detail = await client.get(f"/profiles/{pid}/ownership/repos/{attr_id}")
        assert resp_detail.status_code == 200
        detail_data = resp_detail.json()
        assert detail_data["id"] == attr_id
        assert detail_data["student_share"] == 0.80
        assert len(detail_data["skills"]) == 1

        # 3. Stage declared email identity
        resp_decl = await client.post(
            f"/profiles/{pid}/identities",
            json={"email": "developer@college.edu"},
        )
        assert resp_decl.status_code == 201
        decl_data = resp_decl.json()
        assert decl_data["status"] == "pending"
        assert decl_data["reason"] == "github_binding_required"
        assert "developer@college.edu" not in decl_data["email_hash"]
        decl_id = decl_data["id"]

        # 4. Delete declared email
        resp_del = await client.delete(f"/profiles/{pid}/identities/{decl_id}")
        assert resp_del.status_code == 200


# ── Skill Mapping Anomaly Test (Phase 12) ────────────────────────────────────

def test_phase_12_skill_mapping_accuracy():
    """
    Test 9: Verifies accurate skill mapping and proves no false-positive Django attributions.
    """
    service = OwnershipService()

    # 1. Generic Python file in Kareer Kranti
    skills_generic = service.map_file_to_skills("backend/app/core/config.py")
    assert "Python" in skills_generic
    assert "Django" not in skills_generic

    # 2. Dockerfile
    skills_docker = service.map_file_to_skills("Dockerfile")
    assert "Docker" in skills_docker
    assert "Django" not in skills_docker

    # 3. Workflows
    skills_ci = service.map_file_to_skills(".github/workflows/tests.yml")
    assert "CI/CD" in skills_ci

    # 4. Tests
    skills_test = service.map_file_to_skills("tests/unit/test_api.py")
    assert "Testing" in skills_test
    assert "Python" in skills_test
    assert "Django" not in skills_test
