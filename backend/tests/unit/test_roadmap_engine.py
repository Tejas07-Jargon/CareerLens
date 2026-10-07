"""
Unit tests for CareerLens Personalized Roadmap Engine & roadmap.sh Reference Layer.
"""

import pytest
import uuid
from app.core.database import AsyncSessionLocal, init_db
from app.models.profile import Profile
from app.models.consent import Consent
from app.models.evidence import Evidence
from app.models.score_run import ScoreRun
from app.services.roadmap.roadmap_config import (
    OFFICIAL_ROLE_ROADMAPS,
    SKILL_ROADMAP_URLS,
    ROLE_MILESTONES,
)
from app.services.roadmap.roadmap_engine import PersonalizedRoadmapEngine
from app.services.analysis_orchestrator import AnalysisOrchestrator


def test_role_roadmap_mappings():
    """Verify all 6 primary roles + DevOps specialization map to official roadmap.sh URLs."""
    roles = [
        ("Software Engineer", "https://roadmap.sh/full-stack"),
        ("Frontend Developer", "https://roadmap.sh/frontend"),
        ("Data Scientist", "https://roadmap.sh/ai-data-scientist"),
        ("Data Analyst", "https://roadmap.sh/data-analyst"),
        ("AI Engineer", "https://roadmap.sh/ai-engineer"),
        ("UI/UX Designer", "https://roadmap.sh/ux-design"),
        ("DevOps", "https://roadmap.sh/devops"),
    ]

    for role_name, expected_url in roles:
        assert role_name in OFFICIAL_ROLE_ROADMAPS, f"Missing role: {role_name}"
        meta = OFFICIAL_ROLE_ROADMAPS[role_name]
        assert meta["primary"]["url"] == expected_url, f"Incorrect URL for {role_name}: {meta['primary']['url']}"
        assert len(meta["supporting"]) >= 2, f"Role {role_name} must have supporting roadmaps"
        assert role_name in ROLE_MILESTONES, f"Missing curated milestones for {role_name}"
        assert len(ROLE_MILESTONES[role_name]) >= 3, f"Insufficient milestones for {role_name}"


def test_skill_roadmap_mappings():
    """Verify individual skill roadmaps map to official roadmap.sh skill guides."""
    expected_skills = {
        "Python": "https://roadmap.sh/python",
        "Python for Data Analysis": "https://roadmap.sh/python-data-analysis",
        "SQL": "https://roadmap.sh/sql",
        "Java": "https://roadmap.sh/java",
        "JavaScript": "https://roadmap.sh/javascript",
        "TypeScript": "https://roadmap.sh/typescript",
        "React": "https://roadmap.sh/react",
        "Node.js": "https://roadmap.sh/nodejs",
        "Flutter": "https://roadmap.sh/flutter",
        "Machine Learning": "https://roadmap.sh/machine-learning",
        "Data Structures & Algorithms": "https://roadmap.sh/datastructures-and-algorithms",
        "Git": "https://roadmap.sh/git-github",
        "GitHub": "https://roadmap.sh/git-github",
        "Docker": "https://roadmap.sh/docker",
        "Kubernetes": "https://roadmap.sh/kubernetes",
        "AWS": "https://roadmap.sh/aws",
        "System Design": "https://roadmap.sh/system-design",
        "API Design": "https://roadmap.sh/api-design",
        "Design System": "https://roadmap.sh/design-system",
        "Linux": "https://roadmap.sh/linux",
        "MongoDB": "https://roadmap.sh/mongodb",
        "Redis": "https://roadmap.sh/redis",
    }

    for skill, expected_url in expected_skills.items():
        assert skill in SKILL_ROADMAP_URLS, f"Missing skill mapping for {skill}"
        assert SKILL_ROADMAP_URLS[skill] == expected_url, f"Incorrect skill URL for {skill}"


