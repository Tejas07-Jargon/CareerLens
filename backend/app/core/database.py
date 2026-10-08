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


from sqlalchemy import text

async def verify_schema(conn):
    """Verify that all mapped tables exist and have all required columns."""
    for table_name, table in Base.metadata.tables.items():
        result = await conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}';"))
        if not result.scalar():
            continue  # Table doesn't exist, create_all will create it
            
        result = await conn.execute(text(f"PRAGMA table_info({table_name});"))
        rows = result.fetchall()
        existing_cols = {row[1] for row in rows}
        
        for col in table.columns:
            if col.name not in existing_cols:
                raise RuntimeError(
                    f"Database schema is out of date. "
                    f"Table '{table_name}' is missing column '{col.name}'. "
                    f"Please run 'PYTHONPATH=. python scripts/migrate_sqlite.py' to apply the schema upgrade."
                )

async def init_db() -> None:
    """Create all tables on startup (development convenience)."""
    from app.models import __all__ as all_models  # Ensure all models are imported
    async with engine.begin() as conn:
        await verify_schema(conn)
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency — yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session
