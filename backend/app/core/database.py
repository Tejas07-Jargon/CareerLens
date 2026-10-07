"""
Database engine and session factory.

Default: SQLite (aiosqlite) for demo / hackathon.
Switch to Postgres by setting DATABASE_URL in .env.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
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
        from app.models import (  # noqa: F401
            profile,
            evidence,
            score_run,
            role_profile,
            cohort,
            consent,
            audit_log,
            dynamic_profile,
        )
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency — yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session
