"""
CareerLens Analysis Orchestrator.

Coordinates the end-to-end evidence-based evaluation pipeline:
1. Ingest input sources (Resume, LinkedIn PDF, GitHub, Live Probe, Design Portfolio)
2. Extract claims and proof-of-work evidence records
3. Normalise skills via alias table / embeddings
4. Build and link ClaimEvidence relationships
5. Load Role Profiles from JD corpus
6. Compute deterministic score, component breakdown, confidence interval
7. Calculate role matches across all role profiles
8. Prioritise skill gaps
9. Generate personalized roadmap and cited explanation
10. Store canonical ScoreRun and update Profile lifecycle
"""

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.audit_log import AuditLog
from app.models.evidence import ClaimEvidence, Evidence
from app.models.profile import Profile
from app.models.role_profile import RoleProfile
from app.models.score_run import ScoreRun
from app.services.adapters.design_portfolio_adapter import DesignPortfolioAdapter
from app.services.adapters.github_adapter import GitHubAdapter
from app.services.adapters.live_probe_adapter import LiveProbeAdapter
from app.services.adapters.linkedin_adapter import LinkedInAdapter
from app.services.adapters.resume_adapter import ResumeAdapter
from app.services.analysis.authenticity_detector import AuthenticityDetector
from app.services.analysis.evidence_linker import EvidenceLinker
from app.services.analysis.skill_normaliser import SkillNormaliser
from app.services.analysis.temporal_consistency_service import TemporalConsistencyService
from app.services.explainer.llm_explainer import LLMExplainer
from app.services.scoring.scorer import (
    EvidenceItem,
    RoleWeights,
    ScoreInput,
    ScoreResult,
    compute_score,
)

log = structlog.get_logger(__name__)


