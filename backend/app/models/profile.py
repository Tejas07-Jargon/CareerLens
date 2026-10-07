"""
Profile – top-level entity representing one student's submission.

Design note: name, gender and college are stored for display only and are
NEVER passed to the scoring functions. The score is purely a function of
Evidence records.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # ── Display fields (NEVER used in scoring) ────────────────────────────────
    display_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # ── Input sources ─────────────────────────────────────────────────────────
    resume_filename: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    github_username: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    linkedin_pdf_filename: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    design_portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Behance/Figma

    # ── Student preferences (used in roadmap personalisation) ─────────────────
    target_role: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    weekly_hours_available: Mapped[Optional[int]] = mapped_column(nullable=True)

    # ── Processing state ──────────────────────────────────────────────────────
    # pending | fast_pass | deep_pass | complete | error
    status: Mapped[str] = mapped_column(String(32), default="pending")
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Security flags (set by defence layer) ─────────────────────────────────
    # JSON list of flag objects: [{type, detail}]
    security_flags: Mapped[List] = mapped_column(JSON, default=list)

    # ── Cohort membership ─────────────────────────────────────────────────────
    cohort_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cohorts.id"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    evidence_items = relationship(
        "Evidence", back_populates="profile", cascade="all, delete-orphan"
    )
    score_runs = relationship(
        "ScoreRun", back_populates="profile", cascade="all, delete-orphan"
    )
    consent = relationship("Consent", back_populates="profile", uselist=False)
    cohort = relationship("Cohort", back_populates="profiles")
