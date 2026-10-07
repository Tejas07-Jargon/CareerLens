"""
Database engine and session factory.

Default: SQLite (aiosqlite) for demo / hackathon.
Switch to Postgres by setting DATABASE_URL in .env.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables on startup (development convenience)."""
    async with engine.begin() as conn:
        # Import all models so Base knows about them before create_all
        from app.models import (  # noqa: F401
            profile,
            evidence,
            score_run,
            role_profile,
            cohort,
            consent,
            audit_log,
        )
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency — yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session
