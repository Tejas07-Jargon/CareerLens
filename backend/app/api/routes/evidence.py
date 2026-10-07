"""
Evidence Confidence API Routes.

GET  /evidence           Full evidence confidence report for a profile (or baseline demo)
GET  /evidence/summary   Compact summary for dashboard widgets
GET  /evidence/{skill}   Detailed drill-down for an individual skill
POST /evidence/analyze   Trigger/recalculate evidence confidence
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.evidence import Evidence
from app.models.profile import Profile
from app.models.score_run import ScoreRun
from app.services.scoring.evidence_confidence import (
    EvidenceConfidenceEngine,
    SkillEvidenceConfidence,
    OverallEvidenceReport,
)

router = APIRouter()
engine = EvidenceConfidenceEngine()


# ── Sample / Demo Profiles for fallback or initial exploration ────────────────
DEMO_SKILLS_DATA = [
    {
        "skill": "Java",
        "score": 91,
        "status": "Strong Evidence",
        "status_range": "81-100",
        "sources_count": 6,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected", "available": True},
            "project_evidence": {"points": 25, "max": 25, "label": "Project Evidence", "status": "✓ 4 projects", "available": True},
            "code_evidence": {"points": 25, "max": 25, "label": "Code Evidence", "status": "✓ Strong", "available": True},
            "github_activity": {"points": 15, "max": 15, "label": "GitHub Activity", "status": "✓ 127 commits", "available": True},
            "project_relevance": {"points": 10, "max": 10, "label": "Project Relevance", "status": "✓ High", "available": True},
            "recency": {"points": 6, "max": 10, "label": "Recent Activity", "status": "✓ Active within last 30 days", "available": True},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ Good docs, portfolio unavailable", "available": True},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'Advanced Java developer'", "contribution": 10, "status": "verified", "details": "Listed under core skills with 3+ years experience"},
            {"source": "GitHub", "description": "Java detected in 4 repositories with 127 commits", "contribution": 40, "status": "verified", "details": "Repos: ecommerce-microservice, spring-security-starter"},
            {"source": "Projects", "description": "Spring Boot backend with JPA/Hibernate & JUnit 5 tests", "contribution": 35, "status": "verified", "details": "Full test coverage and REST API endpoints"},
            {"source": "Recency", "description": "Last Java commit detected 8 days ago", "contribution": 6, "status": "verified", "details": "Active commit streak maintained"},
            {"source": "Portfolio", "description": "Portfolio evidence unavailable", "contribution": 0, "status": "unavailable", "details": "Connect portfolio link to verify live deployments"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Advanced Java developer",
            "observed_evidence": [
                "4 Java repositories",
                "127 Java commits",
                "3 relevant projects",
                "Strong code evidence",
            ],
            "assessment": "Strongly Supported",
            "confidence_score": 91,
        },
        "mismatch": None,
        "ai_explanation": (
            "Your Java skill is strongly supported by multiple independent sources. "
            "Your resume claim is consistent with your GitHub activity (4 repos, 127 commits) "
            "and production project architecture. Recent activity further increases confidence."
        ),
    },
    {
        "skill": "React",
        "score": 84,
        "status": "Strong Evidence",
        "status_range": "81-100",
        "sources_count": 5,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected", "available": True},
            "project_evidence": {"points": 25, "max": 25, "label": "Project Evidence", "status": "✓ 3 projects", "available": True},
            "code_evidence": {"points": 22, "max": 25, "label": "Code Evidence", "status": "✓ Strong (Hooks & Next.js)", "available": True},
            "github_activity": {"points": 13, "max": 15, "label": "GitHub Activity", "status": "✓ 84 commits", "available": True},
            "project_relevance": {"points": 8, "max": 10, "label": "Project Relevance", "status": "✓ High", "available": True},
            "recency": {"points": 6, "max": 10, "label": "Recent Activity", "status": "✓ Active within last 2 weeks", "available": True},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ Portfolio unavailable", "available": False},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'React — Frontend'", "contribution": 10, "status": "verified", "details": "Included in projects and coursework"},
            {"source": "GitHub", "description": "3 React/Next.js repositories with 84 commits", "contribution": 35, "status": "verified", "details": "Repos: dashboard-ui, portfolio-v2"},
            {"source": "Projects", "description": "Interactive data dashboard using TypeScript and Tailwind", "contribution": 33, "status": "verified", "details": "Custom hooks, state management and component tests"},
            {"source": "Portfolio", "description": "Portfolio evidence unavailable", "contribution": 0, "status": "unavailable", "details": "Portfolio not linked"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Proficient in React",
            "observed_evidence": [
                "3 React repositories",
                "84 React commits",
                "Next.js App router implementation",
                "Interactive UI components verified",
            ],
            "assessment": "Strongly Supported",
            "confidence_score": 84,
        },
        "mismatch": None,
        "ai_explanation": (
            "Your React proficiency is verified through robust GitHub projects including "
            "Next.js and component libraries. Adding unit tests with React Testing Library will push this to 90+."
        ),
    },
    {
        "skill": "SQL",
        "score": 78,
        "status": "Moderate Evidence",
        "status_range": "61-80",
        "sources_count": 4,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected", "available": True},
            "project_evidence": {"points": 18, "max": 25, "label": "Project Evidence", "status": "✓ 2 projects", "available": True},
            "code_evidence": {"points": 20, "max": 25, "label": "Code Evidence", "status": "✓ Complex queries & migrations", "available": True},
            "github_activity": {"points": 10, "max": 15, "label": "GitHub Activity", "status": "✓ 45 commits", "available": True},
            "project_relevance": {"points": 10, "max": 10, "label": "Project Relevance", "status": "✓ High", "available": True},
            "recency": {"points": 5, "max": 10, "label": "Recent Activity", "status": "✓ Active within last 60 days", "available": True},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ Schema documented", "available": True},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'PostgreSQL / MySQL'", "contribution": 10, "status": "verified", "details": "Used in database course and backend project"},
            {"source": "GitHub", "description": "Schema migrations and relational queries in 2 repos", "contribution": 30, "status": "verified", "details": "Alembic / Flyway migrations found"},
            {"source": "Projects", "description": "Relational schemas with index optimization and joins", "contribution": 33, "status": "verified", "details": "Normalized 3NF relational models"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Experienced with SQL & relational databases",
            "observed_evidence": [
                "2 database projects",
                "Schema migration files detected",
                "Multi-table joins and indexing",
            ],
            "assessment": "Moderately Supported",
            "confidence_score": 78,
        },
        "mismatch": None,
        "ai_explanation": (
            "Good relational database proof in migrations and queries. "
            "Benchmarking query plans (EXPLAIN ANALYZE) or demonstrating query optimization will strengthen confidence."
        ),
    },
    {
        "skill": "Python",
        "score": 67,
        "status": "Moderate Evidence",
        "status_range": "61-80",
        "sources_count": 3,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected", "available": True},
            "project_evidence": {"points": 18, "max": 25, "label": "Project Evidence", "status": "✓ 2 projects", "available": True},
            "code_evidence": {"points": 18, "max": 25, "label": "Code Evidence", "status": "✓ API scripts & utilities", "available": True},
            "github_activity": {"points": 8, "max": 15, "label": "GitHub Activity", "status": "✓ 32 commits", "available": True},
            "project_relevance": {"points": 8, "max": 10, "label": "Project Relevance", "status": "✓ Moderate", "available": True},
            "recency": {"points": 5, "max": 10, "label": "Recent Activity", "status": "✓ Active 40 days ago", "available": True},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ Minimal docstrings", "available": True},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'Python Developer'", "contribution": 10, "status": "verified", "details": "Mentioned in resume education and projects"},
            {"source": "GitHub", "description": "2 repositories with Python scripts and FastAPI service", "contribution": 26, "status": "verified", "details": "Repos: data-pipeline, fast-api-demo"},
            {"source": "Projects", "description": "REST endpoints and data scraping utilities", "contribution": 26, "status": "verified", "details": "Pydantic models and requests library"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Python Developer",
            "observed_evidence": [
                "2 Python repositories",
                "32 commits",
                "Basic test coverage absent",
            ],
            "assessment": "Moderately Supported",
            "confidence_score": 67,
        },
        "mismatch": None,
        "ai_explanation": (
            "Python implementation is observable in web and automation scripts. "
            "Adding type hints (mypy), pytest suites, and docstrings will advance this to strong evidence."
        ),
    },
    {
        "skill": "AWS",
        "score": 18,
        "status": "Weak / Unverified",
        "status_range": "0-30",
        "sources_count": 1,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected ('Expert in AWS')", "available": True},
            "project_evidence": {"points": 0, "max": 25, "label": "Project Evidence", "status": "○ No AWS projects detected", "available": True},
            "code_evidence": {"points": 0, "max": 25, "label": "Code Evidence", "status": "○ No IaC or SDK evidence", "available": True},
            "github_activity": {"points": 0, "max": 15, "label": "GitHub Activity", "status": "○ No AWS repository activity", "available": True},
            "project_relevance": {"points": 0, "max": 10, "label": "Project Relevance", "status": "○ No cloud deployment files", "available": True},
            "recency": {"points": 8, "max": 10, "label": "Recent Activity", "status": "○ No recent cloud logs", "available": False},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ No architecture diagram", "available": False},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'Expert in AWS (EC2, S3, Lambda)'", "contribution": 10, "status": "verified", "details": "Stated as major skill on page 1 of resume"},
            {"source": "GitHub", "description": "No AWS configuration, Terraform, CDK, or Boto3 code found", "contribution": 0, "status": "unverified", "details": "Scanned 12 repositories; 0 matches for AWS SDK or configs"},
            {"source": "Projects", "description": "No deployed AWS architectures or cloud templates", "contribution": 0, "status": "unverified", "details": "No CloudFormation, SAM, or serverless yaml files"},
            {"source": "Portfolio", "description": "Portfolio evidence unavailable", "contribution": 0, "status": "unavailable", "details": "No live AWS URL connected"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Expert in AWS",
            "observed_evidence": [
                "No AWS projects detected",
                "No AWS repository activity detected",
                "No deployment evidence detected",
            ],
            "assessment": "Claim not sufficiently supported",
            "confidence_score": 18,
        },
        "mismatch": {
            "type": "under_supported",
            "severity": "warning",
            "title": "Potential Claim Mismatch",
            "message": "Resume states 'Expert in AWS', but no observable AWS code, CDK/Terraform configs, or live infrastructure exist in connected repositories.",
            "recommendation": "Add a demonstrable AWS project (e.g. S3 + Lambda serverless API or Terraform template) or reduce the proficiency claim until stronger evidence exists.",
        },
        "ai_explanation": (
            "Your AWS claim is currently unverified beyond the text on your resume. "
            "To prove this skill to hiring managers, commit Infrastructure-as-Code (Terraform/CDK), "
            "a GitHub Actions deployment pipeline targeting AWS, or attach an AWS Certification badge."
        ),
    },
    {
        "skill": "Docker",
        "score": 38,
        "status": "Limited Evidence",
        "status_range": "31-60",
        "sources_count": 2,
        "breakdown": {
            "resume_claim": {"points": 10, "max": 10, "label": "Resume Claim", "status": "✓ Detected", "available": True},
            "project_evidence": {"points": 12, "max": 25, "label": "Project Evidence", "status": "✓ 1 Dockerfile detected", "available": True},
            "code_evidence": {"points": 10, "max": 25, "label": "Code Evidence", "status": "✓ Basic single-stage build", "available": True},
            "github_activity": {"points": 6, "max": 15, "label": "GitHub Activity", "status": "✓ 6 commits editing container", "available": True},
            "project_relevance": {"points": 0, "max": 10, "label": "Project Relevance", "status": "○ No multi-container compose", "available": True},
            "recency": {"points": 0, "max": 10, "label": "Recent Activity", "status": "○ Created >120 days ago", "available": True},
            "documentation": {"points": 0, "max": 5, "label": "Documentation & Portfolio", "status": "○ No container registry link", "available": False},
        },
        "sources": [
            {"source": "Resume", "description": "Candidate claims 'Docker & Containerization'", "contribution": 10, "status": "verified", "details": "Listed under DevOps tools"},
            {"source": "GitHub", "description": "1 basic Dockerfile detected in backend repo", "contribution": 28, "status": "verified", "details": "Found in repository: fast-api-demo/Dockerfile"},
            {"source": "Projects", "description": "No Docker Compose or multi-stage production builds", "contribution": 0, "status": "unverified", "details": "Container is a development template"},
        ],
        "claim_vs_evidence": {
            "resume_claim": "Containerization with Docker",
            "observed_evidence": [
                "1 Dockerfile found",
                "Single-stage build only",
                "No docker-compose orchestration",
            ],
            "assessment": "Limited Support",
            "confidence_score": 38,
        },
        "mismatch": None,
        "ai_explanation": (
            "You have demonstrated basic Docker setup with a single Dockerfile. "
            "To reach Moderate or Strong evidence, implement a multi-stage production build and docker-compose.yml."
        ),
    },
]

DEMO_OVERALL_REPORT = {
    "overall_score": 78,
    "verified_count": 8,
    "partial_count": 3,
    "weak_count": 2,
    "total_skills": 13,
    "categories": {
        "technical": 84,
        "projects": 79,
        "github": 72,
        "portfolio": 68,
        "resumeConsistency": 81,
    },
    "source_availability": {
        "github": True,
        "portfolio": False,
        "resume": True,
        "certifications": False,
    },
    "skills": DEMO_SKILLS_DATA,
    "mismatches": [
        {
            "skill": "AWS",
            "type": "under_supported",
            "severity": "warning",
            "title": "Potential Claim Mismatch",
            "resume_claim": "Expert in AWS",
            "observed_evidence": "No AWS projects, commits, or deployment templates detected",
            "recommendation": "Add a demonstrable AWS project or reduce the proficiency claim until stronger evidence exists.",
        }
    ],
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AnalyzeSkillsRequest(BaseModel):
    profile_id: Optional[str] = None
    skills: Optional[List[str]] = None
    claims_map: Optional[Dict[str, str]] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def get_evidence_report(
    profile_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """
    Returns the full Evidence Confidence report for a profile.
    If no profile_id is provided or found, returns the baseline demo report.
    """
    if not profile_id:
        return DEMO_OVERALL_REPORT

    profile = await session.get(Profile, profile_id)
    if not profile:
        return DEMO_OVERALL_REPORT

    # Fetch evidence items for this profile
    stmt = select(Evidence).where(Evidence.profile_id == profile_id)
    result = await session.execute(stmt)
    evidence_items = result.scalars().all()

    if not evidence_items:
        return DEMO_OVERALL_REPORT

    # Find claimed skills from resume evidence or score run
    claim_skills = []
    for ev in evidence_items:
        if ev.source in ["resume", "linkedin_pdf"]:
            claim_skills.extend(ev.skill_hints)

    supplied_sources = list({ev.source for ev in evidence_items})

    report = engine.generate_report(
        claim_skills=list(set(claim_skills)),
        evidence_items=evidence_items,
        supplied_sources=supplied_sources,
    )

    # Format into serializable dict
    return {
        "overall_score": report.overall_score,
        "verified_count": report.verified_count,
        "partial_count": report.partial_count,
        "weak_count": report.weak_count,
        "total_skills": report.total_skills,
        "categories": report.categories,
        "source_availability": report.source_availability,
        "skills": [
            {
                "skill": s.skill,
                "score": s.score,
                "status": s.status,
                "status_range": s.status_range,
                "sources_count": s.sources_count,
                "breakdown": s.breakdown,
                "sources": [
                    {
                        "source": src.source,
                        "description": src.description,
                        "contribution": src.contribution,
                        "status": src.status,
                        "details": src.details,
                    }
                    for src in s.sources
                ],
                "claim_vs_evidence": s.claim_vs_evidence,
                "mismatch": s.mismatch,
                "ai_explanation": s.ai_explanation,
            }
            for s in report.skills
        ],
        "mismatches": report.mismatches,
    }


@router.get("/summary")
async def get_evidence_summary(
    profile_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Compact evidence summary for dashboard widgets."""
    report = await get_evidence_report(profile_id=profile_id, session=session)

    skills = report.get("skills", [])
    top_verified = [s["skill"] for s in skills if s.get("score", 0) >= 80][:3]
    needs_evidence = [s["skill"] for s in skills if s.get("score", 0) <= 40][:2]

    return {
        "overall_score": report.get("overall_score", 78),
        "verified_count": report.get("verified_count", 8),
        "partial_count": report.get("partial_count", 3),
        "weak_count": report.get("weak_count", 2),
        "total_skills": report.get("total_skills", len(skills)),
        "top_verified": top_verified or ["Java", "React", "SQL"],
        "needs_evidence": needs_evidence or ["AWS", "Docker"],
        "categories": report.get("categories", {}),
    }


@router.get("/skills/{skill_name}")
async def get_skill_detail(
    skill_name: str,
    profile_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Get detailed evidence breakdown for a single skill."""
    report = await get_evidence_report(profile_id=profile_id, session=session)
    skills = report.get("skills", [])
    matching = next((s for s in skills if s["skill"].lower() == skill_name.lower()), None)

    if not matching:
        raise HTTPException(status_code=404, detail=f"Evidence for skill '{skill_name}' not found")

    return matching


@router.post("/analyze")
async def analyze_evidence(
    body: AnalyzeSkillsRequest,
    session: AsyncSession = Depends(get_session),
):
    """Run evidence confidence analysis on-demand."""
    return await get_evidence_report(profile_id=body.profile_id, session=session)
