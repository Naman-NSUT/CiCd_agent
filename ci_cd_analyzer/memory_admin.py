"""
memory_admin.py — Utilities for managing the Mem0 CI/CD memory layer.
"""

from ci_cd_analyzer.memory_client import get_memory

async def forget_memory(memory_id: str):
    """Forget a specific bad memory (e.g., wrong fix was stored)."""
    memory = await get_memory()
    await memory.delete(memory_id=memory_id)

async def reset_repo_memory(repo: str):
    """Forget all memories for a repo (e.g., after major refactor)."""
    memory = await get_memory()
    results = await memory.get_all(
        filters={"repo": {"eq": repo}}
    )
    # mem0 `get_all` returns a dict with "results" or list depending on store
    mem_list = results.get("results", []) if isinstance(results, dict) else results
    for m in mem_list:
        await memory.delete(memory_id=m["id"])

async def export_memories(user_id: str) -> list[dict]:
    """Export memories to JSON for audit."""
    memory = await get_memory()
    results = await memory.get_all(user_id=user_id)
    return results.get("results", []) if isinstance(results, dict) else results

async def update_memory(memory_id: str, corrected_fix: str):
    """Update a memory with corrected fix (after human review)."""
    memory = await get_memory()
    await memory.update(
        memory_id=memory_id,
        data=corrected_fix,
    )
