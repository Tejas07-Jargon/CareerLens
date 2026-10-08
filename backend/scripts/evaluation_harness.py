"""
Evaluation harness.

Two validity checks:
  1. Claim injection test
     Inject 3 fake skills into real-ish resume texts.
     Measure what fraction the system correctly marks "Not yet evidenced"
     despite the keywords appearing in the resume.
     Target: >= 70% detection rate.

  2. Rank correlation
     Given human-labelled profiles (ground-truth seniority 1–5),
     compute Spearman's rank correlation with Kareer Kranti scores.
     Target: rho >= 0.65.
"""

import json
import random
import sys
from pathlib import Path
from typing import List, Tuple

import structlog
from scipy.stats import spearmanr

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.scoring.scorer import (
    DEFAULT_COMPONENT_WEIGHTS,
    EvidenceItem,
    RoleWeights,
    ScoreInput,
    ScoreResult,
    compute_score,
)

log = structlog.get_logger(__name__)

FIXTURES_PATH = Path(__file__).parent.parent / "tests" / "fixtures"
INJECTED_SKILLS = ["QuantumSQL", "HyperReact", "DeepScaffold"]  # fake skills


def _load_evidence_from_seed(profile_data: dict) -> List[EvidenceItem]:
    """Construct EvidenceItems from a seed profile JSON."""
    items = []
    for ev in profile_data.get("evidence", []):
        items.append(
            EvidenceItem(
                id=ev["id"],
                skill_hints=ev.get("skill_hints", []),
                strength=ev.get("strength", 0.5),
                source=ev.get("source", "github_repo"),
                locator=ev.get("locator", {}),
            )
        )
    return items


def _get_test_profiles(n_profiles: int = 30) -> List[dict]:
    """Load profiles from data/seed_profiles or fallback to labelled_profiles.json."""
    seed_profiles_path = Path(__file__).parent.parent.parent / "data" / "seed_profiles"
    seed_files = list(seed_profiles_path.glob("*.json"))[:n_profiles] if seed_profiles_path.exists() else []

    if seed_files:
        return [json.loads(f.read_text(encoding="utf-8")) for f in seed_files]

    labelled_path = FIXTURES_PATH / "labelled_profiles.json"
    if labelled_path.exists():
        return json.loads(labelled_path.read_text(encoding="utf-8"))

    return []


# ── Claim injection test ───────────────────────────────────────────────────────

def run_claim_injection_test(n_profiles: int = 30) -> dict:
    """
    Loads seed profiles, injects fake skills into their resume text,
    runs the scorer (no GitHub), and checks the claim status.
    Returns {detection_rate, total_injected, detected_as_unevidenced}.
    """
    profiles = _get_test_profiles(n_profiles)

    if not profiles:
        log.warning("No seed profiles found")
        return {"detection_rate": 0.0, "total_injected": 0, "detected": 0}

    total_injected = 0
    detected = 0

    for profile_data in profiles:
        # Inject fake skills as resume_claim evidence
        injected_evidence = [
            EvidenceItem(
                id=f"injected_{skill}",
                skill_hints=[skill],
                strength=0.18,  # resume_claim strength without corroboration: ~0.18
                source="resume",
                locator={"injected": True, "skill": skill},
            )
            for skill in INJECTED_SKILLS
        ]
        total_injected += len(INJECTED_SKILLS)

        # Build score input from the seed profile + injected evidence
        base_evidence = _load_evidence_from_seed(profile_data)
        all_evidence = base_evidence + injected_evidence

        score_input = ScoreInput(
            evidence_items=all_evidence,
            claim_skills=INJECTED_SKILLS + profile_data.get("claim_skills", []),
            role_weights=RoleWeights(
                role_name="Software Engineer",
                skill_weights={},
                proof_thresholds={},
            ),
            supplied_sources=profile_data.get("supplied_sources", ["resume"]),
        )

        result = compute_score(score_input)

        # Count injected skills marked as "Not yet evidenced"
        for cs in result.claim_statuses:
            if cs.skill in INJECTED_SKILLS and cs.status == "Not yet evidenced":
                detected += 1

    detection_rate = detected / max(total_injected, 1)
    log.info(
        "Claim injection test complete",
        detection_rate=f"{detection_rate:.1%}",
        total_injected=total_injected,
        detected=detected,
    )
    return {
        "detection_rate": round(detection_rate, 3),
        "total_injected": total_injected,
        "detected": detected,
    }


