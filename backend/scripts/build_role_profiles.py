"""
Script: build_role_profiles.py

Reads JD corpus JSON files from data/jd_corpus/<role>/*.json,
computes per-skill frequencies, and upserts RoleProfile rows into the DB.

Usage
-----
  cd backend
  python scripts/build_role_profiles.py

JD corpus file format (one file per JD):
{
  "title": "Senior Software Engineer",
  "company": "...",
  "skills": ["Python", "Django", "PostgreSQL", "Docker", "Testing", "Git", "REST API"]
}
"""

import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal, init_db
from app.models.role_profile import RoleProfile
from sqlalchemy import select


JD_CORPUS_PATH = Path(__file__).parent.parent.parent / "data" / "jd_corpus"

# Role-specific component weight overrides
ROLE_OVERRIDES = {
    "UI/UX Designer": {
        "portfolio_presentation": 0.35,
        "skill_coverage": 0.25,
        "project_depth": 0.15,
        "consistency_growth": 0.15,
        "professional_signals": 0.10,
    }
}

# Core skills require higher proof threshold
CORE_SKILL_THRESHOLD = 0.60
NICE_TO_HAVE_THRESHOLD = 0.30
CORE_FREQUENCY_CUTOFF = 0.60  # skills appearing in >60% of JDs are "core"


async def build_profiles():
    await init_db()

    async with AsyncSessionLocal() as session:
        for role_dir in sorted(JD_CORPUS_PATH.iterdir()):
            if not role_dir.is_dir():
                continue
            role_name = "UI/UX Designer" if role_dir.name == "UI_UX_Designer" else role_dir.name.replace("_", " ")
            jd_files = list(role_dir.glob("*.json"))

            if not jd_files:
                print(f"  [skip] {role_name} — no JD files")
                continue

            skill_counter: Counter = Counter()
            sample_titles = []

            for jd_file in jd_files:
                try:
                    jd = json.loads(jd_file.read_text(encoding="utf-8-sig"))
                    for skill in jd.get("skills", []):
                        skill_counter[skill] += 1
                    if "title" in jd:
                        sample_titles.append(jd["title"])
                except Exception as e:
                    print(f"  [warn] {jd_file.name}: {e}")

            n = len(jd_files)
            skill_weights = {skill: round(count / n, 3) for skill, count in skill_counter.items()}
            proof_thresholds = {
                skill: CORE_SKILL_THRESHOLD if freq >= CORE_FREQUENCY_CUTOFF else NICE_TO_HAVE_THRESHOLD
                for skill, freq in skill_weights.items()
            }

            # Upsert
            stmt = select(RoleProfile).where(RoleProfile.role_name == role_name)
            result = await session.execute(stmt)
            rp = result.scalar_one_or_none()

            if rp is None:
                rp = RoleProfile(role_name=role_name)
                session.add(rp)

            rp.jd_sample_size = n
            rp.skill_weights = skill_weights
            rp.proof_thresholds = proof_thresholds
            rp.component_weight_overrides = ROLE_OVERRIDES.get(role_name, {})
            rp.sample_titles = sample_titles[:10]

            print(f"  [ok] {role_name}: {n} JDs, {len(skill_weights)} skills")

        await session.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(build_profiles())
