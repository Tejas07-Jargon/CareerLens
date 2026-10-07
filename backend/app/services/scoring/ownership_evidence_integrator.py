"""
Ownership Evidence Integrator.

Pure functional module for applying repository and skill-specific ownership
attributions to EvidenceItem records prior to deterministic scoring.

Principles:
1. Missing ownership is neutral (factor = 1.0).
2. Non-GitHub evidence is untouched (factor = 1.0).
3. Skill-specific ownership takes precedence over repository-level ownership when present.
4. Deterministic provenance is attached for complete explainability and auditability.
5. No contributor PII (emails, real names) is ever exposed.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

from app.services.ownership.factor import calculate_ownership_factor


def _normalize_repo_name(name: str) -> str:
    """Normalizes repository names for robust matching (lowercase, stripped, ignores leading/trailing slashes)."""
    return name.strip().lower().strip("/")


def _find_matching_attribution(
    repo_name: str,
    attributions: List[Any],
) -> Optional[Any]:
    """Finds a RepoAttribution matching the repository identifier."""
    if not repo_name:
        return None
    target = _normalize_repo_name(repo_name)

    for attr in attributions:
        attr_name = _normalize_repo_name(getattr(attr, "repo_full_name", ""))
        if not attr_name:
            continue
        if attr_name == target:
            return attr
        # Also match if target is just the repo portion: "CareerLens" matches "owner/CareerLens"
        if "/" in attr_name and attr_name.split("/")[-1] == target:
            return attr
        if "/" in target and target.split("/")[-1] == attr_name:
            return attr

    return None


def _find_skill_ownership(
    skill: str,
    attribution: Any,
) -> Optional[Any]:
    """Finds SkillOwnership for a canonical skill under a given attribution."""
    skill_ownerships = getattr(attribution, "skill_ownerships", []) or []
    target_skill = skill.strip().lower()

    for sk in skill_ownerships:
        if getattr(sk, "skill", "").strip().lower() == target_skill:
            return sk
    return None


def apply_ownership_to_evidence_items(
    evidence_items: List[Any],
    repo_attributions: Optional[List[Any]] = None,
) -> List[Any]:
    """
    Applies ownership attribution factors to a list of EvidenceItem instances.

    Parameters
    ----------
    evidence_items : List[EvidenceItem]
        The evidence item snapshots to be processed.
    repo_attributions : Optional[List[RepoAttribution]]
        Active/persisted repository attribution snapshots from DB.

    Returns
    -------
    List[EvidenceItem]
        New list of EvidenceItem objects with ownership factors and provenance applied.
    """
    if not repo_attributions:
        return evidence_items

    updated_items = []

    for item in evidence_items:
        # Clone or copy to avoid mutating external state
        cloned = deepcopy(item)
        source = getattr(cloned, "source", "")

        # Ownership factor only applies to github_repo evidence
        if source != "github_repo":
            if hasattr(cloned, "ownership_factor"):
                cloned.ownership_factor = 1.0
            updated_items.append(cloned)
            continue

        locator = getattr(cloned, "locator", {}) or {}
        repo_name = locator.get("repo") or locator.get("repo_full_name") or ""

        attribution = _find_matching_attribution(repo_name, repo_attributions)

        if attribution is None:
            # Missing attribution: neutral factor = 1.0 (backward compatibility)
            if hasattr(cloned, "ownership_factor"):
                cloned.ownership_factor = 1.0
            updated_items.append(cloned)
            continue

        attr_status = getattr(attribution, "status", "not_analysed").lower()
        head_sha = getattr(attribution, "head_sha", "UNKNOWN") or "UNKNOWN"
        method = getattr(attribution, "method", "git_blame_full_history")
        algorithm_version = getattr(attribution, "algorithm_version", "1")
        coverage = float(getattr(attribution, "coverage", 0.0) or 0.0)
        incomplete = bool(getattr(attribution, "incomplete", False))

        # Check if analysis is completed / partial
        if attr_status in ("complete", "partial", "incomplete", "success") or coverage > 0:
            # 1. Look for skill-specific ownership first
            matched_skill_ownership = None
            for skill in getattr(cloned, "skill_hints", []):
                sk_match = _find_skill_ownership(skill, attribution)
                if sk_match is not None:
                    matched_skill_ownership = sk_match
                    break

            if matched_skill_ownership is not None:
                # Skill-specific factor
                share = float(getattr(matched_skill_ownership, "share", 0.0) or 0.0)
                total_lines = float(getattr(matched_skill_ownership, "total_lines", 0.0) or 0.0)
                factor = getattr(matched_skill_ownership, "factor", None)
                if factor is None or factor <= 0.0:
                    factor = calculate_ownership_factor(student_share=share, total_lines=total_lines)
                else:
                    factor = float(factor)

                skill_name = getattr(matched_skill_ownership, "skill", "")
                provenance = {
                    "source": "github_ownership",
                    "repo": attribution.repo_full_name,
                    "head_sha": head_sha,
                    "method": method,
                    "algorithm_version": algorithm_version,
                    "coverage": round(coverage, 4),
                    "student_share": round(share, 4),
                    "ownership_factor": round(factor, 4),
                    "skill": skill_name,
                    "status": attr_status,
                    "incomplete": incomplete,
                    "type": "skill_specific",
                }
            else:
                # 2. Fall back to repository-level ownership
                student_share = float(getattr(attribution, "student_share", 0.0) or 0.0)
                total_meaningful_lines = float(getattr(attribution, "total_meaningful_lines", 0.0) or 0.0)
                factor = calculate_ownership_factor(student_share=student_share, total_lines=total_meaningful_lines)

                provenance = {
                    "source": "github_ownership",
                    "repo": attribution.repo_full_name,
                    "head_sha": head_sha,
                    "method": method,
                    "algorithm_version": algorithm_version,
                    "coverage": round(coverage, 4),
                    "student_share": round(student_share, 4),
                    "ownership_factor": round(factor, 4),
                    "skill": None,
                    "status": attr_status,
                    "incomplete": incomplete,
                    "type": "repository_level",
                }

            # Adjust strength: s_adjusted = s_original * factor
            cloned.strength = max(0.0, min(1.0, cloned.strength * factor))
            if hasattr(cloned, "ownership_factor"):
                cloned.ownership_factor = factor
            if hasattr(cloned, "ownership_provenance"):
                cloned.ownership_provenance = provenance

            # Store in locator for UI click-through & explainability
            if not isinstance(cloned.locator, dict):
                cloned.locator = {}
            cloned.locator["ownership"] = provenance

        else:
            # Unanalysed / failed / queued: neutral factor = 1.0
            provenance = {
                "source": "github_ownership",
                "repo": attribution.repo_full_name,
                "status": attr_status,
                "ownership_factor": 1.0,
                "notes": ["Ownership analysis unavailable or pending; neutral baseline applied."],
            }
            if hasattr(cloned, "ownership_factor"):
                cloned.ownership_factor = 1.0
            if hasattr(cloned, "ownership_provenance"):
                cloned.ownership_provenance = provenance
            if isinstance(cloned.locator, dict):
                cloned.locator["ownership"] = provenance

        updated_items.append(cloned)

    return updated_items
