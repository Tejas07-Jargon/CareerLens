"""
ScoreRun – one immutable snapshot of a score calculation.

Every run stores the input_hash (sha256 of the evidence IDs + weights version)
so any score can be reproduced. The interval [score_lo, score_hi] captures
uncertainty from unobserved sources.
"""

import uuid
from datetime import datetime
from typing import Dict, List

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ScoreRun(Base):
    __tablename__ = "score_runs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Reproducibility ───────────────────────────────────────────────────────
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    weights_version: Mapped[str] = mapped_column(String(32), default="v1")
    role: Mapped[str] = mapped_column(String(128), nullable=False)

    # ── Score interval ────────────────────────────────────────────────────────
    score_mid: Mapped[float] = mapped_column(Float, nullable=False)
    score_lo: Mapped[float] = mapped_column(Float, nullable=False)
    score_hi: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Component breakdown ───────────────────────────────────────────────────
    # {component_name: {value, weight, reason, evidence_ids: [...]}}
    components: Mapped[Dict] = mapped_column(JSON, default=dict)

    # ── Credibility indicator (separate from score) ────────────────────────────
    # {verified_ratio, flags: [...]}
    credibility: Mapped[Dict] = mapped_column(JSON, default=dict)

    # ── Per-claim status ──────────────────────────────────────────────────────
    # [{skill, status, confidence, evidence_ids, locators}]
    claim_statuses: Mapped[List] = mapped_column(JSON, default=list)

    # ── Role fit ──────────────────────────────────────────────────────────────
    # [{role, fit_pct, gap_skills: [...]}]
    role_fits: Mapped[List] = mapped_column(JSON, default=list)

    # ── Gap report ────────────────────────────────────────────────────────────
    # [{skill, importance, market_frequency, current_evidence, action}]
    gaps: Mapped[List] = mapped_column(JSON, default=list)

    # ── Roadmap ───────────────────────────────────────────────────────────────
    # [{milestone, gap_closed, hours, proof_artifact, related_repo?}]
    roadmap: Mapped[List] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="score_runs")
