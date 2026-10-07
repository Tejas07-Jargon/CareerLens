"""
Design portfolio adapter – upload-only (screenshot / PDF).

Because Behance and Figma have no dependable public APIs, the student uploads
screenshots or a PDF export. A vision model evaluates each case study against
a 5-item rubric.

Rubric items (each scored 0–1)
──────────────────────────────
1. Problem statement clarity   – Is the design problem stated?
2. Process documentation       – Are ideation/wireframe/iteration steps shown?
3. Visual quality              – Typography, colour, spacing, hierarchy
4. Outcome / impact            – Are results, metrics or user feedback shown?
5. Case study depth            – Number of screens / steps shown (quantity proxy)
"""

from pathlib import Path
from typing import Any, Dict, List, Tuple

import structlog

from app.core.config import settings
from app.models.evidence import Evidence

log = structlog.get_logger(__name__)

DESIGN_SOURCE_RELIABILITY = 0.70
RUBRIC_ITEMS = [
    "problem_statement_clarity",
    "process_documentation",
    "visual_quality",
    "outcome_impact",
    "case_study_depth",
]


class DesignPortfolioAdapter:
    """
    Extracts Evidence from uploaded design portfolio images / PDF.

    Usage
    -----
    adapter = DesignPortfolioAdapter(file_path="uploads/portfolio.pdf", profile_id="...")
    evidence, score_detail = adapter.extract()
    """

    def __init__(self, file_path: str, profile_id: str):
        self.file_path = Path(file_path)
        self.profile_id = profile_id

    def extract(self) -> Tuple[List[Evidence], Dict[str, float]]:
        """
        Returns (evidence_list, rubric_scores).
        evidence_list: one Evidence record per rubric dimension that scores > 0
        rubric_scores: {rubric_item: 0–1}
        """
        images = self._to_images()
        rubric_scores = self._evaluate_via_vision(images)
        evidence = self._build_evidence(rubric_scores)
        return evidence, rubric_scores

    def _to_images(self) -> List[bytes]:
        """Convert the first 6 pages/frames to PNG bytes for the vision model."""
        suffix = self.file_path.suffix.lower()
        images: List[bytes] = []

        if suffix == ".pdf":
            try:
                import fitz
                doc = fitz.open(str(self.file_path))
                for i, page in enumerate(doc):
                    if i >= 6:
                        break
                    pix = page.get_pixmap(dpi=150)
                    images.append(pix.tobytes("png"))
            except Exception as exc:
                log.error("PDF-to-image conversion failed", error=str(exc))

        elif suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            images.append(self.file_path.read_bytes())

        return images

    def _evaluate_via_vision(self, images: List[bytes]) -> Dict[str, float]:
        """
        Ask the vision model to score each rubric item.
        Returns {rubric_item: 0.0–1.0}.
        """
        import json
        import google.generativeai as genai

        if not images or not settings.GEMINI_API_KEY:
            log.warning("No images or API key — returning zero rubric scores")
            return {k: 0.0 for k in RUBRIC_ITEMS}

        genai.configure(api_key=settings.get_gemini_api_key())
        model = genai.GenerativeModel(settings.LLM_STRONG_MODEL)

        # Build content parts
        content_parts = []
        for img_bytes in images[:4]:  # limit to 4 images
            content_parts.append({"mime_type": "image/png", "data": img_bytes})

        prompt = """
Evaluate this design portfolio using the rubric below.
Score each item from 0.0 to 1.0. Return ONLY valid JSON:

{
  "problem_statement_clarity": <0.0-1.0>,
  "process_documentation": <0.0-1.0>,
  "visual_quality": <0.0-1.0>,
  "outcome_impact": <0.0-1.0>,
  "case_study_depth": <0.0-1.0>,
  "reasoning": "<one sentence per item>"
}

Rubric:
- problem_statement_clarity: Is the design problem clearly stated?
- process_documentation: Are ideation, wireframe, and iteration steps shown?
- visual_quality: Typography, colour, spacing, and hierarchy quality.
- outcome_impact: Are results, metrics, or user feedback shown?
- case_study_depth: Depth and breadth of screens and steps.
"""
        content_parts.append(prompt)

        try:
            response = model.generate_content(content_parts)
            parsed = json.loads(response.text)
            scores = {k: float(parsed.get(k, 0.0)) for k in RUBRIC_ITEMS}
            return scores
        except Exception as exc:
            log.error("Vision rubric evaluation failed", error=str(exc))
            return {k: 0.0 for k in RUBRIC_ITEMS}

    def _build_evidence(self, rubric_scores: Dict[str, float]) -> List[Evidence]:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        items: List[Evidence] = []

        skill_map = {
            "problem_statement_clarity": ["UX Research", "Product Thinking"],
            "process_documentation": ["Design Process", "UX Design"],
            "visual_quality": ["Visual Design", "UI Design"],
            "outcome_impact": ["Product Thinking", "UX Research"],
            "case_study_depth": ["UI Design", "UX Design"],
        }

        for rubric_item, score in rubric_scores.items():
            if score < 0.05:
                continue
            items.append(
                Evidence(
                    profile_id=self.profile_id,
                    source="design_portfolio",
                    source_url=str(self.file_path.name),
                    evidence_type=f"design_rubric_{rubric_item}",
                    skill_hints=skill_map.get(rubric_item, ["Design"]),
                    reliability=DESIGN_SOURCE_RELIABILITY,
                    depth=score,
                    recency=1.0,
                    authenticity=0.8,
                    locator={"file": self.file_path.name, "rubric_item": rubric_item},
                    extractor_id="design_portfolio_adapter_v1::vision_rubric",
                    observed_at=now,
                )
            )
        return items
