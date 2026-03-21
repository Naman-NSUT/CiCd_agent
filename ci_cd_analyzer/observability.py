"""
observability.py — LangSmith tracing integration for the CI/CD analyzer.

All nodes are traced via @traceable (applied in nodes.py).
This module provides:
  - ls_client: LangSmith Client singleton (no-op if LANGCHAIN_API_KEY not set)
  - run_graph(): async wrapper that adds repo/branch/stage metadata to every trace
"""

import os
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# ── LangSmith client (lazy / graceful degradation) ────────────────────────────
_ls_client = None

def get_ls_client():
    """Return the LangSmith client, or None if tracing is not configured."""
    global _ls_client
    if _ls_client is not None:
        return _ls_client
    if not os.environ.get("LANGCHAIN_API_KEY"):
        logger.debug("[LangSmith] LANGCHAIN_API_KEY not set — tracing disabled.")
        return None
    try:
        from langsmith import Client
        _ls_client = Client()
        logger.info("[LangSmith] Tracing enabled → project=%s",
                    os.environ.get("LANGCHAIN_PROJECT", "cicd-error-classifier"))
    except ImportError:
        logger.warning("[LangSmith] langsmith not installed — tracing disabled.")
    return _ls_client

# Export convenience alias
ls_client = get_ls_client()


# ── run_graph(): traced graph entry-point ─────────────────────────────────────
async def run_graph(raw_log: str, metadata: dict) -> dict:
    """
    Invoke the CI/CD analyzer graph with LangSmith trace context.
    Falls back to plain graph.ainvoke() if tracing is not configured.

    Args:
        raw_log:  Raw CI/CD pipeline log text.
        metadata: Dict with at minimum: repo, branch, run_id.
                  Optional: stage, team.

    Returns:
        Final PipelineState dict from the graph.
    """
    from ci_cd_analyzer.graph import graph  # late import to avoid circular deps

    run_id = metadata.get("run_id", "unknown")

    config = {
        "configurable": {"thread_id": run_id},
        "metadata": {
            "repo":    metadata.get("repo", ""),
            "branch":  metadata.get("branch", ""),
            "stage":   metadata.get("stage", ""),
            "run_id":  run_id,
            "project": os.environ.get("LANGCHAIN_PROJECT", "cicd-error-classifier"),
        },
        "tags": [
            metadata.get("repo", "unknown-repo"),
            metadata.get("branch", "unknown-branch"),
            metadata.get("stage", "unknown-stage"),
        ],
    }

    initial_state = {
        "raw_log":           raw_log,
        "pipeline_metadata": metadata,
    }

    # If LangSmith tracing is active, wrap in a trace context
    if os.environ.get("LANGCHAIN_API_KEY") and os.environ.get("LANGCHAIN_TRACING_V2") == "true":
        try:
            from langsmith import trace
            with trace(
                name         = "cicd_pipeline_analysis",
                project_name = os.environ.get("LANGCHAIN_PROJECT", "cicd-error-classifier"),
                metadata     = config["metadata"],
                tags         = config["tags"],
            ):
                return await graph.ainvoke(initial_state, config=config)
        except Exception as e:
            logger.warning("[LangSmith] Trace context failed (%s) — running without tracing.", e)

    return await graph.ainvoke(initial_state, config=config)
