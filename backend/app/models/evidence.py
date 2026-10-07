"""
Evidence – the central data contract.

Every fact the system knows is an Evidence record. Every output (score, gap,
roadmap) is a pure function of these records. This keeps explanations auditable
and the scorer unit-testable.

Fields
------
id              UUID primary key
profile_id      owning Profile
source          Which adapter created this (github_repo, resume, design_portfolio, …)
source_url      Canonical URL or file reference for the source
evidence_type   commit | file | language | test_suite | ci_config | certificate |
                portfolio_case | jd_match | live_probe | …
skill_hints     Normalised skill names this evidence supports (JSON list)
reliability     float [0,1] — how trustworthy the source type is
depth           float [0,1] — how deeply the evidence demonstrates the skill
recency         float [0,1] — 1.0 = this week, decays with half-life
authenticity    float [0,1] — authorship / originality signals
locator         JSON blob: {repo, path, commit_sha, line_start?, line_end?}
                Used to render click-through provenance in the UI.
extractor_id    Which extractor version produced this record
observed_at     Wall clock time the evidence was fetched
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Source metadata ───────────────────────────────────────────────────────
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)

    # ── Skill links ───────────────────────────────────────────────────────────
    skill_hints: Mapped[List[str]] = mapped_column(JSON, default=list)

    # ── Strength inputs (all in [0, 1]) ───────────────────────────────────────
    reliability: Mapped[float] = mapped_column(Float, default=0.5)
    depth: Mapped[float] = mapped_column(Float, default=0.5)
    recency: Mapped[float] = mapped_column(Float, default=1.0)
    authenticity: Mapped[float] = mapped_column(Float, default=1.0)

    # ── Provenance ────────────────────────────────────────────────────────────
    # JSON: {repo?, path?, commit_sha?, line_start?, line_end?, page?, region?}
    locator: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # ── Lineage ───────────────────────────────────────────────────────────────
    extractor_id: Mapped[str] = mapped_column(String(128), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    profile = relationship("Profile", back_populates="evidence_items")
    claim_edges = relationship(
        "ClaimEvidence", back_populates="evidence", cascade="all, delete-orphan"
    )

    @property
    def strength(self) -> float:
        """
        Per-evidence strength: s = reliability × depth × recency × authenticity.
        Scores in [0, 1]. Used as input to the noisy-OR claim confidence formula.
        """
        return self.reliability * self.depth * self.recency * self.authenticity


class ClaimEvidence(Base):
    """
    Edge table linking a resume claim (skill name) to an Evidence record.

    relation: 'supports' | 'weak' | 'contradicts'
    weight:   how much this edge contributes to the noisy-OR accumulation
    """

    __tablename__ = "claim_evidence"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    claim_skill: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    evidence_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation: Mapped[str] = mapped_column(String(32), default="supports")
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    evidence = relationship("Evidence", back_populates="claim_edges")