class AnalysisOrchestrator:
    """
    Central pipeline orchestrator for fast and deep analysis.
    """

    # ── Fast pass ─────────────────────────────────────────────────────────────

    async def run_fast_analysis(self, profile_id: str) -> Optional[ScoreRun]:
        """
        Fast pass: resume + LinkedIn + GitHub metadata + live probe + initial scoring.
        Completes in seconds. Sets profile.status = 'error' on any crash so the
        SSE stream terminates cleanly instead of hanging.
        """
        async with AsyncSessionLocal() as session:
            profile = await session.get(Profile, profile_id)
            if profile is None:
                log.error("Profile not found for fast analysis", profile_id=profile_id)
                return None

            profile.status = "fast_pass"
            await session.commit()

            try:
                return await self._fast_pass_body(profile_id, session, profile)
            except Exception as exc:
                log.error(
                    "Fast analysis crashed — marking profile as error",
                    profile_id=profile_id,
                    error=str(exc),
                )
                try:
                    profile.status = "error"
                    profile.error_message = str(exc)[:500]
                    await session.commit()
                except Exception:
                    pass
                return None

    async def _fast_pass_body(
        self, profile_id: str, session, profile
    ) -> Optional[ScoreRun]:
        """All the actual fast-pass work — called by run_fast_analysis inside a try/except."""
        evidence_items: List[Evidence] = []
        security_flags: List[Dict[str, Any]] = []
        supplied_sources: List[str] = []

        # 1. Resume extraction & security scan
        if profile.resume_filename:
            resume_path = Path("uploads") / profile.resume_filename
            if resume_path.exists():
                ra = ResumeAdapter(str(resume_path), profile_id)
                res_evidence, flags = ra.extract()
                evidence_items.extend(res_evidence)
                security_flags.extend(flags)
                supplied_sources.append("resume")

        # 2. LinkedIn PDF extraction
        if profile.linkedin_pdf_filename:
            linkedin_path = Path("uploads") / profile.linkedin_pdf_filename
            if linkedin_path.exists():
                la = LinkedInAdapter(str(linkedin_path), profile_id)
                li_evidence, li_flags = la.extract()
                evidence_items.extend(li_evidence)
                security_flags.extend(li_flags)
                supplied_sources.append("linkedin_pdf")

        # 3. GitHub fast pass
        if profile.github_username:
            gh = GitHubAdapter(profile.github_username, profile_id)
            gh_evidence = gh.fast_pass()
            evidence_items.extend(gh_evidence)
            supplied_sources.append("github_repo")
            supplied_sources.append("github_calendar")

        # 4. Live portfolio probe
        if profile.portfolio_url:
            lp = LiveProbeAdapter(profile.portfolio_url, profile_id)
            probe_ev = lp.probe()
            if probe_ev:
                evidence_items.append(probe_ev)
                supplied_sources.append("live_probe")

        # 5. Design portfolio (uploaded file takes priority over URL)
        dp_file_path = None
        if profile.design_portfolio_filename:
            candidate = Path("uploads") / profile.design_portfolio_filename
            if candidate.exists():
                dp_file_path = str(candidate)
        elif profile.design_portfolio_url:
            log.info(
                "Design portfolio URL provided but file upload required for analysis; skipping.",
                url=profile.design_portfolio_url,
            )

        if dp_file_path:
            dp = DesignPortfolioAdapter(dp_file_path, profile_id)
            dp_ev, _ = dp.extract()
            evidence_items.extend(dp_ev)
            supplied_sources.append("design_portfolio")

        # Save initial evidence to DB
        if evidence_items:
            session.add_all(evidence_items)
            await session.flush()

        # 6. Normalise skills
        normaliser = SkillNormaliser()
        for ev in evidence_items:
            ev.skill_hints = [normaliser.normalise(s) for s in ev.skill_hints]

        # 7. Link claims & evidence edges
        linker = EvidenceLinker()
        edges = linker.link(evidence_items)
        session.add_all(edges)
        await session.flush()

        # 8. Role weights & scoring
        target_role = profile.target_role or "Software Engineer"
        role_weights = await self.load_role_weights(session, target_role)

        scorer_items = [
            EvidenceItem(
                id=ev.id,
                skill_hints=ev.skill_hints,
                strength=ev.strength,
                source=ev.source,
                locator=ev.locator or {},
            )
            for ev in evidence_items
        ]
        claim_skills = [
            ev.skill_hints[0]
            for ev in evidence_items
            if ev.source in {"resume", "linkedin_pdf"} and ev.skill_hints
        ]

        score_input = ScoreInput(
            evidence_items=scorer_items,
            claim_skills=list(set(claim_skills)),
            role_weights=role_weights,
            supplied_sources=list(set(supplied_sources)),
        )
        score_result = compute_score(score_input)

        # Multi-role fit
        all_role_fits = await self.compute_all_role_fits(
            session, scorer_items, list(set(claim_skills)), supplied_sources
        )
        if all_role_fits:
            score_result.role_fits = all_role_fits

        # 9. Roadmap via LLM explainer
        explainer = LLMExplainer()
        own_repos: List[str] = []
        if profile.github_username:
            try:
                from github import Auth, Github
                gh_client = (
                    Github(auth=Auth.Token(settings.GITHUB_TOKEN))
                    if settings.GITHUB_TOKEN
                    else Github()
                )
                own_repos = [
                    r.name
                    for r in list(gh_client.get_user(profile.github_username).get_repos(sort="updated")[:10])
                ]
            except Exception:
                pass

        roadmap = explainer.generate_roadmap(
            gaps=score_result.gaps,
            interests=profile.interests or "",
            weekly_hours=profile.weekly_hours_available or 5,
            target_role=target_role,
            own_repos=own_repos,
        )

        # 10. Create ScoreRun
        input_hash = hashlib.sha256(
            json.dumps({
                "evidence_ids": sorted([e.id for e in evidence_items]),
                "weights_version": "v1",
                "pass": "fast",
            }).encode()
        ).hexdigest()

        score_run = ScoreRun(
            profile_id=profile_id,
            input_hash=input_hash,
            weights_version="v1",
            role=target_role,
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

        profile.status = "fast_pass_complete"
        profile.security_flags = security_flags
        await session.commit()

        log.info("Fast analysis complete", profile_id=profile_id, score_mid=score_result.score_mid)
        return score_run

    # ── Deep pass ─────────────────────────────────────────────────────────────

    async def run_deep_analysis(self, profile_id: str) -> Optional[ScoreRun]:
        """
        Deep pass: shallow clone + safe static analysis + authenticity signals + re-scoring.
        """
        async with AsyncSessionLocal() as session:
            profile = await session.get(Profile, profile_id)
            if profile is None:
                log.error("Profile not found for deep analysis", profile_id=profile_id)
                return None

            profile.status = "deep_pass"
            await session.commit()

            try:
                return await self._deep_pass_body(profile_id, session, profile)
            except Exception as exc:
                log.error(
                    "Deep analysis crashed — marking profile as error",
                    profile_id=profile_id,
                    error=str(exc),
                )
                try:
                    profile.status = "error"
                    profile.error_message = str(exc)[:500]
                    await session.commit()
                except Exception:
                    pass
                return None

    async def _deep_pass_body(
        self, profile_id: str, session, profile
    ) -> Optional[ScoreRun]:
        """All the actual deep-pass work."""
        new_evidence: List[Evidence] = []
        supplied_sources: List[str] = []

        # 1. GitHub deep analysis
        if profile.github_username:
            gh = GitHubAdapter(profile.github_username, profile_id)
            new_evidence.extend(gh.deep_pass())

            auth_detector = AuthenticityDetector(profile.github_username, profile_id)
            new_evidence.extend(auth_detector.analyse())

            consistency_svc = TemporalConsistencyService(profile.github_username, profile_id)
            new_evidence.extend(consistency_svc.analyse())

            supplied_sources.extend(["github_repo", "github_calendar"])

        if new_evidence:
            session.add_all(new_evidence)
            await session.flush()

        # Load and re-normalise all evidence
        all_ev_stmt = select(Evidence).where(Evidence.profile_id == profile_id)
        all_ev_res = await session.execute(all_ev_stmt)
        all_evidence = list(all_ev_res.scalars().all())

        normaliser = SkillNormaliser()
        for ev in all_evidence:
            ev.skill_hints = [normaliser.normalise(s) for s in ev.skill_hints]

        linker = EvidenceLinker()
        edges = linker.link(all_evidence)
        session.add_all(edges)
        await session.flush()

        # Re-score with complete evidence set
        target_role = profile.target_role or "Software Engineer"
        role_weights = await self.load_role_weights(session, target_role)

        scorer_items = [
            EvidenceItem(
                id=ev.id,
                skill_hints=ev.skill_hints,
                strength=ev.strength,
                source=ev.source,
                locator=ev.locator or {},
            )
            for ev in all_evidence
        ]
        claim_skills = [
            ev.skill_hints[0]
            for ev in all_evidence
            if ev.source in {"resume", "linkedin_pdf"} and ev.skill_hints
        ]

        all_supplied = list(set([e.source for e in all_evidence] + supplied_sources))
        score_input = ScoreInput(
            evidence_items=scorer_items,
            claim_skills=list(set(claim_skills)),
            role_weights=role_weights,
            supplied_sources=all_supplied,
        )
        score_result = compute_score(score_input)

        all_role_fits = await self.compute_all_role_fits(
            session, scorer_items, list(set(claim_skills)), all_supplied
        )
        if all_role_fits:
            score_result.role_fits = all_role_fits

        explainer = LLMExplainer()
        own_repos: List[str] = []
        if profile.github_username:
            try:
                from github import Auth, Github
                gh_client = (
                    Github(auth=Auth.Token(settings.GITHUB_TOKEN))
                    if settings.GITHUB_TOKEN
                    else Github()
                )
                own_repos = [
                    r.name
                    for r in list(gh_client.get_user(profile.github_username).get_repos(sort="updated")[:10])
                ]
            except Exception:
                pass

        roadmap = explainer.generate_roadmap(
            gaps=score_result.gaps,
            interests=profile.interests or "",
            weekly_hours=profile.weekly_hours_available or 5,
            target_role=target_role,
            own_repos=own_repos,
        )

        input_hash = hashlib.sha256(
            json.dumps({
                "evidence_ids": sorted([e.id for e in all_evidence]),
                "weights_version": "v1",
                "pass": "deep",
            }).encode()
        ).hexdigest()

        score_run = ScoreRun(
            profile_id=profile_id,
            input_hash=input_hash,
            weights_version="v1",
            role=target_role,
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
                "flags": profile.security_flags or [],
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

        profile.status = "complete"
        await session.commit()

        log.info("Deep analysis complete", profile_id=profile_id, score_mid=score_result.score_mid)
        return score_run

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def load_role_weights(self, session: AsyncSession, role_name: str) -> RoleWeights:
        """Load RoleWeights from DB, fall back to sensible defaults if unseeded."""
        stmt = select(RoleProfile).where(RoleProfile.role_name == role_name)
        result = await session.execute(stmt)
        rp = result.scalar_one_or_none()

        if rp:
            return RoleWeights(
                role_name=rp.role_name,
                skill_weights=rp.skill_weights or {},
                proof_thresholds=rp.proof_thresholds or {},
                component_weight_overrides=rp.component_weight_overrides or {},
            )

        return RoleWeights(
            role_name=role_name,
            skill_weights={},
            proof_thresholds={},
            component_weight_overrides={},
        )

    async def compute_all_role_fits(
        self,
        session: AsyncSession,
        evidence_items: List[EvidenceItem],
        claim_skills: List[str],
        supplied_sources: List[str],
    ) -> List[Dict[str, Any]]:
        """Calculate score against all available role profiles in the corpus."""
        stmt = select(RoleProfile)
        result = await session.execute(stmt)
        role_profiles = list(result.scalars().all())

        if not role_profiles:
            return []

        fits = []
        for rp in role_profiles:
            rw = RoleWeights(
                role_name=rp.role_name,
                skill_weights=rp.skill_weights or {},
                proof_thresholds=rp.proof_thresholds or {},
                component_weight_overrides=rp.component_weight_overrides or {},
            )
            s_inp = ScoreInput(
                evidence_items=evidence_items,
                claim_skills=claim_skills,
                role_weights=rw,
                supplied_sources=supplied_sources,
            )
            s_res = compute_score(s_inp)
            fits.append({
                "role": rp.role_name,
                "fit_pct": s_res.score_mid,
                "gap_skills": [g["skill"] for g in s_res.gaps[:5]],
            })

        return sorted(fits, key=lambda f: f["fit_pct"], reverse=True)
