"""
Kareer Kranti – FastAPI application entry point.

Everything the system says (score, gap, roadmap, dashboard) is a pure function
of Evidence records. The LLM never decides anything; it only explains.
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import profiles, roles, cohorts, health, quiz, evidence, resumes, job_fit, ownership, leetcode
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import configure_logging

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await init_db()
    log.info("Kareer Kranti backend started", env=settings.APP_ENV)
    yield
    log.info("Kareer Kranti backend shutting down")


app = FastAPI(
    title="Kareer Kranti API",
    description=(
        "Evidence-based employability analysis. Every score is a pure function "
        "of Evidence records; every sentence cites at least one."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
app.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
app.include_router(job_fit.router, prefix="/job-fit", tags=["Job Fit"])
app.include_router(ownership.router, prefix="/profiles", tags=["Ownership"])
app.include_router(leetcode.router, prefix="/profiles", tags=["LeetCode"])
app.include_router(evidence.router, prefix="/evidence", tags=["Evidence"])
app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(cohorts.router, prefix="/cohorts", tags=["Cohorts"])
app.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])



