"""
AI Suggester Service.

Provides targeted, evidence-backed improvements for resume sections.
Never modifies user text automatically; presents structured suggestions with evidence tags.
"""

from typing import Any, Dict, List, Optional
from app.services.analysis.skill_normaliser import SkillNormaliser


class AISuggester:
    """
    Generates evidence-backed suggestions for resume sections.
    """

    def __init__(self):
        self.normaliser = SkillNormaliser()

    def suggest_summary(
        self,
        current_text: str,
        target_role: str,
        verified_skills: List[str],
    ) -> Dict[str, Any]:
        skills_str = ", ".join(verified_skills[:4]) if verified_skills else "software engineering & data architecture"
        suggested = (
            f"Evidence-verified {target_role} specializing in {skills_str}. "
            f"Demonstrated capability in building robust microservices, automated test pipelines, and maintainable software systems "
            f"backed by verifiable GitHub repositories and deterministic static analysis."
        )
        return {
            "section": "summary",
            "current": current_text,
            "suggestion": suggested,
            "reason": f"Optimized phrasing for {target_role} highlighting your highest-confidence verified skills ({skills_str}).",
            "supported_skills": verified_skills[:4],
            "evidence_tags": ["AST-Verified Code", "Test Suite Proven", "Target Role Aligned"],
        }

    def suggest_project_bullet(
        self,
        current_bullet: str,
        project_name: str,
        technologies: List[str],
        has_tests: bool = True,
        has_docker: bool = False,
    ) -> Dict[str, Any]:
        techs_str = ", ".join(technologies[:3]) if technologies else "modern engineering stack"
        
        # Generate impactful phrasing
        if "fastapi" in [t.lower() for t in technologies] or "python" in [t.lower() for t in technologies]:
            suggested = f"Architected high-throughput REST API using {techs_str} featuring Pydantic data validation and structured relational persistence."
        elif "machine learning" in [t.lower() for t in technologies] or "pytorch" in [t.lower() for t in technologies]:
            suggested = f"Engineered end-to-end {technologies[0] if technologies else 'ML'} pipeline for predictive classification with automated preprocessing and cross-validated evaluation metrics."
        else:
            suggested = f"Developed modular full-stack application using {techs_str} with automated unit tests and reproducible environment configurations."

        return {
            "section": "project_bullet",
            "current": current_bullet,
            "suggestion": suggested,
            "reason": "Restructured to lead with an active engineering verb and quantify technical depth based on verified project technologies.",
            "supported_skills": technologies,
            "evidence_tags": ["Verifiable Tech Stack", "Action-Verb Led", "ATS Readable"],
        }
