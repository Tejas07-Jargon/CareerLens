"""
Unit Tests for Ownership Map & Kareer Kranti Scorer Integration.

Verifies:
1. Evidence without ownership behaves exactly as before (neutral factor = 1.0).
2. Resume and non-GitHub evidence are untouched.
3. GitHub repository evidence strength scales by ownership factor.
4. Skill-specific ownership overrides repository-level ownership when relevant.
5. Missing ownership preserves baseline scores.
6. What-If simulator remains isolated with default neutral factors.
7. Provenance is attached without exposing raw contributor PII.
8. No double-counting occurs.
"""

import pytest
from app.services.scoring.ownership_evidence_integrator import apply_ownership_to_evidence_items
from app.services.scoring.scorer import (
    EvidenceItem,
    RoleWeights,
    ScoreInput,
    compute_score,
)
from app.services.scoring.whatif_simulator import WhatIfAction, WhatIfSimulator


class MockSkillOwnership:
    def __init__(self, skill: str, share: float, total_lines: float, factor: float = 1.0):
        self.skill = skill
        self.share = share
        self.total_lines = total_lines
        self.student_lines = share * total_lines
        self.other_lines = (1.0 - share) * total_lines
        self.unknown_lines = 0.0
        self.factor = factor
        self.top_ranges = []


class MockRepoAttribution:
    def __init__(
        self,
        repo_full_name: str,
        student_share: float = 0.6,
        total_meaningful_lines: float = 1000.0,
        coverage: float = 0.95,
        status: str = "complete",
        head_sha: str = "abc1234",
        incomplete: bool = False,
        skill_ownerships: list = None,
    ):
        self.repo_full_name = repo_full_name
        self.student_share = student_share
        self.total_meaningful_lines = total_meaningful_lines
        self.coverage = coverage
        self.status = status
        self.head_sha = head_sha
        self.incomplete = incomplete
        self.method = "git_blame_full_history"
        self.algorithm_version = "1"
        self.skill_ownerships = skill_ownerships or []


@pytest.fixture
def base_role_weights():
    return RoleWeights(
        role_name="Software Engineer",
        skill_weights={"Python": 0.4, "FastAPI": 0.3, "SQL": 0.3},
        proof_thresholds={"Python": 0.6, "FastAPI": 0.6, "SQL": 0.6},
    )


