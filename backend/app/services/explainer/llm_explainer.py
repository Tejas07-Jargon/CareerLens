"""
LLM Explainer with citation enforcement.

Rules:
  1. The explainer receives ONLY evidence IDs and computed numbers.
     It never sees raw resume text or raw repo content.
  2. Every sentence in the output must cite at least one evidence ID.
     A validator rejects any sentence that doesn't.
  3. Scoring never calls this module — explanations are generated
     after the score is finalised.
  4. Roadmap output is schema-bound JSON.

Two modes:
  • explain_score   – narrates the score components and gaps
  • generate_roadmap – produces a milestone-based JSON roadmap
"""

import json
import re
from typing import Any, Dict, List

import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)

CITATION_PATTERN = re.compile(r"\[ev:[a-f0-9\-]+\]")


def _validate_citations(text: str, evidence_ids: List[str]) -> List[str]:
    """
    Return sentences that contain no evidence citation.
    A citation looks like [ev:uuid].
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    invalid = []
    for sentence in sentences:
        if sentence and not CITATION_PATTERN.search(sentence):
            invalid.append(sentence)
    return invalid


class LLMExplainer:
    """
    Generates explanations and roadmaps from computed evidence data.

    Usage
    -----
    explainer = LLMExplainer()
    narrative = explainer.explain_score(score_result, evidence_summaries)
    roadmap = explainer.generate_roadmap(gaps, interests, weekly_hours)
    """

    def __init__(self):
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY not in {"your_gemini_key_here", ""}:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.get_gemini_api_key())
                self._model = genai.GenerativeModel(settings.LLM_STRONG_MODEL)
            except Exception as exc:
                self._model = None
                log.warning("Could not initialize Gemini model", error=str(exc))
        else:
            self._model = None
            log.info("No valid GEMINI_API_KEY — using deterministic templates for explanations and roadmap")

    # ── Score narrative ───────────────────────────────────────────────────────

    def explain_score(
        self,
        components: List[Dict[str, Any]],
        gaps: List[Dict[str, Any]],
        claim_statuses: List[Dict[str, Any]],
        score_mid: float,
        score_lo: float,
        score_hi: float,
    ) -> str:
        """
        Returns a plain-English narrative of the score.
        Each sentence must cite at least one evidence ID.
        """
        if self._model is None:
            return self._stub_explanation(score_mid, score_lo, score_hi)

        evidence_context = self._build_evidence_context(components, claim_statuses)
        prompt = f"""
You are CareerLens, an employability analysis system. Explain the score below.

RULES (MANDATORY):
- Every sentence must cite at least one evidence ID using the format [ev:uuid].
- Do NOT mention the student's name, gender, or college.
- Do NOT make recommendations (those are in the roadmap).
- Be concise: 3–5 sentences maximum.
- Tone: clear, professional, encouraging.

Score: {score_mid:.0f} (range {score_lo:.0f}–{score_hi:.0f})

Evidence context (use these IDs in citations):
{evidence_context}

Component breakdown:
{json.dumps(components, indent=2)}

Top 3 gaps:
{json.dumps(gaps[:3], indent=2)}
"""
        try:
            response = self._model.generate_content(prompt)
            narrative = response.text.strip()

            # Validate citations
            invalid_sentences = _validate_citations(
                narrative,
                [c["evidence_ids"] for c in components if c.get("evidence_ids")],
            )
            if invalid_sentences:
                log.warning(
                    "Explainer produced uncited sentences",
                    count=len(invalid_sentences),
                )
                # Strip uncited sentences (safety fallback)
                narrative = " ".join(
                    s for s in re.split(r"(?<=[.!?])\s+", narrative)
                    if CITATION_PATTERN.search(s)
                )

            return narrative
        except Exception as exc:
            log.error("LLM explanation failed", error=str(exc))
            return self._stub_explanation(score_mid, score_lo, score_hi)

    # ── Roadmap generation ────────────────────────────────────────────────────

    def generate_roadmap(
        self,
        gaps: List[Dict[str, Any]],
        interests: str,
        weekly_hours: int,
        target_role: str,
        own_repos: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Returns a list of milestone dicts matching this schema:
        {
          "milestone": str,
          "gap_closed": str,
          "estimated_hours": int,
          "proof_artifact": str,
          "related_repo": str | null,
          "resources": [str]
        }
        """
        if self._model is None:
            return self._stub_roadmap(gaps)

        prompt = f"""
Generate a personalised learning roadmap as JSON.

Target role: {target_role}
Student interests: {interests or "not specified"}
Weekly hours available: {weekly_hours or 5}
Student's own repos (reference these when relevant): {json.dumps(own_repos)}

Top skill gaps to address (ranked by priority):
{json.dumps(gaps[:8], indent=2)}

Return ONLY a JSON array. Each element must match this schema exactly:
{{
  "milestone": "<short action title>",
  "gap_closed": "<the skill this closes>",
  "estimated_hours": <integer>,
  "proof_artifact": "<specific deliverable: e.g. 'Add 10 pytest tests to my-api repo'>",
  "related_repo": "<repo name from student's list, or null>",
  "resources": ["<URL or resource title>"]
}}

Personalise proof_artifact to the student's repos and interests.
Generate 5–8 milestones.
"""
        try:
            response = self._model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            milestones = json.loads(response.text)
            if isinstance(milestones, list):
                return milestones
            return milestones.get("milestones", [])
        except Exception as exc:
            log.error("Roadmap generation failed", error=str(exc))
            return self._stub_roadmap(gaps)

    # ── Stubs (when no API key) ───────────────────────────────────────────────

    @staticmethod
    def _stub_explanation(mid: float, lo: float, hi: float) -> str:
        return (
            f"Score: {mid:.0f} (range {lo:.0f}–{hi:.0f}). "
            "Evidence explanation unavailable — please configure GEMINI_API_KEY."
        )

    @staticmethod
    def _stub_roadmap(gaps: List[Dict]) -> List[Dict]:
        return [
            {
                "milestone": f"Build evidence for {g['skill']}",
                "gap_closed": g["skill"],
                "estimated_hours": 10,
                "proof_artifact": f"Push a project demonstrating {g['skill']} to GitHub.",
                "related_repo": None,
                "resources": [],
            }
            for g in gaps[:5]
        ]

    @staticmethod
    def _build_evidence_context(
        components: List[Dict],
        claim_statuses: List[Dict],
    ) -> str:
        lines = []
        for comp in components:
            for ev_id in comp.get("evidence_ids", [])[:3]:
                lines.append(f"[ev:{ev_id}] — {comp['name']} component")
        for cs in claim_statuses[:5]:
            for ev_id in cs.get("evidence_ids", [])[:2]:
                lines.append(f"[ev:{ev_id}] — supports claim: {cs['skill']}")
        return "\n".join(lines[:20])  # cap context size
