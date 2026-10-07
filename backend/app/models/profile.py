"""
Profile – top-level entity representing one student's submission.

Design note: name, gender and college are stored for display only and are
NEVER passed to the scoring functions. The score is purely a function of
Evidence records.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Float, Integer
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
    leetcode_username: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    linkedin_pdf_filename: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    design_portfolio_filename: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    design_portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Behance/Figma URL (optional)

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

    # ── Dynamic Profile & Quiz Tracking ───────────────────────────────────────
    overall_readiness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quiz_average: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_quizzes: Mapped[int] = mapped_column(Integer, default=0)
    quiz_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_quiz_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Job Offer ─────────────────────────────────────────────────────────────
    job_offer_company: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    job_offer_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    evidence_items = relationship(
        "Evidence", back_populates="profile", cascade="all, delete-orphan"
    )
    score_runs = relationship(
        "ScoreRun", back_populates="profile", cascade="all, delete-orphan"
    )
    consent = relationship("Consent", back_populates="profile", uselist=False)
    cohort = relationship("Cohort", back_populates="profiles")
    
    skill_profiles = relationship("SkillProfile", back_populates="profile", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="profile", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="profile", cascade="all, delete-orphan")
    snapshots = relationship("ProfileSnapshot", back_populates="profile", cascade="all, delete-orphan")
    resumes = relationship("ResumeVersion", back_populates="profile", cascade="all, delete-orphan")
    repo_attributions = relationship("RepoAttribution", back_populates="profile", cascade="all, delete-orphan")
    identity_declarations = relationship("IdentityDeclaration", back_populates="profile", cascade="all, delete-orphan")
    leetcode_profile = relationship("LeetCodeProfile", back_populates="profile", uselist=False, cascade="all, delete-orphan")