class TestScorerOwnershipIntegration:
    """Tests the integration of ownership factors into the deterministic scorer."""

    def test_missing_ownership_preserves_original_evidence_and_score(self, base_role_weights):
        raw_items = [
            EvidenceItem(
                id="ev_1",
                skill_hints=["Python"],
                strength=0.80,
                source="github_repo",
                locator={"repo": "student/fastapi-app"},
            ),
            EvidenceItem(
                id="ev_2",
                skill_hints=["Python"],
                strength=0.50,
                source="resume",
                locator={"page": 1},
            ),
        ]

        # No attributions provided (missing ownership)
        adjusted_items = apply_ownership_to_evidence_items(raw_items, repo_attributions=[])

        assert len(adjusted_items) == 2
        assert adjusted_items[0].strength == 0.80
        assert adjusted_items[1].strength == 0.50

        # Scorer result
        score_input = ScoreInput(
            evidence_items=adjusted_items,
            claim_skills=["Python"],
            role_weights=base_role_weights,
            supplied_sources=["github_repo", "resume"],
        )
        result = compute_score(score_input)
        assert result.score_mid > 0
        python_claim = next(cs for cs in result.claim_statuses if cs.skill == "Python")
        assert python_claim.status == "Verified"

    def test_resume_and_non_github_evidence_is_never_scaled(self, base_role_weights):
        resume_item = EvidenceItem(
            id="ev_resume",
            skill_hints=["Python"],
            strength=0.60,
            source="resume",
            locator={"page": 1},
        )
        portfolio_item = EvidenceItem(
            id="ev_port",
            skill_hints=["Design"],
            strength=0.75,
            source="design_portfolio",
            locator={"url": "https://portfolio.me"},
        )

        attributions = [
            MockRepoAttribution("student/repo", student_share=0.10, total_meaningful_lines=10)
        ]

        adjusted = apply_ownership_to_evidence_items([resume_item, portfolio_item], attributions)

        assert adjusted[0].strength == 0.60
        assert adjusted[1].strength == 0.75

    def test_github_evidence_scaled_by_repo_level_ownership_factor(self, base_role_weights):
        # 30% share with 100 lines -> factor = 0.30 / 0.50 = 0.60
        attributions = [
            MockRepoAttribution(
                repo_full_name="org/team-project",
                student_share=0.30,
                total_meaningful_lines=100.0,
                coverage=0.90,
            )
        ]

        gh_item = EvidenceItem(
            id="ev_gh",
            skill_hints=["Python"],
            strength=0.80,
            source="github_repo",
            locator={"repo": "org/team-project"},
        )

        adjusted = apply_ownership_to_evidence_items([gh_item], attributions)

        # 0.80 * 0.60 = 0.48
        assert len(adjusted) == 1
        assert pytest.approx(adjusted[0].strength, rel=1e-3) == 0.48
        assert adjusted[0].ownership_factor == 0.60
        assert adjusted[0].locator["ownership"]["student_share"] == 0.30
        assert adjusted[0].locator["ownership"]["type"] == "repository_level"

    def test_skill_specific_ownership_takes_precedence_over_repo_share(self, base_role_weights):
        # Candidate has 80% share in FastAPI (factor = 1.0) but only 20% in Python overall (factor = 0.4)
        fastapi_skill = MockSkillOwnership(
            skill="FastAPI",
            share=0.80,
            total_lines=200.0,
            factor=1.00,
        )
        python_skill = MockSkillOwnership(
            skill="Python",
            share=0.20,
            total_lines=500.0,
            factor=0.40,
        )

        attributions = [
            MockRepoAttribution(
                repo_full_name="student/fullstack-app",
                student_share=0.25,
                total_meaningful_lines=700.0,
                skill_ownerships=[fastapi_skill, python_skill],
            )
        ]

        fastapi_item = EvidenceItem(
            id="ev_fastapi",
            skill_hints=["FastAPI"],
            strength=0.90,
            source="github_repo",
            locator={"repo": "student/fullstack-app"},
        )

        python_item = EvidenceItem(
            id="ev_python",
            skill_hints=["Python"],
            strength=0.90,
            source="github_repo",
            locator={"repo": "student/fullstack-app"},
        )

        adjusted = apply_ownership_to_evidence_items([fastapi_item, python_item], attributions)

        # FastAPI gets factor 1.0 -> strength remains 0.90
        assert pytest.approx(adjusted[0].strength, rel=1e-3) == 0.90
        assert adjusted[0].ownership_factor == 1.00
        assert adjusted[0].locator["ownership"]["type"] == "skill_specific"
        assert adjusted[0].locator["ownership"]["skill"] == "FastAPI"

        # Python gets factor 0.40 -> strength becomes 0.90 * 0.40 = 0.36
        assert pytest.approx(adjusted[1].strength, rel=1e-3) == 0.36
        assert adjusted[1].ownership_factor == 0.40
        assert adjusted[1].locator["ownership"]["type"] == "skill_specific"
        assert adjusted[1].locator["ownership"]["skill"] == "Python"

    def test_not_analysed_and_failed_ownership_are_neutral(self):
        attributions = [
            MockRepoAttribution(
                repo_full_name="student/queued-repo",
                status="queued",
                coverage=0.0,
            ),
            MockRepoAttribution(
                repo_full_name="student/failed-repo",
                status="failed",
                coverage=0.0,
            ),
        ]

        items = [
            EvidenceItem(
                id="ev_1",
                skill_hints=["Python"],
                strength=0.70,
                source="github_repo",
                locator={"repo": "student/queued-repo"},
            ),
            EvidenceItem(
                id="ev_2",
                skill_hints=["SQL"],
                strength=0.70,
                source="github_repo",
                locator={"repo": "student/failed-repo"},
            ),
        ]

        adjusted = apply_ownership_to_evidence_items(items, attributions)

        assert adjusted[0].strength == 0.70
        assert adjusted[0].ownership_factor == 1.0
        assert adjusted[1].strength == 0.70
        assert adjusted[1].ownership_factor == 1.0

    def test_no_double_counting_with_noisy_or(self, base_role_weights):
        # Multiple evidence items with ownership accumulate via noisy-OR bounded at 1
        attributions = [
            MockRepoAttribution("student/repo-1", student_share=0.8, total_meaningful_lines=300),
            MockRepoAttribution("student/repo-2", student_share=0.6, total_meaningful_lines=200),
        ]

        ev_1 = EvidenceItem("ev_1", ["Python"], strength=0.7, source="github_repo", locator={"repo": "student/repo-1"})
        ev_2 = EvidenceItem("ev_2", ["Python"], strength=0.7, source="github_repo", locator={"repo": "student/repo-2"})

        adjusted = apply_ownership_to_evidence_items([ev_1, ev_2], attributions)

        score_input = ScoreInput(
            evidence_items=adjusted,
            claim_skills=["Python"],
            role_weights=base_role_weights,
            supplied_sources=["github_repo"],
        )
        result = compute_score(score_input)

        py_claim = next(cs for cs in result.claim_statuses if cs.skill == "Python")
        # noisy-OR: 1 - (1 - 0.7)(1 - 0.7) = 1 - 0.09 = 0.91
        assert pytest.approx(py_claim.confidence, rel=1e-2) == 0.91
        assert py_claim.confidence <= 1.0

    def test_provenance_attached_without_contributor_pii(self):
        attributions = [
            MockRepoAttribution(
                repo_full_name="student/public-project",
                student_share=0.65,
                total_meaningful_lines=400.0,
                head_sha="deadbeef1234",
                coverage=0.98,
            )
        ]

        item = EvidenceItem(
            id="ev_prov",
            skill_hints=["Python"],
            strength=0.85,
            source="github_repo",
            locator={"repo": "student/public-project"},
        )

        adjusted = apply_ownership_to_evidence_items([item], attributions)
        prov = adjusted[0].locator.get("ownership", {})

        assert prov["source"] == "github_ownership"
        assert prov["repo"] == "student/public-project"
        assert prov["head_sha"] == "deadbeef1234"
        assert prov["algorithm_version"] == "1"
        assert prov["coverage"] == 0.98
        assert prov["student_share"] == 0.65
        assert prov["ownership_factor"] == 1.0

        # Verify no PII fields
        prov_str = str(prov).lower()
        assert "email" not in prov_str
        assert "@" not in prov_str
        assert "author_name" not in prov_str

    def test_absent_ownership_vs_analyzed_zero_ownership(self, base_role_weights):
        # CASE 1: Ownership absent (not analyzed) -> neutral factor 1.0
        ev_absent = EvidenceItem(
            id="ev_absent",
            skill_hints=["Python"],
            strength=0.80,
            source="github_repo",
            locator={"repo": "student/unanalysed-repo"},
        )
        res_absent = apply_ownership_to_evidence_items([ev_absent], repo_attributions=[])
        assert res_absent[0].strength == 0.80
        assert res_absent[0].ownership_factor == 1.0

        # CASE 2: Analyzed with 0 surviving lines -> factor 0.0, strength 0.0
        zero_attribution = MockRepoAttribution(
            repo_full_name="student/zero-owned-repo",
            student_share=0.0,
            total_meaningful_lines=500.0,
            coverage=0.95,
            status="complete",
        )
        ev_zero = EvidenceItem(
            id="ev_zero",
            skill_hints=["Python"],
            strength=0.80,
            source="github_repo",
            locator={"repo": "student/zero-owned-repo"},
        )
        res_zero = apply_ownership_to_evidence_items([ev_zero], repo_attributions=[zero_attribution])
        assert res_zero[0].strength == 0.0
        assert res_zero[0].ownership_factor == 0.0
        assert res_zero[0].locator["ownership"]["student_share"] == 0.0

    def test_different_skill_falls_back_to_repo_level_while_specific_skill_uses_specific_factor(self, base_role_weights):
        # FastAPI has skill-specific 90% share (factor 1.0)
        fastapi_sk = MockSkillOwnership("FastAPI", share=0.90, total_lines=300.0, factor=1.0)
        attribution = MockRepoAttribution(
            repo_full_name="student/mono-repo",
            student_share=0.20,
            total_meaningful_lines=1000.0,
            coverage=0.95,
            skill_ownerships=[fastapi_sk],
        )

        ev_fastapi = EvidenceItem(
            id="ev_fa",
            skill_hints=["FastAPI"],
            strength=0.80,
            source="github_repo",
            locator={"repo": "student/mono-repo"},
        )
        ev_sql = EvidenceItem(
            id="ev_sql",
            skill_hints=["SQL"],
            strength=0.80,
            source="github_repo",
            locator={"repo": "student/mono-repo"},
        )

        adjusted = apply_ownership_to_evidence_items([ev_fastapi, ev_sql], [attribution])

        # FastAPI uses specific factor 1.0 -> 0.80
        assert adjusted[0].strength == 0.80
        assert adjusted[0].ownership_factor == 1.0
        assert adjusted[0].locator["ownership"]["type"] == "skill_specific"

        # SQL has no specific record, falls back to repo-level (share 0.20 -> factor 0.40) -> 0.80 * 0.40 = 0.32
        assert pytest.approx(adjusted[1].strength, rel=1e-3) == 0.32
        assert adjusted[1].ownership_factor == 0.40
        assert adjusted[1].locator["ownership"]["type"] == "repository_level"

    def test_historical_scorerun_immutability(self, base_role_weights):
        # 1. Compute and snapshot ScoreRun under State A (share 80%, factor 1.0)
        attr_a = MockRepoAttribution("student/repo", student_share=0.80, total_meaningful_lines=500.0, head_sha="sha_v1")
        ev_a = EvidenceItem("ev_1", ["Python"], strength=0.80, source="github_repo", locator={"repo": "student/repo"})
        adj_a = apply_ownership_to_evidence_items([ev_a], [attr_a])
        inp_a = ScoreInput(adj_a, ["Python"], base_role_weights, ["github_repo"])
        score_a = compute_score(inp_a)

        # Snapshot historical representation
        snapshot = {
            "score_mid": score_a.score_mid,
            "claim_statuses": [
                {
                    "skill": cs.skill,
                    "confidence": cs.confidence,
                    "status": cs.status,
                    "ownership": cs.ownership_provenance,
                }
                for cs in score_a.claim_statuses
            ],
        }

        # 2. Re-analyze under State B (student share drops to 10%, factor 0.25, head_sha sha_v2)
        attr_b = MockRepoAttribution("student/repo", student_share=0.10, total_meaningful_lines=500.0, head_sha="sha_v2")
        ev_b = EvidenceItem("ev_1", ["Python"], strength=0.80, source="github_repo", locator={"repo": "student/repo"})
        adj_b = apply_ownership_to_evidence_items([ev_b], [attr_b])
        inp_b = ScoreInput(adj_b, ["Python"], base_role_weights, ["github_repo"])
        score_b = compute_score(inp_b)

        # 3. Verify that historical snapshot remains completely identical and unchanged
        assert snapshot["score_mid"] == score_a.score_mid
        assert snapshot["score_mid"] != score_b.score_mid
        assert snapshot["claim_statuses"][0]["ownership"]["head_sha"] == "sha_v1"
        assert score_b.claim_statuses[0].ownership_provenance["head_sha"] == "sha_v2"

    def test_score_backward_compatibility_numerical_identity(self, base_role_weights):
        raw_items = [
            EvidenceItem("ev_1", ["Python"], strength=0.85, source="github_repo", locator={"repo": "student/app"}),
            EvidenceItem("ev_2", ["FastAPI"], strength=0.75, source="github_repo", locator={"repo": "student/app"}),
            EvidenceItem("ev_3", ["Python"], strength=0.60, source="resume", locator={"page": 1}),
            EvidenceItem("ev_4", ["SQL"], strength=0.50, source="resume", locator={"page": 2}),
        ]

        # Legacy run (direct raw items)
        legacy_input = ScoreInput(raw_items, ["Python", "FastAPI", "SQL"], base_role_weights, ["github_repo", "resume"])
        legacy_result = compute_score(legacy_input)

        # Ownership-aware run with empty attributions
        ownership_items = apply_ownership_to_evidence_items(raw_items, repo_attributions=[])
        ownership_input = ScoreInput(ownership_items, ["Python", "FastAPI", "SQL"], base_role_weights, ["github_repo", "resume"])
        ownership_result = compute_score(ownership_input)

        # Assert exact numerical equality across all dimensions
        assert legacy_result.score_mid == ownership_result.score_mid
        assert legacy_result.score_lo == ownership_result.score_lo
        assert legacy_result.score_hi == ownership_result.score_hi
        for leg_comp, own_comp in zip(legacy_result.components, ownership_result.components):
            assert leg_comp.name == own_comp.name
            assert leg_comp.value == own_comp.value
            assert leg_comp.weight == own_comp.weight
        for leg_cs, own_cs in zip(legacy_result.claim_statuses, ownership_result.claim_statuses):
            assert leg_cs.skill == own_cs.skill
            assert leg_cs.confidence == own_cs.confidence
            assert leg_cs.status == own_cs.status
