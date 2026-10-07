"""
RoleProfile – market baseline built from real job descriptions.

Built by the data pipeline in scripts/build_role_profiles.py.
Per-skill frequency (how often the skill appears across the JD sample) is used
as the role weight w_k in the coverage formula.
"""

import uuid
from datetime import datetime
from typing import Dict, List

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RoleProfile(Base):
    __tablename__ = "role_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    role_name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    role_track: Mapped[str] = mapped_column(String(64), nullable=True)  # swe | data | design | pm

    # ── JD corpus metadata ────────────────────────────────────────────────────
    jd_sample_size: Mapped[int] = mapped_column(Integer, default=0)

    # ── Skill frequency map ───────────────────────────────────────────────────
    # {skill_name: frequency_0_to_1}  (frequency = appearances / jd_sample_size)
    skill_weights: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict)

    # ── Proof level thresholds ────────────────────────────────────────────────
    # {skill_name: tau}  — 0.6 for core, 0.3 for nice-to-have
    proof_thresholds: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict)

    # ── Scoring weight overrides for this role ────────────────────────────────
    # Overrides the default component weights. E.g. UI/UX gets more portfolio weight.
    # {component: weight}
    component_weight_overrides: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict)

    # ── Interesting titles from the JD corpus ─────────────────────────────────
    sample_titles: Mapped[List[str]] = mapped_column(JSON, default=list)

    built_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
