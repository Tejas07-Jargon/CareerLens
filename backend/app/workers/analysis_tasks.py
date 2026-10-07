"""
Analysis Celery tasks.

run_fast_analysis(profile_id)
  1. Fetch profile from DB
  2. Run GitHub fast pass + resume adapter + live probe (sync, seconds)
  3. Normalise skills, link evidence
  4. Run scorer → ScoreRun (mid, lo, hi, components, claim_statuses, gaps)
  5. Run LLM explainer → narrative + roadmap
  6. Save everything; update profile status to 'fast_pass_complete'
  7. Trigger run_deep_analysis as a follow-up task

run_deep_analysis(profile_id)
  1. Run GitHub deep pass (clone + static analysis)
  2. Run authenticity detector
  3. Run temporal consistency service (GraphQL or REST)
  4. Re-score and re-explain
  5. Update profile status to 'complete'
"""

import structlog
from sqlalchemy import select

from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)


@celery_app.task(bind=True, name="analysis.fast_pass", max_retries=2)
def run_fast_analysis(self, profile_id: str) -> None:
    """Fast pass: GitHub metadata + resume + live probe. Completes in seconds."""
    import asyncio
    asyncio.run(_async_fast_pass(self, profile_id))


async def _async_fast_pass(task, profile_id: str) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.profile import Profile
    from app.models.evidence import Evidence, ClaimEvidence
    from app.models.score_run import ScoreRun
    from app.services.adapters.github_adapter import GitHubAdapter
    from app.services.adapters.resume_adapter import ResumeAdapter
    from app.services.adapters.live_probe_adapter import LiveProbeAdapter
    from app.services.analysis.skill_normaliser import SkillNormaliser
    from app.services.analysis.evidence_linker import EvidenceLinker
    from app.services.scoring.scorer import (
        ScoreInput, EvidenceItem, compute_score
    )
    from app.services.explainer.llm_explainer import LLMExplainer
    import hashlib, json

    async with AsyncSessionLocal() as session:
        profile = await session.get(Profile, profile_id)
        if profile is None:
            log.error("Profile not found for fast pass", profile_id=profile_id)
            return

        profile.status = "fast_pass"
        await session.commit()

        evidence_items = []
        security_flags = []
        supplied_sources = []

        # ── GitHub fast pass ──────────────────────────────────────────────────
        if profile.github_username:
            gh = GitHubAdapter(profile.github_username, profile_id)
            gh_evidence = gh.fast_pass()
            evidence_items.extend(gh_evidence)
            supplied_sources.append("github_repo")
            supplied_sources.append("github_calendar")

        # ── Resume adapter ────────────────────────────────────────────────────
        if profile.resume_filename:
            from pathlib import Path
            resume_path = Path("uploads") / profile.resume_filename
            if resume_path.exists():
                ra = ResumeAdapter(str(resume_path), profile_id)
                res_evidence, flags = ra.extract()
                evidence_items.extend(res_evidence)
                security_flags.extend(flags)
                supplied_sources.append("resume")

        # ── Live probe ────────────────────────────────────────────────────────
        if profile.portfolio_url:
            lp = LiveProbeAdapter(profile.portfolio_url, profile_id)
            probe_ev = lp.probe()
            if probe_ev:
                evidence_items.append(probe_ev)
                supplied_sources.append("live_probe")

        # ── Save evidence to DB ───────────────────────────────────────────────
        session.add_all(evidence_items)
        await session.flush()

        # ── Normalise and link ────────────────────────────────────────────────
        normaliser = SkillNormaliser()
        for ev in evidence_items:
            ev.skill_hints = [normaliser.normalise(s) for s in ev.skill_hints]

        linker = EvidenceLinker()
        edges = linker.link(evidence_items)
        session.add_all(edges)
        await session.flush()

        # ── Score ─────────────────────────────────────────────────────────────
        from app.services.scoring.scorer import RoleWeights
        role_weights = await _load_role_weights(session, profile.target_role or "Software Engineer")

        scorer_items = [
            EvidenceItem(
                id=ev.id,
                skill_hints=ev.skill_hints,
                strength=ev.strength,
                source=ev.source,
                locator=ev.locator,
            )
            for ev in evidence_items
        ]
        claim_skills = [
            ev.skill_hints[0]
            for ev in evidence_items
            if ev.source == "resume" and ev.skill_hints
        ]

        score_input = ScoreInput(
            evidence_items=scorer_items,
            claim_skills=claim_skills,
            role_weights=role_weights,
            supplied_sources=list(set(supplied_sources)),
        )
        score_result = compute_score(score_input)

        # ── Explain ───────────────────────────────────────────────────────────
        explainer = LLMExplainer()
        narrative = explainer.explain_score(
            components=[
                {"name": c.name, "value": c.value, "reason": c.reason, "evidence_ids": c.evidence_ids}
                for c in score_result.components
            ],
            gaps=score_result.gaps,
            claim_statuses=[
                {"skill": cs.skill, "confidence": cs.confidence, "evidence_ids": cs.evidence_ids}
                for cs in score_result.claim_statuses
            ],
            score_mid=score_result.score_mid,
            score_lo=score_result.score_lo,
            score_hi=score_result.score_hi,
        )

        own_repos = []
        if profile.github_username:
            try:
                from github import Github, Auth
                from app.core.config import settings
                gh_client = Github(auth=Auth.Token(settings.GITHUB_TOKEN)) if settings.GITHUB_TOKEN else Github()
                own_repos = [r.name for r in list(gh_client.get_user(profile.github_username).get_repos())[:10]]
            except Exception:
                pass

        roadmap = explainer.generate_roadmap(
            gaps=score_result.gaps,
            interests=profile.interests or "",
            weekly_hours=profile.weekly_hours_available or 5,
            target_role=profile.target_role or "Software Engineer",
            own_repos=own_repos,
        )

        # ── Save ScoreRun ─────────────────────────────────────────────────────
        input_hash = hashlib.sha256(
            json.dumps({
                "evidence_ids": sorted([e.id for e in evidence_items]),
                "weights_version": "v1",
            }).encode()
        ).hexdigest()

        score_run = ScoreRun(
            profile_id=profile_id,
            input_hash=input_hash,
            weights_version="v1",
            role=profile.target_role or "Software Engineer",
            score_mid=score_result.score_mid,
            score_lo=score_result.score_lo,
            score_hi=score_result.score_hi,
            components={
                c.name: {
                    "value": c.value,
                    "weight": c.weight,
                    "reason": c.reason,
                    "evidence_ids": c.evidence_ids,
                }
                for c in score_result.components
            },
            credibility={
                **score_result.credibility,
                "flags": security_flags,
            },
            claim_statuses=[
                {
                    "skill": cs.skill,
                    "status": cs.status,
                    "confidence": cs.confidence,
                    "evidence_ids": cs.evidence_ids,
                    "locators": cs.locators,
                }
                for cs in score_result.claim_statuses
            ],
            role_fits=score_result.role_fits,
            gaps=score_result.gaps,
            roadmap=roadmap,
        )
        session.add(score_run)

        # ── Update profile ────────────────────────────────────────────────────
        profile.status = "fast_pass_complete"
        profile.security_flags = security_flags
        await session.commit()

    # Trigger deep pass
    run_deep_analysis.delay(profile_id)
    log.info("Fast pass complete", profile_id=profile_id)


