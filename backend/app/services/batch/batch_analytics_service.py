"""
Batch analytics service – placement-cell dashboard.

Provides:
  1. Cohort skill heatmap: {skill: avg_confidence} across all profiles
  2. Top N skill gaps: skills with lowest average confidence
  3. Workshop optimiser: greedy coverage maximiser

Privacy rule: stats for groups under SMALL_COHORT_MIN_SIZE are suppressed.

Workshop optimiser algorithm
─────────────────────────────
Input:
  - gap_vectors: {profile_id: {skill: confidence}} for all students
  - candidate_workshops: [{name, skills_covered}]
  - budget: max workshops to select
  - readiness_threshold: confidence above which a student is "ready" on a skill

Algorithm (greedy set coverage approximation):
  1. Count how many students are below readiness_threshold for each skill
  2. For each candidate workshop, compute how many additional students it
     would move over the threshold (marginal coverage)
  3. Pick the workshop with the highest marginal coverage
  4. Update the "still-below-threshold" counts
  5. Repeat until budget exhausted or no improvement possible
"""

from typing import Dict, List, Optional, Tuple

import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)


class BatchAnalyticsService:
    """
    Computes cohort-level insights from a list of ScoreRun objects.

    Usage
    -----
    svc = BatchAnalyticsService(score_runs=..., cohort_size=120)
    heatmap = svc.skill_heatmap()
    top_gaps = svc.top_skill_gaps(n=10)
    plan = svc.optimise_workshops(candidate_workshops, budget=3)
    """

    def __init__(self, score_runs: List[dict], cohort_size: int):
        """
        score_runs: list of ScoreRun.claim_statuses (serialised dicts)
        cohort_size: total number of students (for privacy guard)
        """
        self.score_runs = score_runs
        self.cohort_size = cohort_size

    def _privacy_guard(self) -> bool:
        """Return False if the cohort is too small to show stats."""
        if self.cohort_size < settings.SMALL_COHORT_MIN_SIZE:
            log.warning(
                "Cohort too small — stats suppressed",
                size=self.cohort_size,
                min_size=settings.SMALL_COHORT_MIN_SIZE,
            )
            return False
        return True

    def skill_heatmap(self) -> Optional[Dict[str, float]]:
        """
        Returns {skill: average_confidence} across all profiles.
        Returns None if cohort is too small.
        """
        if not self._privacy_guard():
            return None

        skill_totals: Dict[str, float] = {}
        skill_counts: Dict[str, int] = {}

        for run in self.score_runs:
            for claim in run.get("claim_statuses", []):
                skill = claim["skill"]
                conf = claim["confidence"]
                skill_totals[skill] = skill_totals.get(skill, 0.0) + conf
                skill_counts[skill] = skill_counts.get(skill, 0) + 1

        return {
            skill: round(skill_totals[skill] / skill_counts[skill], 3)
            for skill in skill_totals
        }

    def top_skill_gaps(self, n: int = 10) -> Optional[List[Dict]]:
        """
        Returns top-N skills with lowest average confidence.
        Returns None if cohort is too small.
        """
        heatmap = self.skill_heatmap()
        if heatmap is None:
            return None

        sorted_skills = sorted(heatmap.items(), key=lambda x: x[1])
        return [
            {"skill": skill, "avg_confidence": conf, "gap_severity": round(1 - conf, 3)}
            for skill, conf in sorted_skills[:n]
        ]

    def optimise_workshops(
        self,
        candidate_workshops: List[Dict],
        budget: int = 3,
        readiness_threshold: float = 0.6,
    ) -> Optional[List[Dict]]:
        """
        Greedy workshop selection.

        candidate_workshops: [{"name": str, "skills_covered": [str]}]
        budget: max workshops to select
        readiness_threshold: confidence threshold to consider a student "ready"

        Returns list of selected workshops with impact estimates.
        Returns None if cohort is too small.
        """
        if not self._privacy_guard():
            return None

        # Build gap vectors: {profile_idx: {skill: confidence}}
        gap_vectors: List[Dict[str, float]] = []
        for run in self.score_runs:
            student_gaps: Dict[str, float] = {}
            for claim in run.get("claim_statuses", []):
                conf = claim["confidence"]
                if conf < readiness_threshold:
                    student_gaps[claim["skill"]] = conf
            gap_vectors.append(student_gaps)

        # Track which (student, skill) pairs are still below threshold
        below_threshold: List[Dict[str, float]] = [dict(gv) for gv in gap_vectors]

        selected: List[Dict] = []

        for _ in range(budget):
            best_workshop = None
            best_impact = 0
            best_students_moved = []

            for workshop in candidate_workshops:
                if workshop["name"] in [w["name"] for w in selected]:
                    continue
                skills = set(workshop["skills_covered"])
                students_moved = []
                for i, student_gaps in enumerate(below_threshold):
                    # A workshop moves a student if it covers at least one of their gaps
                    if skills & set(student_gaps.keys()):
                        students_moved.append(i)
                impact = len(students_moved)
                if impact > best_impact:
                    best_impact = impact
                    best_workshop = workshop
                    best_students_moved = students_moved

            if best_workshop is None or best_impact == 0:
                break

            selected.append({
                "name": best_workshop["name"],
                "skills_covered": best_workshop["skills_covered"],
                "students_moved": best_impact,
                "pct_of_cohort": round(best_impact / max(len(self.score_runs), 1) * 100, 1),
            })

            # Update below_threshold: remove the skills this workshop covers
            for i in best_students_moved:
                for skill in best_workshop["skills_covered"]:
                    below_threshold[i].pop(skill, None)

        return selected
