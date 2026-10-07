"""
What-if simulator.

Because the scorer is a pure function, simulating hypothetical changes is trivial:
  1. Clone the current ScoreInput
  2. Add synthetic EvidenceItems representing the hypothetical action
  3. Re-run compute_score
  4. Return the delta

This powers the interactive "what if I add tests?" slider in the student UI.
"""

from copy import deepcopy
from dataclasses import dataclass
from typing import List, Optional

from app.services.scoring.scorer import (
    EvidenceItem,
    ScoreInput,
    ScoreResult,
    compute_score,
)


@dataclass
class WhatIfAction:
    """
    A hypothetical improvement the student could make.

    Examples:
      WhatIfAction(description="Add CI to top repo", skill_hints=["CI/CD"], strength=0.7,
                   source="github_repo")
    """
    description: str
    skill_hints: List[str]
    strength: float          # strength of the hypothetical new evidence
    source: str = "github_repo"


@dataclass
class WhatIfResult:
    action_description: str
    before_mid: float
    after_mid: float
    delta: float
    before_lo: float
    after_lo: float
    before_hi: float
    after_hi: float


class WhatIfSimulator:
    """
    Simulates one or more hypothetical improvements and returns score deltas.

    Usage
    -----
    simulator = WhatIfSimulator(base_input=score_input, base_result=score_result)
    results = simulator.simulate([
        WhatIfAction("Add CI", ["CI/CD", "DevOps"], strength=0.7),
        WhatIfAction("Deploy the project", ["Deployment"], strength=0.8, source="live_probe"),
    ])
    """

    def __init__(self, base_input: ScoreInput, base_result: ScoreResult):
        self.base_input = base_input
        self.base_result = base_result

    def simulate(self, actions: List[WhatIfAction]) -> List[WhatIfResult]:
        results: List[WhatIfResult] = []
        for action in actions:
            result = self._simulate_one(action)
            results.append(result)
        return results

    def _simulate_one(self, action: WhatIfAction) -> WhatIfResult:
        import uuid
        modified_input = deepcopy(self.base_input)

        # Add a synthetic EvidenceItem
        synthetic = EvidenceItem(
            id=f"whatif_{uuid.uuid4().hex[:8]}",
            skill_hints=action.skill_hints,
            strength=action.strength,
            source=action.source,
            locator={"synthetic": True, "description": action.description},
        )
        modified_input.evidence_items.append(synthetic)

        # Ensure the source is counted as supplied
        if action.source not in modified_input.supplied_sources:
            modified_input.supplied_sources.append(action.source)

        new_result = compute_score(modified_input)

        return WhatIfResult(
            action_description=action.description,
            before_mid=self.base_result.score_mid,
            after_mid=new_result.score_mid,
            delta=round(new_result.score_mid - self.base_result.score_mid, 1),
            before_lo=self.base_result.score_lo,
            after_lo=new_result.score_lo,
            before_hi=self.base_result.score_hi,
            after_hi=new_result.score_hi,
        )
