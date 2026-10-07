"""
Unit tests for the What-If Simulator.
"""

from app.services.scoring.scorer import (
    EvidenceItem,
    RoleWeights,
    ScoreInput,
    compute_score,
)
from app.services.scoring.whatif_simulator import WhatIfAction, WhatIfSimulator


def test_whatif_simulator_deterministic_and_isolated():
    role_weights = RoleWeights(
        role_name="Software Engineer",
        skill_weights={"Python": 0.8, "Testing": 1.0, "Docker": 1.0, "CI/CD": 0.6},
        proof_thresholds={"Python": 0.6, "Testing": 0.6, "Docker": 0.6, "CI/CD": 0.6},
    )

    base_evidence = [
        EvidenceItem(
            id="ev_python",
            skill_hints=["Python"],
            strength=0.8,
            source="github_repo",
            locator={"repo": "test/python-app", "path": "main.py", "commit_sha": "abc1234"},
        )
    ]

    base_input = ScoreInput(
        evidence_items=base_evidence,
        claim_skills=["Python", "Testing", "Docker"],
        role_weights=role_weights,
        supplied_sources=["github_repo", "resume"],
    )

    base_result = compute_score(base_input)
    assert base_result.score_mid > 0

    simulator = WhatIfSimulator(base_input=base_input, base_result=base_result)

    actions = [
        WhatIfAction("Add unit testing suite", ["Testing"], strength=0.75, source="github_repo"),
        WhatIfAction("Add Docker containerization", ["Docker"], strength=0.70, source="github_repo"),
        WhatIfAction("Add CI/CD pipeline", ["CI/CD"], strength=0.80, source="github_repo"),
    ]

    results1 = simulator.simulate(actions)
    results2 = simulator.simulate(actions)

    # 1. Verification of positive delta
    for res in results1:
        assert res.delta > 0, f"Action {res.action_description} had non-positive delta"
        assert res.after_mid > res.before_mid

    # 2. Verification of strict determinism
    for r1, r2 in zip(results1, results2):
        assert r1.delta == r2.delta
        assert r1.after_mid == r2.after_mid

    # 3. Verification of isolation (original base evidence list was not modified)
    assert len(base_input.evidence_items) == 1
    assert base_input.evidence_items[0].id == "ev_python"
