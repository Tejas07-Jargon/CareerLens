import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(256), default="Main Resume")
    target_role: Mapped[str] = mapped_column(String(128), default="Software Engineer")
    target_jd_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    template_id: Mapped[str] = mapped_column(String(64), default="modern")

    # Full structured content: {header, summary, skills, projects, experience, education, certifications}
    content: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # Metrics
    quality_score: Mapped[float] = mapped_column(Float, default=85.0)
    jd_alignment_pct: Mapped[float] = mapped_column(Float, default=80.0)
    evidence_coverage_pct: Mapped[float] = mapped_column(Float, default=90.0)
    version_num: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    profile = relationship("Profile", back_populates="resumes")
