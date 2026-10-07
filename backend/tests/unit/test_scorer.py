"""
Unit tests for the pure-function scorer.

These tests have zero external dependencies (no DB, no LLM, no network).
They run in milliseconds and should all pass before any demo.
"""

import pytest

from app.services.scoring.scorer import (
    ClaimStatus,
    ComponentScore,
    EvidenceItem,
    RoleWeights,
    ScoreInput,
    compute_score,
    noisy_or,
    compute_claim_confidence,
    skill_coverage,
    VERIFIED_THRESHOLD,
    PARTIAL_THRESHOLD,
)


# ── noisy_or ──────────────────────────────────────────────────────────────────

def test_noisy_or_empty():
    assert noisy_or([]) == 0.0


def test_noisy_or_single_strong():
    result = noisy_or([0.9])
    assert abs(result - 0.9) < 1e-6


def test_noisy_or_two_independent():
    # e = 1 - (1 - 0.5)(1 - 0.5) = 0.75
    result = noisy_or([0.5, 0.5])
    assert abs(result - 0.75) < 1e-6


def test_noisy_or_bounded_at_one():
    result = noisy_or([1.0, 1.0, 1.0])
    assert result == pytest.approx(1.0, abs=1e-6)


def test_noisy_or_clamps_negative():
    # Strength should never be negative, but guard anyway
    result = noisy_or([-0.1])
    assert result >= 0.0


# ── claim confidence ──────────────────────────────────────────────────────────

def _make_ev(skill: str, strength: float, source: str = "github_repo") -> EvidenceItem:
    return EvidenceItem(
        id=f"ev_{skill}_{strength}",
        skill_hints=[skill],
        strength=strength,
        source=source,
    )


def test_claim_confidence_no_evidence():
    conf, ev_ids, _ = compute_claim_confidence("Python", [])
    assert conf == 0.0
    assert ev_ids == []


def test_claim_confidence_single_strong():
    ev = _make_ev("Python", 0.9)
    conf, ev_ids, _ = compute_claim_confidence("Python", [ev])
    assert abs(conf - 0.9) < 1e-6
    assert ev.id in ev_ids


def test_claim_confidence_multiple_items_accumulate():
    evs = [_make_ev("Python", 0.5), _make_ev("Python", 0.5)]
    conf, _, _ = compute_claim_confidence("Python", evs)
    assert conf > 0.5  # should be higher than any single item


def test_claim_confidence_unrelated_skill_ignored():
    ev = _make_ev("JavaScript", 0.9)
    conf, _, _ = compute_claim_confidence("Python", [ev])
    assert conf == 0.0


# ── skill_coverage ────────────────────────────────────────────────────────────

def _make_claim_status(skill: str, conf: float) -> ClaimStatus:
    if conf >= VERIFIED_THRESHOLD:
        status = "Verified"
    elif conf >= PARTIAL_THRESHOLD:
        status = "Partial"
    else:
        status = "Not yet evidenced"
    return ClaimStatus(skill=skill, confidence=conf, status=status)


def test_skill_coverage_perfect():
    role = RoleWeights(
        role_name="test",
        skill_weights={"Python": 1.0},
        proof_thresholds={"Python": 0.3},
    )
    claim_statuses = [_make_claim_status("Python", 0.9)]
    cov, _ = skill_coverage(claim_statuses, role)
    assert cov == pytest.approx(1.0, abs=0.01)


def test_skill_coverage_zero():
    role = RoleWeights(
        role_name="test",
        skill_weights={"Python": 1.0},
        proof_thresholds={"Python": 0.6},
    )
    claim_statuses = [_make_claim_status("Python", 0.0)]
    cov, _ = skill_coverage(claim_statuses, role)
    assert cov == 0.0


def test_skill_coverage_empty_role():
    role = RoleWeights(role_name="test", skill_weights={}, proof_thresholds={})
    cov, _ = skill_coverage([], role)
    assert cov == 0.0


# ── compute_score integration ─────────────────────────────────────────────────

def _build_score_input(
    evidence_items=None,
    claim_skills=None,
    supplied_sources=None,
) -> ScoreInput:
    return ScoreInput(
        evidence_items=evidence_items or [],
        claim_skills=claim_skills or [],
        role_weights=RoleWeights(
            role_name="Software Engineer",
            skill_weights={"Python": 0.8, "Git": 0.6, "Testing": 0.5},
            proof_thresholds={"Python": 0.6, "Git": 0.3, "Testing": 0.3},
        ),
        supplied_sources=supplied_sources or [],
    )


def test_compute_score_empty_returns_valid_result():
    result = compute_score(_build_score_input())
    assert 0 <= result.score_mid <= 100
    assert result.score_lo <= result.score_mid <= result.score_hi


def test_compute_score_strong_evidence_higher_than_weak():
    strong_ev = [_make_ev("Python", 0.9), _make_ev("Git", 0.8), _make_ev("Testing", 0.7)]
    weak_ev = [_make_ev("Python", 0.1), _make_ev("Git", 0.1)]

    strong_result = compute_score(_build_score_input(strong_ev, ["Python", "Git", "Testing"], ["github_repo"]))
    weak_result = compute_score(_build_score_input(weak_ev, ["Python", "Git"], ["resume"]))

    assert strong_result.score_mid > weak_result.score_mid


def test_compute_score_interval_widens_without_sources():
    ev = [_make_ev("Python", 0.8)]
    with_sources = compute_score(_build_score_input(ev, ["Python"], ["github_repo", "github_calendar", "design_portfolio"]))
    without_sources = compute_score(_build_score_input(ev, ["Python"], []))

    # Interval should be narrower when more sources are supplied
    with_width = with_sources.score_hi - with_sources.score_lo
    without_width = without_sources.score_hi - without_sources.score_lo
    assert without_width >= with_width


def test_compute_score_gap_sorted_by_priority():
    ev = [_make_ev("Python", 0.9)]
    result = compute_score(_build_score_input(ev, ["Python"], ["github_repo"]))
    gaps = result.gaps
    if len(gaps) > 1:
        assert gaps[0]["priority_score"] >= gaps[1]["priority_score"]


def test_claim_status_verified_when_strong():
    ev = [_make_ev("Python", 0.9)]
    result = compute_score(_build_score_input(ev, ["Python"], ["github_repo"]))
    python_status = next((cs for cs in result.claim_statuses if cs.skill == "Python"), None)
    assert python_status is not None
    assert python_status.status == "Verified"


def test_claim_status_not_evidenced_for_injected_fake_skill():
    """Core validity: fake skills with no evidence must be 'Not yet evidenced'."""
    ev = [_make_ev("Python", 0.9)]
    # Include a fake skill in claims but no evidence for it
    result = compute_score(_build_score_input(ev, ["Python", "QuantumSQL"], ["github_repo"]))
    fake_status = next((cs for cs in result.claim_statuses if cs.skill == "QuantumSQL"), None)
    assert fake_status is not None
    assert fake_status.status == "Not yet evidenced"
