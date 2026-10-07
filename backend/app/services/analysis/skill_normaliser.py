"""
Skill normaliser.

Three-tier resolution:
  1. Exact match in the alias table (fastest, zero cost)
  2. RapidFuzz fuzzy match on the alias table (< 1 ms per skill)
  3. Cosine similarity via a local sentence-transformer embedding (< 50 ms)
     — used only when tiers 1 & 2 fail

The normalised canonical name is stored in Evidence.skill_hints so every
downstream component uses the same vocabulary.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

import structlog
from rapidfuzz import process, fuzz

log = structlog.get_logger(__name__)

ALIAS_TABLE_PATH = Path(__file__).parent.parent.parent.parent.parent / "data" / "skill_aliases" / "aliases.json"
FUZZY_SCORE_THRESHOLD = 85
EMBEDDING_SIM_THRESHOLD = 0.80


@lru_cache(maxsize=1)
def _load_alias_table() -> Dict[str, str]:
    """
    Load aliases.json: {raw_variant: canonical_name}
    Cached for the process lifetime.
    """
    if ALIAS_TABLE_PATH.exists():
        return json.loads(ALIAS_TABLE_PATH.read_text(encoding="utf-8"))
    log.warning("Alias table not found, starting with empty table", path=str(ALIAS_TABLE_PATH))
    return {}


@lru_cache(maxsize=1)
def _get_embedding_model():
    """Load the sentence-transformer model once."""
    try:
        from sentence_transformers import SentenceTransformer
        from app.core.config import settings
        return SentenceTransformer(settings.EMBEDDING_MODEL)
    except Exception as exc:
        log.warning("Could not load embedding model", error=str(exc))
        return None


class SkillNormaliser:
    """
    Normalise a raw skill string to a canonical name.

    Usage
    -----
    normaliser = SkillNormaliser()
    canonical = normaliser.normalise("nodejs")   # → "Node.js"
    """

    def __init__(self):
        self._alias_table = _load_alias_table()
        self._canonicals = list(set(self._alias_table.values()))

    def normalise(self, raw: str) -> str:
        """Return the canonical skill name, or the input title-cased if unknown."""
        clean = raw.strip().lower()

        # Tier 1: exact alias lookup
        if clean in self._alias_table:
            return self._alias_table[clean]

        # Tier 2: fuzzy match on alias keys
        if self._alias_table:
            best, score, _ = process.extractOne(
                clean,
                self._alias_table.keys(),
                scorer=fuzz.token_sort_ratio,
            ) or (None, 0, None)
            if score and score >= FUZZY_SCORE_THRESHOLD:
                return self._alias_table[best]

        # Tier 3: embedding similarity on canonical names
        canonical = self._embedding_lookup(raw)
        if canonical:
            return canonical

        # Unknown: return title-cased original
        return raw.title()

    def _embedding_lookup(self, raw: str) -> Optional[str]:
        model = _get_embedding_model()
        if model is None or not self._canonicals:
            return None
        try:
            import numpy as np
            query_emb = model.encode([raw], normalize_embeddings=True)
            corpus_embs = model.encode(self._canonicals, normalize_embeddings=True)
            sims = (corpus_embs @ query_emb.T).flatten()
            best_idx = int(np.argmax(sims))
            if sims[best_idx] >= EMBEDDING_SIM_THRESHOLD:
                return self._canonicals[best_idx]
        except Exception as exc:
            log.warning("Embedding lookup failed", error=str(exc))
        return None