def test_evidence_status_determination():
    """Verify accurate evidence status labeling (STRONG, VERIFIED, MODERATE, WEAK, LIMITED EVIDENCE, MISSING, CONFLICTING)."""
    engine = PersonalizedRoadmapEngine()

    # 1. Strong evidence
    strong_claims = [{
        "skill": "Python",
        "confidence": 0.85,
        "locators": [{"repo": "org/app", "path": "main.py", "commit_sha": "abc1234"}],
    }]
    res = engine.generate_personalized_roadmap("Software Engineer", strong_claims)
    python_m = next(m for m in res["milestones"] if "Python" in m["related_skills"])
    assert python_m["status"] == "STRONG"
    assert python_m["evidence_score"] == 85.0
    assert "Strong evidence verified" in python_m["reason"]

    # 2. Moderate evidence
    mod_claims = [{
        "skill": "SQL",
        "confidence": 0.45,
        "locators": [{"repo": "org/app", "path": "schema.sql", "commit_sha": "abc1234"}],
    }]
    res = engine.generate_personalized_roadmap("Software Engineer", mod_claims)
    sql_m = next(m for m in res["milestones"] if "SQL" in m["related_skills"])
    assert sql_m["status"] == "MODERATE"

    # 3. Limited evidence (resume only claim, no repo proof)
    limited_claims = [{
        "skill": "Docker",
        "confidence": 0.20,
        "locators": [{"file": "resume.pdf", "snippet": "Docker containerization"}],
    }]
    res = engine.generate_personalized_roadmap("Software Engineer", limited_claims)
    docker_m = next(m for m in res["milestones"] if "Docker" in m["related_skills"])
    assert docker_m["status"] == "LIMITED EVIDENCE"

    # 4. Missing evidence
    res = engine.generate_personalized_roadmap("Software Engineer", [])
    k8s_m = next(m for m in res["milestones"] if "Kubernetes" in m["related_skills"])
    assert k8s_m["status"] == "MISSING"
    assert k8s_m["evidence_score"] == 0.0

    # 5. Conflicting evidence
    conflict_claims = [{
        "skill": "Git",
        "confidence": 0.70,
        "locators": [{"label": "signal for review", "detail": "Suspicious bulk commits"}],
    }]
    res = engine.generate_personalized_roadmap("Software Engineer", conflict_claims)
    git_m = next(m for m in res["milestones"] if "Git" in m["related_skills"])
    assert git_m["status"] == "CONFLICTING"


def test_next_milestone_prerequisite_awareness():
    """Verify next milestone selection is prerequisite-aware and foundational."""
    engine = PersonalizedRoadmapEngine()

    # Candidate has Python and Git strong, REST API strong, but Docker and Kubernetes are 0
    claims = [
        {"skill": "Git", "confidence": 0.85, "locators": [{"repo": "a/b", "path": "c", "commit_sha": "1"}]},
        {"skill": "Python", "confidence": 0.90, "locators": [{"repo": "a/b", "path": "c", "commit_sha": "1"}]},
        {"skill": "REST API", "confidence": 0.80, "locators": [{"repo": "a/b", "path": "c", "commit_sha": "1"}]},
        {"skill": "SQL", "confidence": 0.80, "locators": [{"repo": "a/b", "path": "c", "commit_sha": "1"}]},
    ]

    res = engine.generate_personalized_roadmap("Software Engineer", claims)
    next_m = res["next_milestone"]
    assert next_m is not None
    # Docker is a prerequisite for Kubernetes and System Design, so Docker must be recommended before Kubernetes!
    assert next_m["name"] == "Containerization (Docker)" or "Docker" in next_m["related_skills"]
    assert "swe-kubernetes" not in next_m["id"]


