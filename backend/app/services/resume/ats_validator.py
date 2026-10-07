"""
ATS Validator Service.

Performs deterministic ATS formatting, structure, and evidence-integrity checks.
Provides constructive, neutral feedback without false promises of 100% compliance.
"""

from typing import Any, Dict, List, Optional
import re
from app.services.analysis.skill_normaliser import SkillNormaliser


class ATSValidator:
    """
    Validates resume structure, formatting conventions, and verifiable evidence integrity.
    """

    def __init__(self):
        self.normaliser = SkillNormaliser()

    def validate(
        self,
        resume_content: Dict[str, Any],
        known_evidence_skills: Optional[List[str]] = None,
        target_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        checks: List[Dict[str, Any]] = []
        warnings: List[Dict[str, Any]] = []
        evidence_alerts: List[Dict[str, Any]] = []
        
        known_ev_set = {self.normaliser.normalise(s).lower() for s in (known_evidence_skills or [])}

        # 1. Contact Information
        header = resume_content.get("header", {})
        has_name = bool(header.get("full_name", "").strip())
        has_email = bool(header.get("email", "").strip()) and "@" in header.get("email", "")
        has_github = bool(header.get("github", "").strip())
        
        if has_name and has_email:
            checks.append({
                "id": "contact_info",
                "title": "Contact information present",
                "status": "PASS",
                "detail": "Full name and valid email address detected.",
            })
        else:
            checks.append({
                "id": "contact_info",
                "title": "Missing essential contact information",
                "status": "FAIL",
                "detail": "Provide at least a full name and email for recruiters and ATS parsers.",
            })

        # 2. Standard Section Headings
        sections_present = []
        if resume_content.get("summary"):
            sections_present.append("Summary")
        if resume_content.get("skills"):
            sections_present.append("Skills")
        if resume_content.get("projects"):
            sections_present.append("Projects")
        if resume_content.get("education"):
            sections_present.append("Education")

        if len(sections_present) >= 4:
            checks.append({
                "id": "standard_headings",
                "title": "Standard section headings",
                "status": "PASS",
                "detail": f"Recognized standard ATS sections: {', '.join(sections_present)}.",
            })
        else:
            checks.append({
                "id": "standard_headings",
                "title": "Missing standard headings",
                "status": "WARN",
                "detail": "Include Summary, Skills, Projects, and Education sections for high ATS parse rate.",
            })

        # 3. Professional Summary Length & Tone
        summary = resume_content.get("summary", "")
        if summary:
            word_count = len(summary.split())
            if 15 <= word_count <= 80:
                checks.append({
                    "id": "summary_length",
                    "title": "Concise professional summary",
                    "status": "PASS",
                    "detail": f"Summary is {word_count} words (optimal range: 20-70 words).",
                })
            elif word_count > 80:
                warnings.append({
                    "id": "summary_long",
                    "title": "Summary is slightly verbose",
                    "status": "WARN",
                    "detail": "Aim for a concise 2–4 line summary (under 75 words) to maintain recruiter attention.",
                })

        # 4. Project Bullets & Action Verbs
        projects = resume_content.get("projects", [])
        overly_long_bullets = 0
        action_verb_count = 0
        strong_verbs = {"developed", "architected", "built", "engineered", "implemented", "designed", "optimized", "created", "deployed", "integrated", "automated", "trained", "scaled"}

        for p in projects:
            for b in p.get("bullets", []):
                words = b.split()
                if len(words) > 35:
                    overly_long_bullets += 1
                first_word = words[0].lower().rstrip("ed").rstrip("d") if words else ""
                if any(v.startswith(first_word) for v in strong_verbs):
                    action_verb_count += 1

        if overly_long_bullets == 0:
            checks.append({
                "id": "bullet_conciseness",
                "title": "Action-oriented bullet conciseness",
                "status": "PASS",
                "detail": "Bullet points are concise, scannable, and avoid paragraph bloat.",
            })
        else:
            warnings.append({
                "id": "bullet_conciseness",
                "title": f"{overly_long_bullets} project bullets could be more concise",
                "status": "WARN",
                "detail": "Break long bullets over 35 words into punchy, outcome-oriented statements.",
            })

        # 5. Evidence-Aware Integrity Check (Verify claims against CareerLens Evidence)
        skills_list = resume_content.get("skills", [])
        for s in skills_list:
            s_name = s.get("name", "")
            s_norm = self.normaliser.normalise(s_name).lower()
            ev_status = s.get("evidence_status", "UNVERIFIED")
            
            # If known evidence set is provided and this skill is completely absent from evidence
            if known_ev_set and s_norm not in known_ev_set and ev_status == "VERIFIED":
                evidence_alerts.append({
                    "skill": s_name,
                    "title": f"Evidence Check: {s_name}",
                    "message": f"Claim for '{s_name}' is not currently supported by available CareerLens evidence.",
                    "observed": "No repository commits, tests, or code files detected for this skill.",
                    "severity": "WARN",
                })
            elif ev_status in ("WEAK", "UNVERIFIED"):
                evidence_alerts.append({
                    "skill": s_name,
                    "title": f"Unverified Claim: {s_name}",
                    "message": f"'{s_name}' has weak or unverified evidence in your current profile.",
                    "observed": "We recommend completing a quiz or linking a repo to verify this skill.",
                    "severity": "INFO",
                })

        # 6. Overall ATS result status
        passed_count = sum(1 for c in checks if c["status"] == "PASS")
        total_checks = len(checks) + len(warnings)
        passed_cleanly = len(warnings) == 0 and all(c["status"] == "PASS" for c in checks)

        return {
            "passed_cleanly": passed_cleanly,
            "overall_status_message": "ATS-oriented formatting checks passed." if passed_cleanly else "ATS-oriented checks completed with actionable recommendations.",
            "checks": checks,
            "warnings": warnings,
            "evidence_alerts": evidence_alerts,
            "score": round((passed_count / max(1, total_checks)) * 100),
        }
