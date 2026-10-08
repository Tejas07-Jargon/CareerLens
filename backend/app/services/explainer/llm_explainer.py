"""
LLM Explainer with citation enforcement - uses Gemini REST API directly.
"""

import json
import re
from typing import Any, Dict, List, Optional

import httpx
import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)

CITATION_PATTERN = re.compile(r"\[ev:[a-f0-9\-]+\]")

_GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
]


def _validate_citations(text: str, evidence_ids: List[str]) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s for s in sentences if s and not CITATION_PATTERN.search(s)]


async def _call_gemini_rest(api_key: str, prompt: str, json_mode: bool = False) -> str:
    generation_config: Dict[str, Any] = {"temperature": 0.3, "maxOutputTokens": 2048}
    if json_mode:
        generation_config["responseMimeType"] = "application/json"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }
    last_error = "No models tried"
    async with httpx.AsyncClient(timeout=45.0) as client:
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
                        return text
                    last_error = f"Model {model}: empty text"
                elif resp.status_code in (429, 503):
                    last_error = f"Model {model} rate-limited"
                else:
                    last_error = f"Model {model} error {resp.status_code}"
            except Exception as exc:
                last_error = f"Model {model}: {exc}"
    raise RuntimeError(f"All Gemini models failed. Last: {last_error}")


