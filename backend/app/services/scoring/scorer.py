"""
Pure-function scorer.

This module contains NO LLM calls and NO database access.
Every function here takes plain Python data and returns plain Python data.
This makes it trivially unit-testable and enables the what-if simulator.

Scoring formula
───────────────

1. Per-evidence strength
   s_i = reliability_i × depth_i × recency_i × authenticity_i   ∈ [0, 1]

2. Per-claim confidence (noisy-OR — independent proofs accumulate, bounded at 1)
   e_k = 1 − Π(1 − s_i)   for all evidence items i supporting claim k

3. Skill coverage for a role
   C = Σ w_k · min(1, e_k / τ_k) / Σ w_k
   where w_k = JD frequency of skill k in the role corpus
         τ_k = proof threshold (0.6 for core, 0.3 for nice-to-have)

4. Readiness components (default weights, role-tuned)
   skill_coverage        40 %
   project_depth         20 %
   consistency_growth    15 %
   portfolio_presentation 15 %
   professional_signals  10 %

5. Score interval
   Lower bound: unobserved component parts → 0
   Upper bound: unobserved parts → student's average on observed parts
   The interval narrows as the student adds more sources.

6. Status labels (per claim)
   Verified          e_k ≥ 0.60
   Partial           0.25 ≤ e_k < 0.60
   Not yet evidenced e_k < 0.25
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.services.scoring.ownership_evidence_integrator import apply_ownership_to_evidence_items


# ── Data classes (plain Python, no ORM) ──────────────────────────────────────

@dataclass
class EvidenceItem:
    """Lightweight snapshot of an Evidence record for scoring."""
    id: str
    skill_hints: List[str]
    strength: float          # pre-computed: reliability × depth × recency × authenticity (× ownership_factor where applicable)
    source: str
    locator: dict = field(default_factory=dict)
    ownership_factor: float = 1.0
    ownership_provenance: Optional[dict] = None


@dataclass
class RoleWeights:
    """Market baseline for one role (loaded from RoleProfile)."""
    role_name: str
    skill_weights: Dict[str, float]          # {skill: jd_frequency}
    proof_thresholds: Dict[str, float]       # {skill: tau}
    component_weight_overrides: Dict[str, float] = field(default_factory=dict)


@dataclass
class ScoreInput:
    """Everything the scorer needs — no DB, no I/O."""
    evidence_items: List[EvidenceItem]
    claim_skills: List[str]                  # skills claimed in resume
    role_weights: RoleWeights
    # Which source types were actually supplied (affects interval bounds)
    supplied_sources: List[str] = field(default_factory=list)


@dataclass
class ClaimStatus:
    skill: str
    confidence: float
    status: str           # Verified | Partial | Not yet evidenced
    evidence_ids: List[str] = field(default_factory=list)
    locators: List[dict] = field(default_factory=list)
    ownership_provenance: Optional[dict] = None


@dataclass
class ComponentScore:
    name: str
    value: float          # 0–100
    weight: float
    reason: str
    evidence_ids: List[str] = field(default_factory=list)


@dataclass
class ScoreResult:
    score_mid: float
    score_lo: float
    score_hi: float
    components: List[ComponentScore]
    claim_statuses: List[ClaimStatus]
    credibility: dict     # {verified_ratio, flags}
    role_fits: List[dict]
    gaps: List[dict]


# ── Constants ─────────────────────────────────────────────────────────────────

DEFAULT_COMPONENT_WEIGHTS = {
    "skill_coverage":          0.40,
    "project_depth":           0.20,
    "consistency_growth":      0.15,
    "portfolio_presentation":  0.15,
    "professional_signals":    0.10,
}

VERIFIED_THRESHOLD = 0.60
PARTIAL_THRESHOLD = 0.25

# Source types that contribute to each component
COMPONENT_SOURCE_MAP = {
    "skill_coverage":          {"github_repo", "resume", "linkedin_pdf"},
    "project_depth":           {"github_repo", "live_probe"},
    "consistency_growth":      {"github_calendar"},
    "portfolio_presentation":  {"design_portfolio"},
    "professional_signals":    {"linkedin_pdf", "resume"},
}


# ── Core scoring functions ────────────────────────────────────────────────────

def noisy_or(strengths: List[float]) -> float:
    """
    Noisy-OR combination: e = 1 - Π(1 - s_i).
    Independent proofs accumulate with diminishing returns, bounded at 1.
    """
    if not strengths:
        return 0.0
    result = 1.0
    for s in strengths:
        result *= (1.0 - max(0.0, min(1.0, s)))
    return 1.0 - result


def compute_claim_confidence(
    skill: str,
    evidence_items: List[EvidenceItem],
) -> Tuple[float, List[str], List[dict]]:
    """
    Returns (confidence, evidence_ids, locators) for one skill.
    """
    supporting = [e for e in evidence_items if skill in e.skill_hints]
    strengths = [e.strength for e in supporting]
    confidence = noisy_or(strengths)
    evidence_ids = [e.id for e in supporting]
    locators = [e.locator for e in supporting]
    return confidence, evidence_ids, locators


def skill_coverage(
    claim_statuses: List[ClaimStatus],
    role_weights: RoleWeights,
) -> Tuple[float, List[str]]:
    """
    C = Σ w_k · min(1, e_k / τ_k) / Σ w_k
    Returns (coverage_0_to_1, list_of_evidence_ids_used).
    """
    skill_conf = {cs.skill: cs.confidence for cs in claim_statuses}
    sw = role_weights.skill_weights
    tau = role_weights.proof_thresholds

    total_weight = sum(sw.values())
    if total_weight == 0:
        return 0.0, []

    weighted_sum = 0.0
    evidence_ids: List[str] = []

    for skill, w in sw.items():
        e_k = skill_conf.get(skill, 0.0)
        tau_k = tau.get(skill, 0.3)
        contribution = w * min(1.0, e_k / tau_k if tau_k > 0 else 0.0)
        weighted_sum += contribution

    for cs in claim_statuses:
        evidence_ids.extend(cs.evidence_ids)

    return weighted_sum / total_weight, list(set(evidence_ids))


def _component_weights(role_weights: RoleWeights) -> Dict[str, float]:
    """Merge default weights with role-specific overrides."""
    weights = dict(DEFAULT_COMPONENT_WEIGHTS)
    weights.update(role_weights.component_weight_overrides)
    # Re-normalise in case overrides don't sum to 1
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()} if total else weights


def compute_score(inp: ScoreInput) -> ScoreResult:
    """
    Main scoring entry point. Pure function — no side effects.
    """
    # ── Step 1: per-claim confidence ──────────────────────────────────────────
    all_skills = list(
        set(inp.claim_skills)
        | set(s for e in inp.evidence_items for s in e.skill_hints)
    )
    claim_statuses: List[ClaimStatus] = []
    for skill in all_skills:
        conf, ev_ids, locators = compute_claim_confidence(skill, inp.evidence_items)
        if conf >= VERIFIED_THRESHOLD:
            status = "Verified"
        elif conf >= PARTIAL_THRESHOLD:
            status = "Partial"
        else:
            status = "Not yet evidenced"

        # Extract ownership provenance if present on supporting items
        ownership_info = None
        for loc in locators:
            if isinstance(loc, dict) and "ownership" in loc:
                ownership_info = loc["ownership"]
                break

        claim_statuses.append(
            ClaimStatus(
                skill=skill,
                confidence=conf,
                status=status,
                evidence_ids=ev_ids,
                locators=locators,
                ownership_provenance=ownership_info,
            )
        )

    # ── Step 2: component scores ──────────────────────────────────────────────
    component_weights = _component_weights(inp.role_weights)
    components: List[ComponentScore] = []
    observed_component_scores: List[float] = []

    # Skill coverage
    cov, cov_ev_ids = skill_coverage(claim_statuses, inp.role_weights)
    components.append(ComponentScore(
        name="skill_coverage",
        value=round(cov * 100, 1),
        weight=component_weights["skill_coverage"],
        reason=_skill_coverage_reason(cov, claim_statuses),
        evidence_ids=cov_ev_ids,
    ))
    if COMPONENT_SOURCE_MAP["skill_coverage"] & set(inp.supplied_sources):
        observed_component_scores.append(cov)

    # Project depth (proxy: average depth of github_repo evidence)
    proj_ev = [e for e in inp.evidence_items if e.source == "github_repo"]
    proj_depth = (sum(e.strength for e in proj_ev) / len(proj_ev)) if proj_ev else 0.0
    proj_ev_ids = [e.id for e in proj_ev]
    components.append(ComponentScore(
        name="project_depth",
        value=round(proj_depth * 100, 1),
        weight=component_weights["project_depth"],
        reason=f"{len(proj_ev)} GitHub evidence items; average strength {proj_depth:.2f}.",
        evidence_ids=proj_ev_ids,
    ))
    if proj_ev:
        observed_component_scores.append(proj_depth)

    # Consistency & growth
    cons_ev = [e for e in inp.evidence_items if "consistency" in e.source or "calendar" in e.source]
    cons_score = (sum(e.strength for e in cons_ev) / len(cons_ev)) if cons_ev else 0.0
    components.append(ComponentScore(
        name="consistency_growth",
        value=round(cons_score * 100, 1),
        weight=component_weights["consistency_growth"],
        reason=_consistency_reason(cons_ev),
        evidence_ids=[e.id for e in cons_ev],
    ))
    if cons_ev:
        observed_component_scores.append(cons_score)

    # Portfolio & presentation
    port_ev = [e for e in inp.evidence_items if e.source == "design_portfolio"]
    port_score = (sum(e.strength for e in port_ev) / len(port_ev)) if port_ev else 0.0
    components.append(ComponentScore(
        name="portfolio_presentation",
        value=round(port_score * 100, 1),
        weight=component_weights["portfolio_presentation"],
        reason="Design portfolio analysed via vision rubric." if port_ev else "No design portfolio uploaded.",
        evidence_ids=[e.id for e in port_ev],
    ))
    if port_ev:
        observed_component_scores.append(port_score)

    # Professional signals
    prof_ev = [e for e in inp.evidence_items if e.source in {"linkedin_pdf", "resume"}]
    prof_score = (sum(e.strength for e in prof_ev) / len(prof_ev)) if prof_ev else 0.0
    components.append(ComponentScore(
        name="professional_signals",
        value=round(prof_score * 100, 1),
        weight=component_weights["professional_signals"],
        reason="Drawn from resume and LinkedIn PDF." if prof_ev else "No professional document uploaded.",
        evidence_ids=[e.id for e in prof_ev],
    ))
    if prof_ev:
        observed_component_scores.append(prof_score)

    # ── Step 3: score interval ────────────────────────────────────────────────
    avg_observed = (
        sum(observed_component_scores) / len(observed_component_scores)
        if observed_component_scores else 0.0
    )

    score_mid = 0.0
    score_lo_num = 0.0
    score_hi_num = 0.0

    for comp in components:
        val = comp.value / 100  # normalise to [0,1]
        score_mid += val * comp.weight
        # Lower bound: unobserved → 0
        lo_val = val if _is_observed(comp.name, inp.supplied_sources) else 0.0
        # Upper bound: unobserved → avg of observed
        hi_val = val if _is_observed(comp.name, inp.supplied_sources) else avg_observed
        score_lo_num += lo_val * comp.weight
        score_hi_num += hi_val * comp.weight

    score_mid = round(score_mid * 100, 1)
    score_lo = round(score_lo_num * 100, 1)
    score_hi = round(score_hi_num * 100, 1)

    # ── Step 4: gaps ──────────────────────────────────────────────────────────
    gaps = _compute_gaps(claim_statuses, inp.role_weights)

    # ── Step 5: credibility indicator (separate from score) ───────────────────
    verified_count = sum(1 for cs in claim_statuses if cs.status == "Verified")
    total_claims = len(claim_statuses)
    credibility = {
        "verified_ratio": round(verified_count / total_claims, 2) if total_claims else 0.0,
        "verified_count": verified_count,
        "total_claims": total_claims,
        "flags": [],  # Security flags added by the route handler
    }

    # ── Step 6: role fit ──────────────────────────────────────────────────────
    role_fits = [{
        "role": inp.role_weights.role_name,
        "fit_pct": score_mid,
        "gap_skills": [g["skill"] for g in gaps[:5]],
    }]

    return ScoreResult(
        score_mid=score_mid,
        score_lo=score_lo,
        score_hi=score_hi,
        components=components,
        claim_statuses=claim_statuses,
        credibility=credibility,
        role_fits=role_fits,
        gaps=gaps,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_observed(component_name: str, supplied_sources: List[str]) -> bool:
    required = COMPONENT_SOURCE_MAP.get(component_name, set())
    return bool(required & set(supplied_sources))


def _skill_coverage_reason(coverage: float, claim_statuses: List[ClaimStatus]) -> str:
    verified = sum(1 for cs in claim_statuses if cs.status == "Verified")
    total = len(claim_statuses)
    return (
        f"{verified}/{total} skills Verified; coverage {coverage * 100:.0f}% "
        f"of the role's weighted JD requirements."
    )


def _consistency_reason(cons_ev: List[EvidenceItem]) -> str:
    if not cons_ev:
        return "No GitHub activity data available."
    metrics = {e.locator.get("metric", ""): e.strength for e in cons_ev}
    parts = []
    if "active_week_ratio" in metrics:
        parts.append(f"active-week ratio {metrics['active_week_ratio']:.0%}")
    if "longest_gap_weeks" in metrics:
        gap_score = metrics["longest_gap_weeks"]
        parts.append(f"gap signal {gap_score:.2f}")
    if "trend_slope" in metrics:
        parts.append(f"trend {metrics['trend_slope']:.2f}")
    return "Consistency metrics: " + ", ".join(parts) + "."


def _compute_gaps(
    claim_statuses: List[ClaimStatus],
    role_weights: RoleWeights,
) -> List[dict]:
    """
    Return gaps sorted by (importance × (1 - confidence)) descending.
    """
    sw = role_weights.skill_weights
    gaps = []
    skill_conf = {cs.skill: cs.confidence for cs in claim_statuses}

    for skill, w in sw.items():
        conf = skill_conf.get(skill, 0.0)
        if conf < VERIFIED_THRESHOLD:
            gaps.append({
                "skill": skill,
                "importance": round(w, 3),
                "market_frequency": round(w, 3),
                "current_confidence": round(conf, 3),
                "priority_score": round(w * (1 - conf), 4),
                "action": _gap_action(skill, conf),
            })

    return sorted(gaps, key=lambda g: g["priority_score"], reverse=True)


def _gap_action(skill: str, confidence: float) -> str:
    if confidence < PARTIAL_THRESHOLD:
        return f"Build a project using {skill} and push it to GitHub with a clear README."
    return f"Deepen your {skill} evidence: add tests, CI, or a deployed demo."
