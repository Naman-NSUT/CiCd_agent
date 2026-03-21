"""
corpus_cache.py — TTL-cached corpus loader for BM25 sparse retrieval.

Fetches all memories from Mem0 once every CACHE_TTL seconds and caches
them at module level so BM25 indexing doesn't hit Mem0 on every request.
"""

import time
import logging
from ci_cd_analyzer.memory_client import get_memory

logger = logging.getLogger(__name__)

CACHE_TTL = 600  # 10 minutes

_corpus_cache: dict = {
    "docs":        [],   # list[{"id": str, "text": str, "metadata": dict}]
    "last_loaded": 0.0,
}


async def load_memory_corpus() -> list[dict]:
    """
    Return the full memory corpus, refreshing from Mem0 if TTL has expired.
    Never raises — returns empty list on failure so BM25 degrades gracefully.
    """
    now = time.time()
    if now - _corpus_cache["last_loaded"] <= CACHE_TTL:
        return _corpus_cache["docs"]

    try:
        memory = await get_memory()
        all_memories = await memory.get_all(limit=5000)
        raw = (
            all_memories.get("results", [])
            if isinstance(all_memories, dict)
            else all_memories
        )
        _corpus_cache["docs"] = [
            {
                "id":       m.get("id", ""),
                "text":     m.get("memory", ""),
                "metadata": m.get("metadata", {}),
            }
            for m in raw
            if m.get("memory")   # skip empty memories
        ]
        _corpus_cache["last_loaded"] = now
        logger.info(
            "[BM25 corpus] Refreshed %d documents from Mem0.",
            len(_corpus_cache["docs"]),
        )
    except Exception as e:
        logger.warning("[BM25 corpus] Failed to refresh — using stale cache. Error: %s", e)

    return _corpus_cache["docs"]


def invalidate_corpus_cache() -> None:
    """Force the next call to reload the corpus (e.g. after memory_save_node runs)."""
    _corpus_cache["last_loaded"] = 0.0
