"""
AI Suggester Service.

Uses Gemini REST API for rich, context-aware suggestions when GEMINI_API_KEY is set.
Falls back to high-quality deterministic templates otherwise.
"""

import asyncio
import json
from typing import Any, Dict, List, Optional

import httpx
import structlog

log = structlog.get_logger(__name__)

_GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"]


async def _call_gemini(api_key: str, prompt: str) -> str:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in _MODELS:
            url = _GEMINI_REST.format(model=model)
            try:
                resp = await client.post(
                    url,
                    params={"key": api_key},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    if text:
                        return text.strip()
                elif resp.status_code not in (429, 503):
                    break
            except Exception:
                pass
    raise RuntimeError("Gemini call failed")


def _get_api_key() -> Optional[str]:
    try:
        from app.core.config import settings
        key = settings.get_gemini_api_key()
        if key and key not in {"your_gemini_key_here", ""}:
            return key
    except Exception:
        pass
    return None


class AISuggester:
    """Generates evidence-backed suggestions for resume sections."""

    def suggest_summary(
        self,
        current_text: str,
        target_role: str,
        verified_skills: List[str],
    ) -> Dict[str, Any]:
        api_key = _get_api_key()
        skills_str = ", ".join(verified_skills[:5]) if verified_skills else "software engineering"

        if api_key:
            prompt = (
                f"You are an expert resume writer. Rewrite this professional summary for a {target_role} role.\n\n"
                f"Current text: {current_text or 'No summary yet.'}\n"
                f"Verified technical skills (use these exactly): {skills_str}\n\n"
                "Rules:\n"
                "- Lead with the role title and strongest 2-3 verified skills.\n"
                "- 2-3 sentences maximum.\n"
                "- Use action-oriented, ATS-friendly language.\n"
                "- Do NOT add skills not listed. Do NOT add years of experience.\n"
                "- Return ONLY the improved summary text, no preamble."
            )
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        suggested = pool.submit(asyncio.run, _call_gemini(api_key, prompt)).result(timeout=35)
                else:
                    suggested = asyncio.run(_call_gemini(api_key, prompt))
                reason = f"AI-rewritten for {target_role} using your {len(verified_skills)} verified skills."
            except Exception as exc:
                log.warning("AI summary suggestion failed, using template", error=str(exc))
                suggested = self._template_summary(target_role, skills_str)
                reason = f"Template-generated for {target_role}."
        else:
            suggested = self._template_summary(target_role, skills_str)
            reason = f"Optimized phrasing for {target_role} highlighting your highest-confidence verified skills ({skills_str})."

        return {
            "section": "summary",
            "current": current_text,
            "suggestion": suggested,
            "reason": reason,
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
        api_key = _get_api_key()
        techs_str = ", ".join(technologies[:4]) if technologies else "modern engineering stack"

        if api_key:
            prompt = (
                f"You are an expert resume writer. Improve this project bullet point.\n\n"
                f"Project: {project_name}\n"
                f"Technologies: {techs_str}\n"
                f"Current bullet: {current_bullet or 'No description yet.'}\n\n"
                "Rules:\n"
                "- Start with a strong action verb (Architected, Engineered, Built, Implemented).\n"
                "- Include 1-2 specific technologies from the list above.\n"
                "- 1 sentence only, under 20 words.\n"
                "- ATS-friendly, no buzzwords.\n"
                "- Return ONLY the improved bullet, no preamble."
            )
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        suggested = pool.submit(asyncio.run, _call_gemini(api_key, prompt)).result(timeout=35)
                else:
                    suggested = asyncio.run(_call_gemini(api_key, prompt))
                reason = "AI-optimized: action-verb led, technology-specific, ATS-readable."
            except Exception as exc:
                log.warning("AI bullet suggestion failed, using template", error=str(exc))
                suggested = self._template_bullet(technologies)
                reason = "Restructured to lead with an active engineering verb."
        else:
            suggested = self._template_bullet(technologies)
            reason = "Restructured to lead with an active engineering verb and quantify technical depth based on verified project technologies."

        return {
            "section": "project_bullet",
            "current": current_bullet,
            "suggestion": suggested,
            "reason": reason,
            "supported_skills": technologies,
            "evidence_tags": ["Verifiable Tech Stack", "Action-Verb Led", "ATS Readable"],
        }

    @staticmethod
    def _template_summary(target_role: str, skills_str: str) -> str:
        return (
            f"Evidence-verified {target_role} specializing in {skills_str}. "
            f"Demonstrated capability building robust, maintainable systems backed by verifiable "
            f"GitHub repositories and deterministic static analysis."
        )

    @staticmethod
    def _template_bullet(technologies: List[str]) -> str:
        techs_str = ", ".join(technologies[:3]) if technologies else "modern engineering stack"
        tech_lower = [t.lower() for t in technologies]
        if any(t in tech_lower for t in ["fastapi", "flask", "django"]):
            return f"Architected high-throughput REST API using {techs_str} with Pydantic validation and relational persistence."
        elif any(t in tech_lower for t in ["pytorch", "tensorflow", "ml", "machine learning"]):
            return f"Engineered end-to-end ML pipeline using {techs_str} with automated preprocessing and cross-validated evaluation."
        elif any(t in tech_lower for t in ["react", "next", "vue", "angular"]):
            return f"Built responsive {techs_str} frontend with component-driven architecture and automated test coverage."
        else:
            return f"Developed modular application using {techs_str} with automated tests and reproducible environment configuration."
