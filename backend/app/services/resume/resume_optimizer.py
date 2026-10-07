"""
Resume Optimizer Service.

Evaluates resume content against target role requirements or custom Job Descriptions.
Computes alignment metrics, identifies JD gaps, connects gaps to roadmap milestones,
and calculates the CareerLens Resume Quality Score.
"""

from typing import Any, Dict, List, Optional, Set
import re
from app.services.analysis.skill_normaliser import SkillNormaliser
from app.services.roadmap.roadmap_config import OFFICIAL_ROLE_ROADMAPS


ROLE_TARGET_SKILLS: Dict[str, Dict[str, float]] = {
    "AI Engineer": {
        "Python": 0.95,
        "Machine Learning": 0.92,
        "PyTorch": 0.88,
        "TensorFlow": 0.82,
        "Deep Learning": 0.86,
        "SQL": 0.80,
        "FastAPI": 0.78,
        "Docker": 0.75,
        "NLP": 0.76,
        "Computer Vision": 0.70,
        "Git": 0.85,
        "API Design": 0.72,
    },
    "Software Engineer": {
        "Python": 0.90,
        "SQL": 0.88,
        "FastAPI": 0.80,
        "Git": 0.92,
        "Docker": 0.82,
        "System Design": 0.85,
        "Data Structures & Algorithms": 0.88,
        "API Design": 0.80,
        "PostgreSQL": 0.75,
        "CI/CD": 0.70,
        "Linux": 0.68,
    },
    "Frontend Developer": {
        "JavaScript": 0.95,
        "TypeScript": 0.92,
        "React": 0.94,
        "Next.js": 0.85,
        "HTML": 0.90,
        "CSS": 0.90,
        "Tailwind CSS": 0.80,
        "Git": 0.85,
        "REST API": 0.80,
        "Responsive Design": 0.82,
    },
    "Backend Developer": {
        "Python": 0.92,
        "FastAPI": 0.88,
        "SQL": 0.90,
        "PostgreSQL": 0.86,
        "Docker": 0.84,
        "Redis": 0.78,
        "System Design": 0.88,
        "Git": 0.88,
        "API Design": 0.86,
        "Kafka": 0.65,
    },
    "Data Scientist": {
        "Python": 0.95,
        "SQL": 0.90,
        "Machine Learning": 0.92,
        "Pandas": 0.90,
        "NumPy": 0.88,
        "Scikit-Learn": 0.86,
        "Statistics": 0.85,
        "Data Visualization": 0.80,
        "Git": 0.75,
    },
    "Data Analyst": {
        "SQL": 0.95,
        "Python": 0.85,
        "Tableau": 0.80,
        "Power BI": 0.80,
        "Excel": 0.85,
        "Statistics": 0.80,
        "Data Wrangling": 0.85,
    },
    "UI/UX Designer": {
        "Figma": 0.95,
        "User Research": 0.90,
        "Wireframing": 0.88,
        "Prototyping": 0.90,
        "Design Systems": 0.86,
        "UI Design": 0.92,
        "Usability Testing": 0.84,
    },
}