class LLMExplainer:
    """Generates explanations and roadmaps from computed evidence data."""

    def __init__(self):
        self._api_key: Optional[str] = None
        raw_key = settings.get_gemini_api_key()
        if raw_key and raw_key not in {"your_gemini_key_here", ""}:
            self._api_key = raw_key
            log.info("LLMExplainer: Gemini REST API configured")
        else:
            log.info("LLMExplainer: No valid GEMINI_API_KEY - using deterministic templates")

    @property
    def has_api(self) -> bool:
        return bool(self._api_key)

    def explain_score(
        self,
        components: List[Dict[str, Any]],
        gaps: List[Dict[str, Any]],
        claim_statuses: List[Dict[str, Any]],
        score_mid: float,
        score_lo: float,
        score_hi: float,
    ) -> str:
        import asyncio
        if not self.has_api:
            return self._stub_explanation(score_mid, score_lo, score_hi, components, gaps)

        evidence_context = self._build_evidence_context(components, claim_statuses)
        prompt = (
            "You are Kareer Kranti, an employability analysis system. Explain the score below.\n\n"
            "RULES (MANDATORY):\n"
            "- Every sentence must cite at least one evidence ID using the format [ev:uuid].\n"
            "- Do NOT mention the student name, gender, or college.\n"
            "- Be concise: 3-5 sentences maximum.\n"
            "- Tone: clear, professional, encouraging.\n\n"
            f"Score: {score_mid:.0f} (range {score_lo:.0f}-{score_hi:.0f})\n"
            f"Evidence context:\n{evidence_context}\n"
            f"Component breakdown:\n{json.dumps(components, indent=2)}\n"
            f"Top gaps:\n{json.dumps(gaps[:3], indent=2)}\n"
        )
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, _call_gemini_rest(self._api_key, prompt))
                    narrative = future.result(timeout=50)
            else:
                narrative = asyncio.run(_call_gemini_rest(self._api_key, prompt))
            narrative = narrative.strip()
            invalid = _validate_citations(narrative, [])
            if invalid:
                log.warning("Explainer produced uncited sentences", count=len(invalid))
                narrative = " ".join(
                    s for s in re.split(r"(?<=[.!?])\s+", narrative)
                    if CITATION_PATTERN.search(s)
                ) or self._stub_explanation(score_mid, score_lo, score_hi, components, gaps)
            return narrative
        except Exception as exc:
            log.error("LLM explanation failed", error=str(exc))
            return self._stub_explanation(score_mid, score_lo, score_hi, components, gaps)

    def generate_roadmap(
        self,
        gaps: List[Dict[str, Any]],
        interests: str,
        weekly_hours: int,
        target_role: str,
        own_repos: List[str],
    ) -> List[Dict[str, Any]]:
        import asyncio
        if not self.has_api:
            return self._stub_roadmap(gaps, target_role, own_repos)

        prompt = (
            "Generate a personalised learning roadmap as JSON.\n\n"
            f"Target role: {target_role}\n"
            f"Student interests: {interests or 'not specified'}\n"
            f"Weekly hours available: {weekly_hours or 5}\n"
            f"Own repos: {json.dumps(own_repos)}\n"
            f"Skill gaps:\n{json.dumps(gaps[:8], indent=2)}\n\n"
            'Return ONLY a JSON array. Each element: '
            '{"milestone": str, "gap_closed": str, "estimated_hours": int, '
            '"proof_artifact": str, "related_repo": str|null, "resources": [str]}\n'
            "Generate 5-8 milestones. Personalise proof_artifact to repos and interests.\n"
        )
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, _call_gemini_rest(self._api_key, prompt, json_mode=True))
                    raw = future.result(timeout=50)
            else:
                raw = asyncio.run(_call_gemini_rest(self._api_key, prompt, json_mode=True))
            milestones = json.loads(raw)
            return milestones if isinstance(milestones, list) else milestones.get("milestones", [])
        except Exception as exc:
            log.error("Roadmap generation failed", error=str(exc))
            return self._stub_roadmap(gaps, target_role, own_repos)

    @staticmethod
    def _stub_explanation(mid, lo, hi, components=None, gaps=None) -> str:
        components = components or []
        gaps = gaps or []
        strong = [c for c in components if c.get("value", 0) >= 70]
        weak = [c for c in components if c.get("value", 0) < 50]
        top_gap = gaps[0]["skill"] if gaps else "key skills"
        parts = [f"Overall readiness score: {mid:.0f} (confidence range {lo:.0f}-{hi:.0f})."]
        if strong:
            parts.append(
                f"Strongest components: {', '.join(c['name'] for c in strong[:2])} show solid proof-of-work."
            )
        if weak:
            parts.append(
                f"{', '.join(c['name'] for c in weak[:2])} represent highest-priority improvement areas."
            )
        parts.append(f"Priority: build verifiable proof for {top_gap} to improve your score.")
        return " ".join(parts)

    @staticmethod
    def _stub_roadmap(gaps, target_role="Software Engineer", own_repos=None) -> List[Dict]:
        own_repos = own_repos or []
        resources_map = {
            "Docker": ["https://roadmap.sh/docker", "https://docs.docker.com"],
            "System Design": ["https://roadmap.sh/system-design", "https://bytebytego.com"],
            "AWS": ["https://roadmap.sh/aws", "https://aws.amazon.com/training/"],
            "Kubernetes": ["https://roadmap.sh/kubernetes"],
            "React": ["https://react.dev"],
            "TypeScript": ["https://www.typescriptlang.org/docs/"],
            "Machine Learning": ["https://fast.ai"],
        }
        return [
            {
                "milestone": f"Build verifiable {g.get('skill', 'skill')} evidence for {target_role}",
                "gap_closed": g.get("skill", "Unknown"),
                "estimated_hours": max(10, round(g.get("priority_score", 0.5) * 25)),
                "proof_artifact": g.get("action") or f"Push a {g.get('skill', 'skill')} project to GitHub with tests.",
                "related_repo": own_repos[0] if own_repos else None,
                "resources": resources_map.get(
                    g.get("skill", ""),
                    [f"https://roadmap.sh/{g.get('skill', 'software').lower().replace(' ', '-')}"]
                ),
            }
            for g in gaps[:6]
        ]

    @staticmethod
    def _build_evidence_context(components, claim_statuses) -> str:
        lines = []
        for comp in components:
            for ev_id in comp.get("evidence_ids", [])[:3]:
                lines.append(f"[ev:{ev_id}] - {comp['name']} component")
        for cs in claim_statuses[:5]:
            for ev_id in cs.get("evidence_ids", [])[:2]:
                lines.append(f"[ev:{ev_id}] - supports claim: {cs['skill']}")
        return "\n".join(lines[:20])
