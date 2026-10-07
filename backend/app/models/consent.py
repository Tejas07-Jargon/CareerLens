"""
Consent – records the student's data-processing agreement.
Required before any analysis runs.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    agreed_to_analysis: Mapped[bool] = mapped_column(Boolean, nullable=False)
    agreed_to_cohort_sharing: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consented_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="consent")
