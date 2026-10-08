"""
Kareer Kranti Personalized Roadmap Engine.

Interprets the student's actual evidence records against the roadmap.sh reference taxonomy.
Answers: "Given what this student has actually demonstrated, what should they learn/build next
for the role they are targeting?"
"""

from typing import Any, Dict, List, Optional
import structlog

from app.services.roadmap.roadmap_config import (
    OFFICIAL_ROLE_ROADMAPS,
    SKILL_ROADMAP_URLS,
    ROLE_MILESTONES,
)

log = structlog.get_logger(__name__)


class PersonalizedRoadmapEngine:
    """
    Consumes verified evidence data and produces a personalized roadmap with evidence overlay.
    """

    def generate_personalized_roadmap(
        self,
        target_role: str,
        claim_statuses: List[Dict[str, Any]],
        evidence_items: Optional[List[Any]] = None,
        security_flags: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Builds the complete personalized roadmap response for a given target role.
        """
        canonical_role = self._resolve_role(target_role)
        role_meta = OFFICIAL_ROLE_ROADMAPS.get(canonical_role, OFFICIAL_ROLE_ROADMAPS["Software Engineer"])
        raw_milestones = ROLE_MILESTONES.get(canonical_role, ROLE_MILESTONES["Software Engineer"])

        # Map skill confidences and evidence from claim statuses
        skill_map: Dict[str, Dict[str, Any]] = {}
        for cs in claim_statuses:
            skill_name = cs.get("skill", "")
            if skill_name:
                skill_map[skill_name.lower()] = cs
                # Also store canonical casing
                skill_map[skill_name] = cs

        # Check for authenticity / security flags
        has_security_flags = bool(security_flags and len(security_flags) > 0)

        milestone_evaluations: List[Dict[str, Any]] = []
        completed_milestone_ids = set()

        for m in raw_milestones:
            eval_result = self._evaluate_milestone(m, skill_map, evidence_items, has_security_flags)
            milestone_evaluations.append(eval_result)
            if eval_result["status"] in {"VERIFIED", "STRONG", "MODERATE"}:
                completed_milestone_ids.add(m["id"])

        # Calculate overall progress percentage
        overall_progress = self._calculate_overall_progress(milestone_evaluations)

        # Determine overall confidence
        has_repo_evidence = any(
            any(loc.get("repo") for loc in m.get("locators", []))
            for m in milestone_evaluations
        )
        if not has_repo_evidence and any(m["evidence_score"] > 0 for m in milestone_evaluations):
            confidence_level = "limited"
            confidence_note = "Limited evidence: Only resume/document claims detected. Connect GitHub or project files for verified proof."
        else:
            confidence_level = "high" if overall_progress >= 50 else "moderate"
            confidence_note = "Confidence backed by multi-source static analysis and commit provenance."

        # Find next recommended milestone with prerequisite awareness
        next_milestone_info = self._pick_next_milestone(
            milestone_evaluations,
            completed_milestone_ids,
            canonical_role,
        )

        return {
            "target_role": canonical_role,
            "role_options": list(OFFICIAL_ROLE_ROADMAPS.keys()),
            "roadmap": {
                "name": role_meta["primary"]["name"],
                "url": role_meta["primary"]["url"],
                "description": role_meta["primary"]["description"],
                "supporting_roadmaps": role_meta.get("supporting", []),
            },
            "overall_progress": overall_progress,
            "confidence": confidence_level,
            "confidence_note": confidence_note,
            "milestones": milestone_evaluations,
            "next_milestone": next_milestone_info,
        }

    def _resolve_role(self, role_name: Optional[str]) -> str:
        if not role_name:
            return "Software Engineer"
        normalized = role_name.strip()
        for known_role in OFFICIAL_ROLE_ROADMAPS:
            if known_role.lower() == normalized.lower():
                return known_role
        return "Software Engineer"

    def _evaluate_milestone(
        self,
        milestone: Dict[str, Any],
        skill_map: Dict[str, Dict[str, Any]],
        evidence_items: Optional[List[Any]],
        has_security_flags: bool,
    ) -> Dict[str, Any]:
        related_skills = milestone.get("related_skills", [])
        matched_claims = []
        all_locators = []
        all_evidence_ids = []
        max_confidence = 0.0

        for s in related_skills:
            claim = skill_map.get(s) or skill_map.get(s.lower())
            if claim:
                matched_claims.append(claim)
                conf = float(claim.get("confidence", 0.0))
                if conf > max_confidence:
                    max_confidence = conf
                all_locators.extend(claim.get("locators", []))
                all_evidence_ids.extend(claim.get("evidence_ids", []))

        evidence_score = round(max_confidence * 100, 1)

        # Detect proof types
        has_repo_proof = any(loc.get("repo") and loc.get("path") for loc in all_locators)
        has_commit_sha = any(loc.get("commit_sha") for loc in all_locators)
        only_resume = all(loc.get("file") or loc.get("snippet") for loc in all_locators) if all_locators else False
        is_conflicted = any(loc.get("label") == "signal for review" for loc in all_locators)

        # Determine explainable status
        if is_conflicted:
            status = "CONFLICTING"
            reason = f"Conflicting signals detected for {milestone['name']}. Requires manual code review."
        elif max_confidence >= 0.75:
            status = "STRONG"
            reason = f"Strong evidence verified across repositories with concrete implementation proof ({evidence_score}% confidence)."
        elif max_confidence >= 0.60:
            status = "VERIFIED"
            reason = f"Verified implementation found in repository codebase ({evidence_score}% confidence)."
        elif max_confidence >= 0.40:
            status = "MODERATE"
            reason = f"Moderate proof-of-work detected ({evidence_score}% confidence); deeper testing or deployment artifacts recommended."
        elif max_confidence >= 0.15:
            if only_resume and not has_repo_proof:
                status = "LIMITED EVIDENCE"
                reason = f"Claimed in resume ({evidence_score}% confidence), but no repository code or commit proof was detected."
            else:
                status = "WEAK"
                reason = f"Weak evidence signals detected ({evidence_score}% confidence); requires verifiable project code."
        else:
            status = "MISSING"
            reason = f"No verified evidence found for {milestone['name']} in submitted sources."

        # Map official skill URL if exists
        primary_skill = related_skills[0] if related_skills else milestone["name"]
        skill_roadmap_url = SKILL_ROADMAP_URLS.get(primary_skill, milestone.get("source_url", "https://roadmap.sh"))

        return {
            "id": milestone["id"],
            "name": milestone["name"],
            "roadmap": milestone.get("roadmap", "general"),
            "status": status,
            "evidence_score": evidence_score,
            "reason": reason,
            "related_skills": related_skills,
            "prerequisites": milestone.get("prerequisites", []),
            "source_url": milestone.get("source_url", skill_roadmap_url),
            "skill_roadmap_url": skill_roadmap_url,
            "recommended_artifact": milestone.get("recommended_artifact", ""),
            "expected_proof": milestone.get("expected_proof", ""),
            "why_it_matters": milestone.get("why_it_matters", ""),
            "importance": milestone.get("importance", 0.5),
            "evidence_ids": list(set(all_evidence_ids)),
            "locators": all_locators[:5],
            "has_provenance": has_repo_proof or has_commit_sha,
        }

    def _calculate_overall_progress(self, milestones: List[Dict[str, Any]]) -> int:
        if not milestones:
            return 0
        total_weight = sum(m.get("importance", 0.5) for m in milestones)
        if total_weight == 0:
            return 0
        weighted_score = sum(
            (m["evidence_score"] / 100.0) * m.get("importance", 0.5)
            for m in milestones
        )
        return int(round((weighted_score / total_weight) * 100))

    def _pick_next_milestone(
        self,
        milestones: List[Dict[str, Any]],
        completed_ids: set,
        role_name: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Determines the next best milestone considering:
        - target-role importance
        - current evidence gap
        - prerequisite completion (prerequisite-aware selection!)
        - unlocking potential for downstream milestones
        """
        candidates = []
        milestone_by_id = {m["id"]: m for m in milestones}

        for m in milestones:
            # Skip already verified or strong milestones
            if m["status"] in {"STRONG", "VERIFIED"} or m["evidence_score"] >= 70:
                continue

            prereqs = m.get("prerequisites", [])
            # Check if all prerequisites are completed or at least moderate
            prereqs_met = True
            missing_prereqs = []
            for pid in prereqs:
                prereq_m = milestone_by_id.get(pid)
                if prereq_m:
                    if prereq_m["status"] in {"MISSING", "WEAK", "LIMITED EVIDENCE"}:
                        prereqs_met = False
                        missing_prereqs.append(prereq_m["name"])

            # Count how many other milestones depend on this one
            unlocks_count = sum(
                1 for other in milestones if m["id"] in other.get("prerequisites", [])
            )

            importance = m.get("importance", 0.5)
            gap_size = 1.0 - (m["evidence_score"] / 100.0)

            # Scoring priority formula
            score = importance * gap_size
            if prereqs_met:
                score += 1.0  # High bonus for ready-to-execute milestones
            else:
                score -= 2.0  # Penalty if prerequisites are unfulfilled

            score += (unlocks_count * 0.15)  # Bonus for foundational skills

            candidates.append({
                "milestone": m,
                "priority_score": score,
                "prereqs_met": prereqs_met,
                "missing_prereqs": missing_prereqs,
                "unlocks_count": unlocks_count,
            })

        if not candidates:
            return None

        candidates.sort(key=lambda c: c["priority_score"], reverse=True)
        best = candidates[0]
        chosen = best["milestone"]

        # Formulate contextual rationale
        if not best["prereqs_met"] and best["missing_prereqs"]:
            why_text = (
                f"{chosen['name']} is highly relevant for {role_name}, but completing "
                f"{', '.join(best['missing_prereqs'])} is recommended first as a prerequisite."
            )
        else:
            if chosen["evidence_score"] == 0:
                why_text = (
                    f"No evidence detected for {chosen['name']}. Closing this gap directly unlocks "
                    f"key competency requirements for {role_name}."
                )
            else:
                why_text = (
                    f"Your current {chosen['name']} evidence is {chosen['status'].lower()} ({chosen['evidence_score']}%). "
                    f"Deepening this into verified repository proof will significantly improve your role readiness."
                )

        return {
            "id": chosen["id"],
            "name": chosen["name"],
            "status": chosen["status"],
            "current_evidence_score": chosen["evidence_score"],
            "why_recommended": why_text,
            "recommended_artifact": chosen["recommended_artifact"],
            "expected_proof": chosen["expected_proof"],
            "source_url": chosen["source_url"],
            "related_skills": chosen["related_skills"],
            "prerequisites": chosen["prerequisites"],
        }
