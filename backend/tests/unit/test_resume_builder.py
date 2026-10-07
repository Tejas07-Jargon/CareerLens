"""
Unit tests for CareerLens Evidence-Aware Resume Builder.
"""

import pytest
from app.models.profile import Profile
from app.models.evidence import Evidence
from app.services.resume.resume_generator import ResumeGenerator
from app.services.resume.resume_optimizer import ResumeOptimizer
from app.services.resume.ats_validator import ATSValidator
from app.services.resume.ai_suggester import AISuggester
from app.services.resume.pdf_exporter import ResumePDFExporter


def test_resume_generator_evidence_awareness():
    generator = ResumeGenerator()
    profile = Profile(
        id="test-p-1",
        display_name="Alice Developer",
        github_username="alice-dev",
        target_role="Software Engineer",
    )
    
    # Evidence with Python, SQL, FastAPI
    ev1 = Evidence(
        id="ev_py",
        profile_id="test-p-1",
        source="github_repo",
        evidence_type="language",
        skill_hints=["Python"],
        reliability=0.9,
        depth=0.8,
        recency=1.0,
        authenticity=1.0,
        locator={"repo": "backend-core", "path": "app/main.py"},
    )
    ev2 = Evidence(
        id="ev_sql",
        profile_id="test-p-1",
        source="github_repo",
        evidence_type="file",
        skill_hints=["SQL"],
        reliability=0.85,
        depth=0.8,
        recency=1.0,
        authenticity=1.0,
        locator={"repo": "backend-core", "path": "alembic/001.py"},
    )

    resume = generator.generate_initial_resume(
        profile=profile,
        evidence_items=[ev1, ev2],
        target_role="Software Engineer",
    )

    assert resume["header"]["full_name"] == "Alice Developer"
    assert "Python" in [s["name"] for s in resume["skills"]]
    assert "SQL" in [s["name"] for s in resume["skills"]]

    # Verify skill statuses
    py_skill = next(s for s in resume["skills"] if s["name"] == "Python")
    assert py_skill["evidence_status"] in ("VERIFIED", "STRONG")
    assert "ev_py" in py_skill["evidence_ids"]


def test_unverified_claim_integrity_check():
    """
    CRITICAL TEST:
    Given: Resume claims Docker/Kubernetes, but NO evidence exists for Kubernetes.
    CareerLens must NOT mark Kubernetes as verified.
    """
    validator = ATSValidator()
    
    resume_content = {
        "header": {"full_name": "Alice Developer", "email": "alice@example.com"},
        "summary": "Experienced software engineer with Kubernetes infrastructure depth.",
        "skills": [
            {"name": "Python", "evidence_status": "VERIFIED", "confidence": 92},
            {"name": "Kubernetes", "evidence_status": "VERIFIED", "confidence": 90},  # Falsely claimed verified
        ],
        "projects": [
            {
                "name": "Backend Microservice",
                "technologies": ["Python", "FastAPI"],
                "bullets": ["Engineered high performance service with tests."],
                "evidence_status": "VERIFIED",
            }
        ],
        "education": [{"degree": "B.Tech", "institution": "Tech Institute"}],
    }

    # Only Python and SQL have actual evidence
    known_evidence_skills = ["Python", "SQL", "FastAPI"]

    val_result = validator.validate(
        resume_content=resume_content,
        known_evidence_skills=known_evidence_skills,
        target_role="Software Engineer",
    )

    # Kubernetes should be detected as unsupported by evidence!
    alert_skills = [a["skill"] for a in val_result["evidence_alerts"]]
    assert "Kubernetes" in alert_skills
    k8s_alert = next(a for a in val_result["evidence_alerts"] if a["skill"] == "Kubernetes")
    assert "not currently supported" in k8s_alert["message"].lower()


def test_resume_optimizer_jd_alignment():
    optimizer = ResumeOptimizer()
    
    resume_content = {
        "header": {"full_name": "Pushkar", "email": "pushkar@example.com"},
        "summary": "AI Engineer skilled in Python, PyTorch, Deep Learning, SQL, and FastAPI.",
        "skills": [
            {"name": "Python", "evidence_status": "VERIFIED", "confidence": 95},
            {"name": "Machine Learning", "evidence_status": "VERIFIED", "confidence": 92},
            {"name": "PyTorch", "evidence_status": "VERIFIED", "confidence": 88},
            {"name": "Deep Learning", "evidence_status": "STRONG", "confidence": 84},
            {"name": "SQL", "evidence_status": "VERIFIED", "confidence": 80},
            {"name": "FastAPI", "evidence_status": "VERIFIED", "confidence": 85},
            {"name": "Git", "evidence_status": "VERIFIED", "confidence": 90},
        ],
        "projects": [
            {
                "name": "Vision Classifier",
                "technologies": ["Python", "PyTorch", "Machine Learning"],
                "bullets": ["Trained classification model with 94% accuracy."],
                "evidence_status": "VERIFIED",
            }
        ],
    }

    res = optimizer.analyze(resume_content, target_role="AI Engineer")
    assert res["overall_alignment"] >= 70
    assert "Python" in res["matched_skills"]
    assert "Machine Learning" in res["matched_skills"]
    assert res["quality_score"] >= 75
    assert "quality_breakdown" in res



def test_ai_suggester():
    suggester = AISuggester()
    suggestion = suggester.suggest_summary(
        current_text="I am a CS student.",
        target_role="AI Engineer",
        verified_skills=["Python", "Machine Learning", "FastAPI"],
    )
    assert suggestion["section"] == "summary"
    assert "AI Engineer" in suggestion["suggestion"]
    assert len(suggestion["evidence_tags"]) > 0


def test_pdf_export_deterministic():
    exporter = ResumePDFExporter()
    content = {
        "header": {
            "full_name": "Tejas Jargon",
            "target_title": "AI Engineer",
            "email": "tejas@careerlens.io",
            "github": "https://github.com/tejas-ai",
        },
        "summary": "Proven AI Engineer with verified Python and PyTorch project architectures.",
        "skills": [{"name": "Python"}, {"name": "SQL"}],
        "projects": [
            {
                "name": "CareerLens Engine",
                "technologies": ["Python", "FastAPI"],
                "bullets": ["Built deterministic static evidence analysis engine."],
            }
        ],
        "education": [{"degree": "B.Tech CS", "institution": "IIIT"}],
    }
    
    pdf_bytes = exporter.generate_pdf(content, template_id="modern")
    assert len(pdf_bytes) > 200
    assert pdf_bytes.startswith(b"%PDF")
