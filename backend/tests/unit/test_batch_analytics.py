"""
Unit tests for Batch Analytics & Workshop Optimiser.
"""

from app.services.batch.batch_analytics_service import BatchAnalyticsService


def test_batch_analytics_privacy_guard():
    small_runs = [{"claim_statuses": [{"skill": "Python", "confidence": 0.8}]}]
    svc = BatchAnalyticsService(score_runs=small_runs, cohort_size=2)
    # Below minimum cohort size of 5 -> suppressed
    assert svc.skill_heatmap() is None
    assert svc.top_skill_gaps() is None
    assert svc.optimise_workshops([]) is None


def test_batch_analytics_and_workshop_optimiser():
    score_runs = [
        {"claim_statuses": [{"skill": "Python", "confidence": 0.9}, {"skill": "Docker", "confidence": 0.1}]},
        {"claim_statuses": [{"skill": "Python", "confidence": 0.8}, {"skill": "Testing", "confidence": 0.2}]},
        {"claim_statuses": [{"skill": "Python", "confidence": 0.7}, {"skill": "Docker", "confidence": 0.2}]},
        {"claim_statuses": [{"skill": "Python", "confidence": 0.85}, {"skill": "Testing", "confidence": 0.1}]},
        {"claim_statuses": [{"skill": "Python", "confidence": 0.9}, {"skill": "Docker", "confidence": 0.15}]},
        {"claim_statuses": [{"skill": "Python", "confidence": 0.8}, {"skill": "Testing", "confidence": 0.25}]},
    ]

    svc = BatchAnalyticsService(score_runs=score_runs, cohort_size=6)
    heatmap = svc.skill_heatmap()
    assert heatmap is not None
    assert heatmap["Python"] > 0.7
    assert heatmap["Docker"] < 0.3

    gaps = svc.top_skill_gaps(n=2)
    assert len(gaps) == 2
    assert gaps[0]["skill"] in {"Docker", "Testing"}

    workshops = [
        {"name": "Docker for Engineers", "skills_covered": ["Docker"]},
        {"name": "Test Driven Development", "skills_covered": ["Testing"]},
        {"name": "Python Mastery", "skills_covered": ["Python"]},
    ]

    plan = svc.optimise_workshops(workshops, budget=2)
    assert plan is not None
    assert len(plan) == 2
    selected_names = [w["name"] for w in plan]
    assert "Docker for Engineers" in selected_names
    assert "Test Driven Development" in selected_names