@celery_app.task(bind=True, name="analysis.deep_pass", max_retries=1)
def run_deep_analysis(self, profile_id: str) -> None:
    """Deep pass: repo clone + static analysis + authenticity + temporal consistency."""
    import asyncio
    asyncio.run(_async_deep_pass(self, profile_id))


async def _async_deep_pass(task, profile_id: str) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.profile import Profile
    from app.services.adapters.github_adapter import GitHubAdapter
    from app.services.analysis.authenticity_detector import AuthenticityDetector
    from app.services.analysis.temporal_consistency_service import TemporalConsistencyService

    async with AsyncSessionLocal() as session:
        profile = await session.get(Profile, profile_id)
        if profile is None:
            return

        profile.status = "deep_pass"
        await session.commit()

        new_evidence = []

        if profile.github_username:
            # Deep repo analysis (clones)
            gh = GitHubAdapter(profile.github_username, profile_id)
            new_evidence.extend(gh.deep_pass())

            # Authenticity signals
            auth_detector = AuthenticityDetector(profile.github_username, profile_id)
            new_evidence.extend(auth_detector.analyse())

            # Temporal consistency (GraphQL / REST)
            consistency_svc = TemporalConsistencyService(profile.github_username, profile_id)
            new_evidence.extend(consistency_svc.analyse())

        if new_evidence:
            session.add_all(new_evidence)

        profile.status = "complete"
        await session.commit()

    log.info("Deep pass complete", profile_id=profile_id)


async def _load_role_weights(session, role_name: str):
    """Load RoleWeights from DB, fall back to sensible defaults."""
    from app.models.role_profile import RoleProfile
    from app.services.scoring.scorer import RoleWeights
    from sqlalchemy import select

    stmt = select(RoleProfile).where(RoleProfile.role_name == role_name)
    result = await session.execute(stmt)
    rp = result.scalar_one_or_none()

    if rp:
        return RoleWeights(
            role_name=rp.role_name,
            skill_weights=rp.skill_weights,
            proof_thresholds=rp.proof_thresholds,
            component_weight_overrides=rp.component_weight_overrides,
        )

    # Default fallback (no JD corpus loaded yet)
    return RoleWeights(
        role_name=role_name,
        skill_weights={},
        proof_thresholds={},
        component_weight_overrides={},
    )
