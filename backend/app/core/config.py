"""
Application settings loaded from environment / .env file.
Uses pydantic-settings so every field is validated at startup.
"""

from functools import lru_cache
from typing import List, Union

from pydantic import field_validator
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
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            return "sqlite+aiosqlite:///./careerlens_demo.db"
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v
        
    def get_gemini_api_key(self) -> str:
        if not self.GEMINI_API_KEY:
            return ""
        import random
        keys = [k.strip() for k in self.GEMINI_API_KEY.split(",") if k.strip()]
        return random.choice(keys) if keys else ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
