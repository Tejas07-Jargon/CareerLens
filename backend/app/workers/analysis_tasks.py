"""
Analysis Celery tasks.

run_fast_analysis(profile_id)
  Fast pass: extracts resume, github fast metadata, live probe, calculates initial score.
  Triggers run_deep_analysis upon completion.

run_deep_analysis(profile_id)
  Deep pass: clones repositories, runs static analysis, authenticity check, temporal check,
  and updates the score to final complete state.
"""

import asyncio
import structlog
from app.workers.celery_app import celery_app
from app.services.analysis_orchestrator import AnalysisOrchestrator

log = structlog.get_logger(__name__)


@celery_app.task(bind=True, name="analysis.fast_pass", max_retries=2)
def run_fast_analysis(self, profile_id: str) -> None:
    """Fast pass: GitHub metadata + resume + live probe. Completes in seconds."""
    orchestrator = AnalysisOrchestrator()
    try:
        asyncio.run(orchestrator.run_fast_analysis(profile_id))
        # Trigger deep analysis as follow-up
        run_deep_analysis.delay(profile_id)
    except Exception as exc:
        log.error("run_fast_analysis failed", profile_id=profile_id, error=str(exc))
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(bind=True, name="analysis.deep_pass", max_retries=1)
def run_deep_analysis(self, profile_id: str) -> None:
    """Deep pass: repo clone + static analysis + authenticity + temporal consistency."""
    orchestrator = AnalysisOrchestrator()
    try:
        asyncio.run(orchestrator.run_deep_analysis(profile_id))
    except Exception as exc:
        log.error("run_deep_analysis failed", profile_id=profile_id, error=str(exc))
        raise self.retry(exc=exc, countdown=10)
