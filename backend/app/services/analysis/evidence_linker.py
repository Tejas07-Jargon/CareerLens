"""
Evidence linker.

Builds Claim ↔ Evidence edges.

Algorithm
─────────
For each skill claimed in any Evidence record:
  - Find all Evidence records whose skill_hints contain the same normalised skill
  - Create a ClaimEvidence edge with:
      relation = 'supports'  if the evidence directly demonstrates the skill
      relation = 'weak'      if the evidence is tangential
      relation = 'contradicts'  (reserved for future authorship signals)
  - Weight = evidence.strength (the product of the four strength inputs)

The linker also applies the authenticity penalty:
  If a skill is in a resume_claim but has NO supporting GitHub/portfolio evidence,
  the resume Evidence record gets authenticity lowered to 0.5 (not zero — the student
  may simply not have uploaded all sources yet).
"""

from typing import List

import structlog

from app.models.evidence import ClaimEvidence, Evidence
from app.services.analysis.skill_normaliser import SkillNormaliser

log = structlog.get_logger(__name__)

# Sources considered "proof of work" (higher weight)
PROOF_SOURCES = {"github_repo", "design_portfolio", "live_probe", "github_calendar"}
# Self-reported sources (lower weight as sole evidence)
SELF_REPORTED_SOURCES = {"resume", "linkedin_pdf"}


class EvidenceLinker:
    """
    Links Evidence records to claims and writes ClaimEvidence edges.

    Usage
    -----
    linker = EvidenceLinker()
    edges = linker.link(evidence_list)
    """

    def __init__(self):
        self.normaliser = SkillNormaliser()

    def link(self, evidence_list: List[Evidence]) -> List[ClaimEvidence]:
        """
        Returns a list of ClaimEvidence edges (not yet persisted).
        Also mutates authenticity on resume records that lack corroboration.
        """
        # Build an index: normalised_skill → [evidence]
        skill_to_evidence: dict[str, List[Evidence]] = {}
        for ev in evidence_list:
            for raw_skill in ev.skill_hints:
                canonical = self.normaliser.normalise(raw_skill)
                skill_to_evidence.setdefault(canonical, []).append(ev)

        edges: List[ClaimEvidence] = []

        for skill, evs in skill_to_evidence.items():
            proof_evs = [e for e in evs if e.source in PROOF_SOURCES]
            claim_evs = [e for e in evs if e.source in SELF_REPORTED_SOURCES]

            # If a claim has no proof, penalise authenticity on the claim record
            if claim_evs and not proof_evs:
                for ev in claim_evs:
                    log.debug("No proof found for claim", skill=skill, source=ev.source)
                    ev.authenticity = min(ev.authenticity, 0.5)

            for ev in evs:
                relation = "supports" if ev.source in PROOF_SOURCES else "weak"
                edges.append(
                    ClaimEvidence(
                        claim_skill=skill,
                        evidence_id=ev.id,
                        relation=relation,
                        weight=ev.strength,
                    )
                )

        return edges
