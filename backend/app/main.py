"""
CareerLens – FastAPI application entry point.

Everything the system says (score, gap, roadmap, dashboard) is a pure function
of Evidence records. The LLM never decides anything; it only explains.
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import profiles, roles, cohorts, health
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import configure_logging

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await init_db()
    log.info("CareerLens backend started", env=settings.APP_ENV)
    yield
    log.info("CareerLens backend shutting down")


app = FastAPI(
    title="CareerLens API",
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
app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(cohorts.router, prefix="/cohorts", tags=["Cohorts"])
