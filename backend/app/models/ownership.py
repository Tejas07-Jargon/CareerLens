"""
SQLAlchemy Models for CareerLens Ownership Map.

Entities:
1. RepoAttribution: Persistent repository ownership snapshot per profile, repo, and HEAD SHA.
2. SkillOwnership: Attribution breakdown per canonical skill for a repository attribution.
3. IdentityDeclaration: Staged candidate-declared commit email hashes pending Proof of Control.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RepoAttribution(Base):
    __tablename__ = "repo_attributions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repo_full_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    relation: Mapped[str] = mapped_column(String(32), default="owner")  # "owner" | "contributed_to"
    head_sha: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    method: Mapped[str] = mapped_column(String(64), default="git_blame_full_history")
    
    # Ownership Breakdown
    coverage: Mapped[float] = mapped_column(Float, default=0.0)
    student_lines: Mapped[float] = mapped_column(Float, default=0.0)
    other_lines: Mapped[float] = mapped_column(Float, default=0.0)
    unknown_lines: Mapped[float] = mapped_column(Float, default=0.0)
    bot_lines: Mapped[float] = mapped_column(Float, default=0.0)
    total_meaningful_lines: Mapped[float] = mapped_column(Float, default=0.0)
    
    student_share: Mapped[float] = mapped_column(Float, default=0.0)
    other_share: Mapped[float] = mapped_column(Float, default=0.0)
    unknown_share: Mapped[float] = mapped_column(Float, default=0.0)
    
    incomplete: Mapped[bool] = mapped_column(Boolean, default=False)
    solo_exception_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # File counts & details
    files_total: Mapped[int] = mapped_column(Integer, default=0)
    files_analysed: Mapped[int] = mapped_column(Integer, default=0)
    files_skipped: Mapped[int] = mapped_column(Integer, default=0)
    skipped_reasons: Mapped[Dict] = mapped_column(JSON, default=dict)
    file_results: Mapped[List] = mapped_column(JSON, default=list)

    # State Machine & Metadata
    # discovered | queued | analysing | complete | partial | incomplete | failed | not_analysed
    status: Mapped[str] = mapped_column(String(32), default="discovered", index=True)
    algorithm_version: Mapped[str] = mapped_column(String(16), default="1")
    notes: Mapped[List] = mapped_column(JSON, default=list)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_time_sec: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    profile = relationship("Profile", back_populates="repo_attributions")
    skill_ownerships = relationship(
        "SkillOwnership",
        back_populates="repo_attribution",
        cascade="all, delete-orphan",
        order_by="SkillOwnership.skill",
    )

    __table_args__ = (
        Index("ix_repo_attr_profile_repo", "profile_id", "repo_full_name"),
        Index("ix_repo_attr_profile_repo_head", "profile_id", "repo_full_name", "head_sha"),
    )


class SkillOwnership(Base):
    __tablename__ = "skill_ownerships"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    repo_attribution_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repo_attributions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    student_lines: Mapped[float] = mapped_column(Float, default=0.0)
    other_lines: Mapped[float] = mapped_column(Float, default=0.0)
    unknown_lines: Mapped[float] = mapped_column(Float, default=0.0)
    total_lines: Mapped[float] = mapped_column(Float, default=0.0)
    share: Mapped[float] = mapped_column(Float, default=0.0)  # student share in [0, 1]
    factor: Mapped[float] = mapped_column(Float, default=1.0)
    top_ranges: Mapped[List] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    repo_attribution = relationship("RepoAttribution", back_populates="skill_ownerships")


class IdentityDeclaration(Base):
    """
    Candidate-declared email addresses.
    Stored hashed with reason=github_binding_required until Proof of Control exists.
    """
    __tablename__ = "identity_declarations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    masked_email: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | rejected | verified
    reason: Mapped[str] = mapped_column(String(128), default="github_binding_required")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="identity_declarations")
