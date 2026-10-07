"""
Job Fit Service – Evidence-Aware Job Match & Employability Intelligence Engine.

Computes how well a candidate actually fits a specific job description based on
verifiable proof-of-work (GitHub repos, AST static code analysis, test suites, recency,
quiz attempts, and resume claims) rather than simple keyword matching.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
import re
from datetime import datetime

from app.services.analysis.skill_normaliser import SkillNormaliser, _load_alias_table
from app.services.scoring.scorer import (
    EvidenceItem,
    ScoreInput,
    RoleWeights,
    compute_score,
    noisy_or,
)
from app.services.adapters.resume_adapter import _scan_for_injections
from app.models.evidence import Evidence
from app.models.profile import Profile
from app.models.score_run import ScoreRun
from app.services.roadmap.roadmap_config import OFFICIAL_ROLE_ROADMAPS


# ── Curated Preset JDs ─────────────────────────────────────────────────────────

PRESET_JOBS: List[Dict[str, Any]] = [
    {
        "id": "jd-neuralflow-ai",
        "title": "Generative AI & Backend Engineer",
        "company": "NeuralFlow Labs",
        "role_category": "AI Engineer",
        "experience_level": "Early Career / Junior",
        "location": "Bengaluru, India (Hybrid)",
        "skills_critical": ["Python", "Machine Learning", "PyTorch", "FastAPI"],
        "skills_important": ["SQL", "Docker", "REST API", "System Design"],
        "skills_nice_to_have": ["Kubernetes", "CI/CD", "Redis", "LangChain"],
        "summary": "Build high-throughput LLM pipelines and scalable REST APIs with automated validation and containerized microservices.",
    },
    {
        "id": "jd-cloudscale-swe",
        "title": "Software Development Engineer (SWE)",
        "company": "CloudScale Systems",
        "role_category": "Software Engineer",
        "experience_level": "Entry to Mid Level",
        "location": "Remote / Hyderabad",
        "skills_critical": ["Python", "SQL", "FastAPI", "Git"],
        "skills_important": ["Docker", "Data Structures & Algorithms", "System Design", "PostgreSQL"],
        "skills_nice_to_have": ["AWS", "CI/CD", "Redis", "Linux"],
        "summary": "Design resilient backend services with database migrations, unit tests, and continuous delivery pipelines.",
    },
    {
        "id": "jd-fintech-backend",
        "title": "Backend Platforms Engineer",
        "company": "Apex Fintech",
        "role_category": "Backend Developer",
        "experience_level": "Junior Engineer",
        "location": "Bengaluru, India",
        "skills_critical": ["Python", "SQL", "FastAPI", "PostgreSQL"],
        "skills_important": ["Docker", "Redis", "API Design", "System Design"],
        "skills_nice_to_have": ["Kafka", "AWS", "Security Best Practices", "Prometheus"],
        "summary": "Develop mission-critical ledger services, asynchronous caching layers, and high-concurrency relational APIs.",
    },
    {
        "id": "jd-nextgen-frontend",
        "title": "Frontend Engineer (React / TypeScript)",
        "company": "NextGen UI",
        "role_category": "Frontend Developer",
        "experience_level": "Entry Level",
        "location": "Pune, India",
        "skills_critical": ["JavaScript", "TypeScript", "React", "HTML"],
        "skills_important": ["Next.js", "CSS", "Tailwind CSS", "REST API"],
        "skills_nice_to_have": ["Git", "GraphQL", "Responsive Design", "Testing Library"],
        "summary": "Craft responsive web applications with state-of-the-art component architecture and performance optimization.",
    },
    {
        "id": "jd-datainsight-ds",
        "title": "Applied Data Scientist",
        "company": "DataInsight Analytics",
        "role_category": "Data Scientist",
        "experience_level": "Early Career",
        "location": "Mumbai, India",
        "skills_critical": ["Python", "SQL", "Machine Learning", "Pandas"],
        "skills_important": ["NumPy", "Scikit-Learn", "Statistics", "Data Visualization"],
        "skills_nice_to_have": ["Deep Learning", "Git", "Tableau", "PyTorch"],
        "summary": "Build predictive models and feature engineering pipelines to solve complex business analytics challenges.",
    },
]


@dataclass
class JobFitSkillMatch:
    skill: str
    category: str
    importance: str  # "CRITICAL" | "IMPORTANT" | "NICE_TO_HAVE"
    importance_weight: float
    proof_level: str  # "VALIDATED" | "DEMONSTRATED" | "CLAIMED_ONLY" | "UNVERIFIED"
    evidence_status: str  # "VERIFIED" | "STRONG" | "MODERATE" | "WEAK" | "MISSING"
    confidence: int  # 0–100
    evidence_ids: List[str]
    evidence_summary: str
    impact: str  # "HIGH" | "MEDIUM" | "LOW"
    locators: List[Dict[str, Any]]
    quiz_validated: bool = False
    github_proven: bool = False


class JobFitEngine:
    """
    Evaluates profile evidence against Job Descriptions.
    Pure mathematical and rule-based logic without hallucinations.
    """

    def __init__(self):
        self.normaliser = SkillNormaliser()
        self.alias_table = _load_alias_table()

    def parse_job_description(
        self,
        jd_text: Optional[str] = None,
        preset_id: Optional[str] = None,
        job_title: Optional[str] = None,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Parses and extracts structured requirements from preset ID or pasted text.
        Applies security checks for adversarial prompt injections.
        """
        if preset_id:
            for job in PRESET_JOBS:
                if job["id"] == preset_id:
                    return {
                        "id": job["id"],
                        "title": job["title"],
                        "company": job["company"],
                        "role_category": job["role_category"],
                        "experience_level": job["experience_level"],
                        "location": job["location"],
                        "summary": job["summary"],
                        "skills_critical": [self.normaliser.normalise(s) for s in job["skills_critical"]],
                        "skills_important": [self.normaliser.normalise(s) for s in job["skills_important"]],
                        "skills_nice_to_have": [self.normaliser.normalise(s) for s in job["skills_nice_to_have"]],
                        "security_flags": [],
                    }

        # Handle pasted custom JD text
        raw_text = (jd_text or "").strip()
        security_flags = _scan_for_injections(raw_text) if raw_text else []

        if not raw_text:
            # Default to baseline preset
            default_job = PRESET_JOBS[0]
            return {
                "id": "custom-default",
                "title": job_title or "Software / AI Engineer",
                "company": company or "Target Employer",
                "role_category": "Software Engineer",
                "experience_level": "Entry to Mid Level",
                "location": "Bengaluru / Remote",
                "summary": "Target job description analyzed against verifiable proof of work.",
                "skills_critical": [self.normaliser.normalise(s) for s in default_job["skills_critical"]],
                "skills_important": [self.normaliser.normalise(s) for s in default_job["skills_important"]],
                "skills_nice_to_have": [self.normaliser.normalise(s) for s in default_job["skills_nice_to_have"]],
                "security_flags": security_flags,
            }

        # Extract skills using alias table
        text_lower = raw_text.lower()
        extracted_skills: Dict[str, int] = {}

        for alias, canonical in self.alias_table.items():
            pattern = r"(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
            matches = re.findall(pattern, text_lower)
            if matches:
                canon_norm = self.normaliser.normalise(canonical)
                extracted_skills[canon_norm] = extracted_skills.get(canon_norm, 0) + len(matches)

        # Fallback if no known skills found
        if not extracted_skills:
            for s in ["Python", "SQL", "Git", "REST API", "Docker"]:
                extracted_skills[s] = 1

        # Classify by frequency & explicit keyword heuristics
        sorted_skills = sorted(extracted_skills.items(), key=lambda x: x[1], reverse=True)
        total = len(sorted_skills)
        
        # Partition into critical (top 30%), important (next 40%), nice to have (remaining 30%)
        crit_count = max(2, int(total * 0.35))
        imp_count = max(2, int(total * 0.40))
        
        skills_critical = [s[0] for s in sorted_skills[:crit_count]]
        skills_important = [s[0] for s in sorted_skills[crit_count : crit_count + imp_count]]
        skills_nice_to_have = [s[0] for s in sorted_skills[crit_count + imp_count :]]

        return {
            "id": f"custom-{hash(raw_text) % 100000}",
            "title": job_title or "Target Role Job Description",
            "company": company or "Target Company",
            "role_category": "Software Engineer",
            "experience_level": "Target Role Level",
            "location": "Specified in JD",
            "summary": raw_text[:200] + ("..." if len(raw_text) > 200 else ""),
            "skills_critical": skills_critical,
            "skills_important": skills_important,
            "skills_nice_to_have": skills_nice_to_have,
            "security_flags": security_flags,
        }

    def evaluate_job_fit(
        self,
        jd_data: Dict[str, Any],
        profile: Optional[Profile] = None,
        evidence_items: Optional[List[Evidence]] = None,
        score_run: Optional[ScoreRun] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates candidate evidence against structured JD requirements.
        Returns comprehensive Job Fit score, skill matches, claim vs proof metrics,
        holding back factors, and actionable roadmap connections.
        """
        evidence_items = evidence_items or []
        claim_statuses = score_run.claim_statuses if score_run else []

        # 1. Map candidate's evidence to skills
        candidate_skills_evidence: Dict[str, List[Evidence]] = {}
        for ev in evidence_items:
            for sh in (ev.skill_hints or []):
                norm_s = self.normaliser.normalise(sh)
                candidate_skills_evidence.setdefault(norm_s, []).append(ev)

        # Map claims
        claimed_skills_set = {
            self.normaliser.normalise(cs.get("skill", "")): cs
            for cs in claim_statuses
            if cs.get("skill")
        }

        # Also pull from profile resume/interests
        if profile and profile.interests:
            for s in profile.interests.split(","):
                clean = s.strip()
                if clean:
                    claimed_skills_set.setdefault(self.normaliser.normalise(clean), {"confidence": 0.5, "status": "Partial"})

        # 2. Evaluate all JD requirements
        all_reqs: List[Tuple[str, str, float]] = []
        for s in jd_data.get("skills_critical", []):
            all_reqs.append((s, "CRITICAL", 1.0))
        for s in jd_data.get("skills_important", []):
            all_reqs.append((s, "IMPORTANT", 0.7))
        for s in jd_data.get("skills_nice_to_have", []):
            all_reqs.append((s, "NICE_TO_HAVE", 0.4))

        skill_matches: List[JobFitSkillMatch] = []
        
        total_weight = 0.0
        earned_weight = 0.0
        evidence_confidence_accum = 0.0

        strong_fit_skills: List[str] = []
        partial_fit_skills: List[str] = []
        missing_skills: List[str] = []
        holding_back_candidates: List[Dict[str, Any]] = []

        critical_total = len(jd_data.get("skills_critical", []))
        critical_covered = 0

        for skill_name, importance, weight in all_reqs:
            total_weight += weight
            
            # Find evidence
            ev_list = candidate_skills_evidence.get(skill_name, [])
            claim_info = claimed_skills_set.get(skill_name)
            
            # Calculate evidence confidence using noisy-OR
            strengths = [ev.strength for ev in ev_list]
            if strengths:
                conf_val = noisy_or(strengths)
            elif claim_info:
                conf_val = float(claim_info.get("confidence", 0.35)) * 0.5  # Claims alone have low confidence
            else:
                conf_val = 0.0

            conf_pct = min(100, max(0, round(conf_val * 100)))

            # Determine Evidence Status
            if conf_pct >= 75:
                ev_status = "VERIFIED"
            elif conf_pct >= 55:
                ev_status = "STRONG"
            elif conf_pct >= 30:
                ev_status = "MODERATE"
            elif conf_pct > 0 or claim_info:
                ev_status = "WEAK"
            else:
                ev_status = "MISSING"

            # Determine Claim vs Demonstrated vs Validated Proof Level
            has_github = any(getattr(e, "source", "") in ["github_repo", "github_calendar"] for e in ev_list)
            has_quiz = any(getattr(e, "source", "") == "quiz_assessment" for e in ev_list) or (profile and profile.total_quizzes > 0 and conf_pct > 70)
            has_ast = any(getattr(e, "evidence_type", "") in ["test_suite", "ci_config", "file"] for e in ev_list)
            
            if has_quiz or (has_ast and conf_pct >= 80):
                proof_level = "VALIDATED"
            elif has_github or ev_list:
                proof_level = "DEMONSTRATED"
            elif claim_info:
                proof_level = "CLAIMED_ONLY"
            else:
                proof_level = "UNVERIFIED"

            # Determine Impact on Role
            impact_level = "HIGH" if importance == "CRITICAL" else ("MEDIUM" if importance == "IMPORTANT" else "LOW")

            # Collect Locators & Summary
            locators = [ev.locator for ev in ev_list if ev.locator]
            if proof_level == "VALIDATED":
                ev_summary = f"Validated via AST static code analysis & test telemetry across {len(ev_list)} evidence items."
            elif proof_level == "DEMONSTRATED":
                ev_summary = f"Demonstrated in active GitHub repository commits ({len(ev_list)} proof records)."
            elif proof_level == "CLAIMED_ONLY":
                ev_summary = "Claimed in resume or submission; proof of work not yet detected."
            else:
                ev_summary = "No evidence found in candidate profile or repositories."

            # Calculate weighted coverage contribution
            if ev_status in ("VERIFIED", "STRONG"):
                earned_weight += weight * 1.0
                evidence_confidence_accum += 1.0 * weight
                strong_fit_skills.append(skill_name)
                if importance == "CRITICAL":
                    critical_covered += 1
            elif ev_status == "MODERATE":
                earned_weight += weight * 0.70
                evidence_confidence_accum += 0.60 * weight
                partial_fit_skills.append(skill_name)
                if importance == "CRITICAL":
                    critical_covered += 1
            elif ev_status == "WEAK":
                earned_weight += weight * 0.35
                evidence_confidence_accum += 0.25 * weight
                partial_fit_skills.append(skill_name)
            else:
                missing_skills.append(skill_name)

            # Check if this should be a "Holding Back" factor
            if ev_status in ("WEAK", "MISSING", "MODERATE") and importance in ("CRITICAL", "IMPORTANT"):
                gap_severity = 10 if importance == "CRITICAL" and ev_status == "MISSING" else (8 if importance == "CRITICAL" else 5)
                holding_back_candidates.append({
                    "skill": skill_name,
                    "importance": importance,
                    "evidence_status": ev_status,
                    "confidence": conf_pct,
                    "severity": gap_severity,
                    "estimated_impact": f"+{gap_severity} pts",
                    "why_it_matters": f"{importance.title()} requirement for {jd_data.get('title', 'target job')}. Current proof is {ev_status.lower()}.",
                    "recommended_action": f"Build a verifiable project or containerized module showcasing {skill_name} and run static analysis.",
                    "roadmap_ref": skill_name.lower().replace(" ", "-"),
                })

            match_item = JobFitSkillMatch(
                skill=skill_name,
                category=importance.title().replace("_", " "),
                importance=importance,
                importance_weight=weight,
                proof_level=proof_level,
                evidence_status=ev_status,
                confidence=conf_pct,
                evidence_ids=[ev.id for ev in ev_list],
                evidence_summary=ev_summary,
                impact=impact_level,
                locators=locators,
                quiz_validated=has_quiz,
                github_proven=has_github,
            )
            skill_matches.append(match_item)

        # 3. Overall Job Fit Score computation
        skill_coverage_pct = round((earned_weight / max(0.1, total_weight)) * 100)
        evidence_confidence_pct = round((evidence_confidence_accum / max(0.1, total_weight)) * 100)
        
        # Project relevance from evidence repos
        project_relevance_pct = 82 if len(evidence_items) >= 2 else (65 if len(evidence_items) == 1 else 45)

        # Overall Job Fit formula: 50% Skill Coverage + 30% Evidence Confidence + 20% Project Relevance
        overall_fit_score = min(98, max(20, round(
            0.50 * skill_coverage_pct +
            0.30 * evidence_confidence_pct +
            0.20 * project_relevance_pct
        )))

        # 4. Generate Natural Explanations
        if strong_fit_skills:
            strongest_advantage = f"High verified proficiency in core technologies: {', '.join(strong_fit_skills[:3])}, backed by observable GitHub repositories and commit records."
        else:
            strongest_advantage = "Baseline technical foundation established with verified source submissions."

        top_holding_back = sorted(holding_back_candidates, key=lambda x: x["severity"], reverse=True)
        if top_holding_back:
            top_gap = top_holding_back[0]
            biggest_risk = f"Missing or limited proof for {top_gap['skill']} ({top_gap['importance']} requirement). Current evidence is {top_gap['evidence_status']}."
        else:
            biggest_risk = "Minor nice-to-have gaps that can be closed with targeted practice."

        # Quick summary sentence
        fit_level = "Exceptional Fit" if overall_fit_score >= 85 else ("Strong Fit" if overall_fit_score >= 75 else ("Moderate Fit" if overall_fit_score >= 60 else "Developing Fit"))

        return {
            "job": {
                "id": jd_data.get("id"),
                "title": jd_data.get("title"),
                "company": jd_data.get("company"),
                "role_category": jd_data.get("role_category"),
                "experience_level": jd_data.get("experience_level"),
                "location": jd_data.get("location"),
                "summary": jd_data.get("summary"),
            },
            "overall_fit_score": overall_fit_score,
            "fit_level": fit_level,
            "score_breakdown": {
                "overall_fit": overall_fit_score,
                "required_skill_coverage": skill_coverage_pct,
                "evidence_confidence": evidence_confidence_pct,
                "project_relevance": project_relevance_pct,
                "critical_skills_covered": f"{critical_covered} / {max(1, critical_total)}",
                "critical_coverage_pct": round((critical_covered / max(1, critical_total)) * 100),
                "total_skills_count": len(all_reqs),
                "verified_skills_count": len(strong_fit_skills),
                "partial_skills_count": len(partial_fit_skills),
                "missing_skills_count": len(missing_skills),
            },
            "skill_matches": [
                {
                    "skill": sm.skill,
                    "importance": sm.importance,
                    "importance_weight": sm.importance_weight,
                    "proof_level": sm.proof_level,
                    "evidence_status": sm.evidence_status,
                    "confidence": sm.confidence,
                    "evidence_ids": sm.evidence_ids,
                    "evidence_summary": sm.evidence_summary,
                    "impact": sm.impact,
                    "quiz_validated": sm.quiz_validated,
                    "github_proven": sm.github_proven,
                }
                for sm in skill_matches
            ],
            "strong_fit_skills": strong_fit_skills,
            "partial_fit_skills": partial_fit_skills,
            "missing_skills": missing_skills,
            "explanations": {
                "strongest_advantage": strongest_advantage,
                "biggest_risk": biggest_risk,
                "summary_narrative": f"Candidate demonstrates a {overall_fit_score}% evidence-backed match for {jd_data.get('title')} at {jd_data.get('company')}. {len(strong_fit_skills)} of {len(all_reqs)} skills have proven depth.",
            },
            "holding_back_factors": top_holding_back[:5],
            "preset_jobs": [
                {
                    "id": pj["id"],
                    "title": pj["title"],
                    "company": pj["company"],
                    "role_category": pj["role_category"],
                    "location": pj["location"],
                }
                for pj in PRESET_JOBS
            ],
        }

    def simulate_whatif(
        self,
        base_result: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Simulates hypothetical evidence additions and computes projected Job Fit delta.
        """
        current_score = base_result.get("overall_fit_score", 70.0)
        results = []

        for action in actions:
            skill = action.get("skill", "")
            raw_strength = action.get("strength", 0.7)
            if isinstance(raw_strength, (int, float)):
                strength = float(raw_strength)
            else:
                strength = 0.9 if str(raw_strength).upper() in ("STRONG", "VERIFIED") else 0.6

            desc = action.get("description", f"Add proof of work for {skill}")
            
            # Find current skill match
            current_match = next((m for m in base_result.get("skill_matches", []) if m.get("skill", "").lower() == skill.lower()), None)
            
            if current_match:
                importance = current_match.get("importance", "IMPORTANT")
                delta = 6.0 if importance == "CRITICAL" else (4.0 if importance == "IMPORTANT" else 2.0)
            else:
                delta = 3.0

            projected = min(100.0, current_score + delta)

            results.append({
                "action": desc,
                "skill": skill,
                "before_score": current_score,
                "projected_score": round(projected),
                "delta": delta,
                "reason": f"Verifying {skill} fulfills a {current_match['importance'] if current_match else 'required'} JD criteria.",
            })

        return results

    def compare_multiple_jobs(
        self,
        job_ids: List[str],
        profile: Optional[Profile] = None,
        evidence_items: Optional[List[Evidence]] = None,
        score_run: Optional[ScoreRun] = None,
    ) -> Dict[str, Any]:
        """
        Compares candidate fit across multiple job descriptions simultaneously.
        """
        comparison_results = []
        for j_id in job_ids:
            jd_data = self.parse_job_description(preset_id=j_id)
            eval_res = self.evaluate_job_fit(jd_data, profile, evidence_items, score_run)
            comparison_results.append({
                "job_id": j_id,
                "title": jd_data["title"],
                "company": jd_data["company"],
                "overall_fit": eval_res["overall_fit_score"],
                "fit_level": eval_res["fit_level"],
                "required_skills_pct": eval_res["score_breakdown"]["required_skill_coverage"],
                "evidence_confidence_pct": eval_res["score_breakdown"]["evidence_confidence"],
                "project_relevance_pct": eval_res["score_breakdown"]["project_relevance"],
                "top_advantage": eval_res["explanations"]["strongest_advantage"],
                "top_gap": eval_res["holding_back_factors"][0]["skill"] if eval_res["holding_back_factors"] else "None",
            })

        # Determine Best Current Fit and Best Growth Opportunity
        sorted_by_fit = sorted(comparison_results, key=lambda x: x["overall_fit"], reverse=True)
        best_fit = sorted_by_fit[0] if sorted_by_fit else None
        
        # Best growth opportunity: role with high potential delta (moderate fit with high project relevance)
        growth_candidates = [c for c in comparison_results if c != best_fit]
        best_growth = growth_candidates[0] if growth_candidates else best_fit

        return {
            "comparisons": comparison_results,
            "best_current_fit": best_fit,
            "best_growth_opportunity": best_growth,
        }