class ResumeOptimizer:
    """
    Optimizes resume against target roles and custom JDs.
    """

    def __init__(self):
        self.normaliser = SkillNormaliser()

    def extract_keywords_from_jd(self, jd_text: str) -> Dict[str, float]:
        """Extract skills and assign frequency importance weights from pasted JD text."""
        from app.services.analysis.skill_normaliser import _load_alias_table
        alias_table = _load_alias_table()
        jd_lower = jd_text.lower()
        
        extracted: Dict[str, float] = {}
        for alias, canonical in alias_table.items():
            pattern = r"(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
            matches = re.findall(pattern, jd_lower)
            if matches:
                weight = min(1.0, 0.5 + 0.15 * len(matches))
                if canonical not in extracted or extracted[canonical] < weight:
                    extracted[canonical] = weight

        if not extracted:
            # Fallback to software engineer baseline if JD parsing finds no known keywords
            return ROLE_TARGET_SKILLS.get("Software Engineer", {})
        return extracted

    def get_role_skills(self, target_role: str, custom_jd: Optional[str] = None) -> Dict[str, float]:
        if custom_jd and len(custom_jd.strip()) > 20:
            return self.extract_keywords_from_jd(custom_jd)
        return ROLE_TARGET_SKILLS.get(target_role, ROLE_TARGET_SKILLS.get("Software Engineer", {}))

    def analyze(
        self,
        resume_content: Dict[str, Any],
        target_role: str,
        custom_jd: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run full optimization analysis.
        """
        target_skills = self.get_role_skills(target_role, custom_jd)
        
        # 1. Gather all resume skills & text
        resume_skills_list = resume_content.get("skills", [])
        resume_skill_names: Set[str] = set()
        skill_evidence_levels: Dict[str, str] = {}
        skill_confidences: Dict[str, int] = {}
        
        for s in resume_skills_list:
            canonical = self.normaliser.normalise(s.get("name", ""))
            resume_skill_names.add(canonical)
            skill_evidence_levels[canonical] = s.get("evidence_status", "UNVERIFIED")
            skill_confidences[canonical] = s.get("confidence", 50)

        # Also extract skills mentioned in project tech tags
        for p in resume_content.get("projects", []):
            for t in p.get("technologies", []):
                canonical = self.normaliser.normalise(t)
                resume_skill_names.add(canonical)
                if canonical not in skill_evidence_levels:
                    skill_evidence_levels[canonical] = p.get("evidence_status", "MODERATE")
                    skill_confidences[canonical] = p.get("evidence_confidence", 60)

        # 2. Skill coverage & Gaps
        matched_skills: List[str] = []
        partial_skills: List[str] = []
        missing_skills: List[str] = []
        jd_gaps: List[Dict[str, Any]] = []

        total_weight = sum(target_skills.values()) or 1.0
        covered_weight = 0.0
        evidence_weight = 0.0

        for req_skill, importance in sorted(target_skills.items(), key=lambda x: x[1], reverse=True):
            norm_req = self.normaliser.normalise(req_skill)
            
            # Check presence
            is_present = any(norm_req.lower() == rs.lower() for rs in resume_skill_names)
            ev_status = skill_evidence_levels.get(norm_req, "MISSING") if is_present else "MISSING"
            conf = skill_confidences.get(norm_req, 0) if is_present else 0

            importance_label = "HIGH" if importance >= 0.85 else ("MEDIUM" if importance >= 0.70 else "LOW")

            if is_present:
                if ev_status in ("VERIFIED", "STRONG"):
                    matched_skills.append(norm_req)
                    covered_weight += importance
                    evidence_weight += importance
                elif ev_status in ("MODERATE", "WEAK"):
                    partial_skills.append(norm_req)
                    covered_weight += importance * 0.7
                    evidence_weight += importance * 0.4
                    jd_gaps.append({
                        "skill": norm_req,
                        "status": "PARTIAL",
                        "importance": importance_label,
                        "evidence_level": ev_status,
                        "confidence": conf,
                        "recommendation": f"Demonstrate deeper evidence for {norm_req} without exaggerating depth.",
                        "action": f"Build a tested component or containerized demo using {norm_req}.",
                        "roadmap_ref": norm_req.lower().replace(" ", "-"),
                    })
                else:
                    partial_skills.append(norm_req)
                    covered_weight += importance * 0.5
                    evidence_weight += importance * 0.1
                    jd_gaps.append({
                        "skill": norm_req,
                        "status": "UNVERIFIED",
                        "importance": importance_label,
                        "evidence_level": "UNVERIFIED",
                        "confidence": conf,
                        "recommendation": f"Claim for {norm_req} is unverified. Add observable artifacts.",
                        "action": f"Complete an evidence challenge or GitHub project featuring {norm_req}.",
                        "roadmap_ref": norm_req.lower().replace(" ", "-"),
                    })
            else:
                missing_skills.append(norm_req)
                jd_gaps.append({
                    "skill": norm_req,
                    "status": "MISSING",
                    "importance": importance_label,
                    "evidence_level": "MISSING",
                    "confidence": 0,
                    "recommendation": f"Target role strongly prioritizes {norm_req}.",
                    "action": f"Follow CareerLens {norm_req} roadmap milestone to gain proof of work.",
                    "roadmap_ref": norm_req.lower().replace(" ", "-"),
                })

        # 3. Calculate alignment percentages
        skills_covered_pct = min(100.0, round((covered_weight / total_weight) * 100))
        evidence_backed_pct = min(100.0, round((evidence_weight / total_weight) * 100))
        
        # Project relevance
        projects = resume_content.get("projects", [])
        project_relevance_scores = []
        for p in projects:
            p_techs = {self.normaliser.normalise(t).lower() for t in p.get("technologies", [])}
            target_techs = {ts.lower() for ts in target_skills.keys()}
            overlap = len(p_techs.intersection(target_techs))
            score = min(100, overlap * 25 + (30 if p.get("evidence_status") in ("VERIFIED", "STRONG") else 10))
            project_relevance_scores.append(score)
        project_relevance_pct = round(sum(project_relevance_scores) / len(project_relevance_scores)) if project_relevance_scores else 70

        # Keyword coverage
        keyword_cov_pct = min(100, round((len(matched_skills) + len(partial_skills)) / max(1, len(target_skills)) * 100))

        # Overall alignment
        overall_alignment_pct = round(
            0.40 * skills_covered_pct +
            0.25 * project_relevance_pct +
            0.20 * keyword_cov_pct +
            0.15 * evidence_backed_pct
        )

        # 4. CareerLens Resume Quality Score
        # ATS Compatibility (Heading presence, standard sections, contact info)
        header = resume_content.get("header", {})
        ats_score = 70
        if header.get("full_name") and header.get("email"):
            ats_score += 10
        if header.get("github") or header.get("linkedin"):
            ats_score += 5
        if resume_content.get("summary") and len(resume_content.get("summary", "")) > 50:
            ats_score += 5
        if len(projects) >= 2:
            ats_score += 5
        if len(resume_skills_list) >= 4:
            ats_score += 5
        ats_score = min(98, ats_score)

        # Readability & Impact
        readability_score = 88
        impact_score = 82 if any(len(p.get("bullets", [])) > 0 for p in projects) else 65

        quality_score = round(
            0.30 * ats_score +
            0.30 * overall_alignment_pct +
            0.20 * evidence_backed_pct +
            0.10 * readability_score +
            0.10 * impact_score
        )

        return {
            "target_role": target_role,
            "overall_alignment": overall_alignment_pct,
            "skills_covered": skills_covered_pct,
            "project_relevance": project_relevance_pct,
            "keyword_coverage": keyword_cov_pct,
            "evidence_backed_claims": evidence_backed_pct,
            "matched_skills": matched_skills,
            "partial_skills": partial_skills,
            "missing_skills": missing_skills,
            "jd_gaps": jd_gaps,
            "quality_score": quality_score,
            "quality_breakdown": {
                "ats_compatibility": ats_score,
                "jd_alignment": overall_alignment_pct,
                "evidence_coverage": evidence_backed_pct,
                "readability": readability_score,
                "impact": impact_score,
            },
        }