@pytest.mark.asyncio
async def test_roadmap_api_and_role_switching():
    """Verify /profiles/{id}/roadmap and role switching behavior."""
    await init_db()

    profile_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(
            id=profile_id,
            target_role="Software Engineer",
            status="complete",
        )
        session.add(profile)
        session.add(Consent(profile_id=profile_id, agreed_to_analysis=True))

        score_run = ScoreRun(
            profile_id=profile_id,
            input_hash="test_hash_roadmap",
            weights_version="v1",
            role="Software Engineer",
            score_mid=65.0,
            score_lo=60.0,
            score_hi=70.0,
            components={},
            credibility={"verified_ratio": 0.75, "flags": []},
            claim_statuses=[
                {"skill": "Python", "status": "Verified", "confidence": 0.88, "evidence_ids": [], "locators": [{"repo": "r", "path": "p", "commit_sha": "sha"}]},
                {"skill": "SQL", "status": "Verified", "confidence": 0.80, "evidence_ids": [], "locators": [{"repo": "r", "path": "p", "commit_sha": "sha"}]},
            ],
            role_fits=[{"role": "Software Engineer", "fit_pct": 65.0, "gap_skills": []}],
            gaps=[],
            roadmap={},
        )
        session.add(score_run)
        await session.commit()

        # Test API endpoint helper functions directly
        from app.api.routes.profiles import get_profile_roadmap, get_next_milestone, get_milestone_detail

        # 1. Base roadmap (Software Engineer)
        swe_roadmap = await get_profile_roadmap(profile_id, target_role=None, session=session)
        assert swe_roadmap["target_role"] == "Software Engineer"
        assert swe_roadmap["roadmap"]["url"] == "https://roadmap.sh/full-stack"
        assert swe_roadmap["overall_progress"] > 0
        assert swe_roadmap["is_user_selected"] is False

        # 2. Dynamic role switch to Data Scientist
        ds_roadmap = await get_profile_roadmap(profile_id, target_role="Data Scientist", session=session)
        assert ds_roadmap["target_role"] == "Data Scientist"
        assert ds_roadmap["roadmap"]["url"] == "https://roadmap.sh/ai-data-scientist"
        assert ds_roadmap["is_user_selected"] is True
        # Python and SQL should be recognized from existing claims
        python_m = next(m for m in ds_roadmap["milestones"] if "Python" in m["related_skills"])
        assert python_m["status"] == "STRONG"

        # 3. Dynamic role switch to AI Engineer
        ai_roadmap = await get_profile_roadmap(profile_id, target_role="AI Engineer", session=session)
        assert ai_roadmap["target_role"] == "AI Engineer"
        assert ai_roadmap["roadmap"]["url"] == "https://roadmap.sh/ai-engineer"

        # 4. Next milestone endpoint
        next_m = await get_next_milestone(profile_id, target_role="Software Engineer", session=session)
        assert next_m is not None
        assert "recommended_artifact" in next_m
        assert "expected_proof" in next_m

        # 5. Milestone detail endpoint
        m_detail = await get_milestone_detail(profile_id, milestone_id="swe-docker", target_role="Software Engineer", session=session)
        assert m_detail["id"] == "swe-docker"
        assert "source_url" in m_detail
        assert m_detail["source_url"] == "https://roadmap.sh/docker"


@pytest.mark.asyncio
async def test_whatif_isolation():
    """Verify that WhatIf simulation does not alter the saved ScoreRun in the database."""
    await init_db()

    profile_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        profile = Profile(id=profile_id, target_role="Software Engineer", status="complete")
        session.add(profile)
        session.add(Consent(profile_id=profile_id, agreed_to_analysis=True))

        score_run = ScoreRun(
            profile_id=profile_id,
            input_hash="hash_iso",
            weights_version="v1",
            role="Software Engineer",
            score_mid=50.0,
            score_lo=45.0,
            score_hi=55.0,
            components={},
            credibility={"verified_ratio": 0.5, "flags": []},
            claim_statuses=[{"skill": "Python", "status": "Verified", "confidence": 0.8, "evidence_ids": [], "locators": []}],
            role_fits=[],
            gaps=[],
            roadmap={},
        )
        session.add(score_run)
        await session.commit()

        # Run whatif via route function
        from app.api.routes.profiles import whatif, WhatIfRequest
        req = WhatIfRequest(actions=[{"description": "Add Docker", "skill_hints": ["Docker"], "strength": 0.8, "source": "github_repo"}])
        results = await whatif(profile_id=profile_id, body=req, session=session)

        assert len(results) == 1
        assert results[0]["action"] == "Add Docker"

        # Ensure DB ScoreRun was not changed
        from sqlalchemy import select
        db_sr = (await session.execute(select(ScoreRun).where(ScoreRun.profile_id == profile_id))).scalar_one()
        assert db_sr.score_mid == 50.0
        assert db_sr.score_lo == 45.0
        assert db_sr.score_hi == 55.0
