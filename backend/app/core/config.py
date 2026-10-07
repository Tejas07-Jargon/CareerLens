"""
Application settings loaded from environment / .env file.
Uses pydantic-settings so every field is validated at startup.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Application ──────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me"
    LOG_LEVEL: str = "INFO"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./careerlens_demo.db"

    # ── Redis / Celery ───────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ── GitHub ───────────────────────────────────────────────────────────────
    GITHUB_TOKEN: str = ""
    GITHUB_MAX_REPOS_FAST: int = 20
    GITHUB_MAX_REPOS_DEEP: int = 5
    GITHUB_MAX_CLONE_MB: int = 50

    # ── LLM ──────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_FAST_MODEL: str = "gemini-1.5-flash"
    LLM_STRONG_MODEL: str = "gemini-1.5-pro"

    # ── Embedding ────────────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── Scoring ───────────────────────────────────────────────────────────────
    EVIDENCE_VERIFIED_THRESHOLD: float = 0.6
    EVIDENCE_PARTIAL_THRESHOLD: float = 0.25
    SMALL_COHORT_MIN_SIZE: int = 5

    # ── Voice ────────────────────────────────────────────────────────────────
    ELEVENLABS_API_KEY: str = ""

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
