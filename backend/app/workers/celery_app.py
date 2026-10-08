"""
Celery worker – asynchronous analysis tasks.

Task graph:
  run_fast_analysis    → triggered immediately on profile submission
    └─ run_deep_analysis → triggered after fast pass completes

Both tasks write Evidence records and update the Profile status.
Progress is streamed to the frontend via Server-Sent Events (GET /profiles/{id}/stream).
"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "kareer_kranti",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.analysis_tasks",
        "app.workers.ownership_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_max_tasks_per_child=100,  # prevent memory leaks on long-running workers
)