# ── Rank correlation test ─────────────────────────────────────────────────────

def run_rank_correlation_test() -> dict:
    """
    Loads human-labelled profiles and computes Spearman's rho
    between Kareer Kranti score_mid and human seniority labels.
    """
    labelled_path = FIXTURES_PATH / "labelled_profiles.json"
    if not labelled_path.exists():
        log.warning("Labelled profiles not found", path=str(labelled_path))
        return {"spearman_rho": None, "n_profiles": 0}

    labelled = json.loads(labelled_path.read_text(encoding="utf-8"))
    human_ranks = []
    system_scores = []

    for entry in labelled:
        evidence = _load_evidence_from_seed(entry)
        score_input = ScoreInput(
            evidence_items=evidence,
            claim_skills=entry.get("claim_skills", []),
            role_weights=RoleWeights(
                role_name="Software Engineer",
                skill_weights={},
                proof_thresholds={},
            ),
            supplied_sources=entry.get("supplied_sources", ["resume", "github_repo"]),
        )
        result = compute_score(score_input)
        human_ranks.append(entry["human_seniority"])  # 1–5
        system_scores.append(result.score_mid)

    if len(human_ranks) < 2:
        return {"spearman_rho": None, "n_profiles": len(human_ranks)}

    rho, p_value = spearmanr(human_ranks, system_scores)
    log.info("Rank correlation test complete", rho=round(float(rho), 3), p=round(float(p_value), 4))
    return {
        "spearman_rho": round(float(rho), 3),
        "p_value": round(float(p_value), 4),
        "n_profiles": len(human_ranks),
    }


# ── Weight sensitivity test ───────────────────────────────────────────────────

def run_weight_sensitivity_test(
    perturbation: float = 0.2,
    n_profiles: int = 20,
) -> dict:
    """
    Perturb component weights +-20% and report how often score remains stable.
    """
    profiles = _get_test_profiles(n_profiles)

    if not profiles:
        return {"stable_ratio": None, "n_profiles": 0}

    stable = 0
    total = 0

    for profile_data in profiles:
        evidence = _load_evidence_from_seed(profile_data)

        base_rw = RoleWeights(
            role_name="Software Engineer",
            skill_weights={},
            proof_thresholds={},
        )
        base_input = ScoreInput(
            evidence_items=evidence,
            claim_skills=profile_data.get("claim_skills", []),
            role_weights=base_rw,
            supplied_sources=profile_data.get("supplied_sources", ["resume"]),
        )
        base_score = compute_score(base_input).score_mid

        for comp_name in DEFAULT_COMPONENT_WEIGHTS:
            for direction in [1 + perturbation, 1 - perturbation]:
                perturbed_overrides = {comp_name: DEFAULT_COMPONENT_WEIGHTS[comp_name] * direction}
                perturbed_rw = RoleWeights(
                    role_name="Software Engineer",
                    skill_weights={},
                    proof_thresholds={},
                    component_weight_overrides=perturbed_overrides,
                )
                perturbed_input = ScoreInput(
                    evidence_items=evidence,
                    claim_skills=profile_data.get("claim_skills", []),
                    role_weights=perturbed_rw,
                    supplied_sources=profile_data.get("supplied_sources", ["resume"]),
                )
                perturbed_score = compute_score(perturbed_input).score_mid
                total += 1
                if abs(perturbed_score - base_score) < 5:
                    stable += 1

    stable_ratio = stable / max(total, 1)
    log.info("Weight sensitivity test complete", stable_ratio=f"{stable_ratio:.1%}")
    return {"stable_ratio": round(stable_ratio, 3), "n_tests": total}


if __name__ == "__main__":
    print("=== Claim Injection Test ===")
    print(json.dumps(run_claim_injection_test(), indent=2))
    print("\n=== Rank Correlation Test ===")
    print(json.dumps(run_rank_correlation_test(), indent=2))
    print("\n=== Weight Sensitivity Test ===")
    print(json.dumps(run_weight_sensitivity_test(), indent=2))
