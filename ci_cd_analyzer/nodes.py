import asyncio
import re
import json
import logging
import traceback
from langgraph.types import interrupt
from tenacity import retry, stop_after_attempt, wait_exponential
from google.genai import types

from ci_cd_analyzer.state import PipelineState
from ci_cd_analyzer.llm import (
    client, GEMINI_PRO, GEMINI_FLASH, GEMINI_FLASH_LITE,
    classification_config, analysis_config, report_config
)
from ci_cd_analyzer.prompts import (
    CLASSIFICATION_PROMPT,
    ROOT_CAUSE_PROMPT,
    FIX_RECOMMENDATION_PROMPT,
    REMEDIATION_SELECTION_PROMPT,
)
import uuid
from rank_bm25 import BM25Okapi
from ci_cd_analyzer.memory_client import get_memory
from ci_cd_analyzer.log_preprocessor import DrainPreprocessor
from ci_cd_analyzer.corpus_cache import load_memory_corpus
from ci_cd_analyzer.threshold_manager import get_threshold
from ci_cd_analyzer.calibration_db import record_outcome, init_db as _init_calib_db

# Ensure calibration DB tables exist at import time (idempotent)
try:
    _init_calib_db()
except Exception:
    pass  # never block startup

def _traceable(*args, **kwargs):  # type: ignore
    """No-op fallback decorator."""
    def decorator(fn):
        return fn
    return decorator if args and callable(args[0]) else decorator

logger = logging.getLogger(__name__)

# --- Retries for Gemini calls ---
@_traceable(name="generate_content_with_retry", run_type="llm")
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
def generate_content_with_retry(model, contents, config):
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=config
    )

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
def embed_content_with_retry(model, contents):
    return client.models.embed_content(
        model=model,
        contents=contents
    )


# --- 1. Log Ingestion (Drain3 template mining) ---
_drain_preprocessor = DrainPreprocessor(max_templates=200)

@_traceable(name="log_ingestion_node", run_type="chain")
async def log_ingestion_node(state: PipelineState) -> PipelineState:
    raw = state.get("raw_log", "")

    # Validate
    if not raw or not raw.strip():
        return {**state, "error_message": "Log is empty"}

    # Run Drain3 in a thread (CPU-bound) — emit structured clusters too
    compressed_log, clusters, stats = await asyncio.to_thread(
        _drain_preprocessor.preprocess_with_clusters, raw
    )

    # Propagate compression stats into pipeline_metadata
    updated_meta = {
        **state.get("pipeline_metadata", {}),
        "raw_line_count":        stats["raw_line_count"],
        "compressed_line_count": stats["compressed_line_count"],
        "compression_ratio":     stats["compression_ratio"],
    }

    return {
        **state,
        "cleaned_log":           compressed_log,
        "all_drain_clusters":    clusters,
        "pipeline_metadata":     updated_meta,
        "raw_line_count":        stats["raw_line_count"],
        "compressed_line_count": stats["compressed_line_count"],
        "compression_ratio":     stats["compression_ratio"],
    }


# --- 2. Error Extraction — Drain3 + LogSieve task-aware compression ---
from ci_cd_analyzer.task_aware_compressor import TaskAwareCompressor

_get_context_lines = lambda lines, idx, w=3: "\n".join(
    lines[max(0, idx - w): min(len(lines), idx + w + 1)]
)
_compressor = TaskAwareCompressor()

@_traceable(name="error_extraction_node", run_type="chain")
async def error_extraction_node(state: PipelineState) -> PipelineState:
    clusters = state.get("all_drain_clusters", [])

    # ── Derive classification hint from loaded_memories (Tier 2 context) ───
    hint: str | None = None
    loaded = state.get("loaded_memories", [])
    if loaded:
        types_seen = [
            m.get("metadata", {}).get("error_type")
            for m in loaded
            if m.get("metadata", {}).get("error_type")
        ]
        if types_seen:
            hint = max(set(types_seen), key=types_seen.count)
            logger.info("[LogSieve] Classification hint from memory: %s", hint)

    # ── TaskAwareCompressor: score + budget-aware filter ──────────────────
    task_compressed_log, compression_stats = await asyncio.to_thread(
        _compressor.compress,
        clusters,
        hint,          # classification_hint
        4000,          # max_tokens
        0.2,           # min_relevance
    )

    # ── Build extracted_errors from all scored clusters above threshold ───
    extracted_errors: list[dict] = [
        {
            "line_number":      s.first_lineno,
            "error_text":       s.template,
            "context_window":   "\n".join(s.context),
            "occurrence_count": s.count,
            "relevance_score":  s.relevance,
            "signal_terms":     s.signal_terms,
            "is_drain_template": True,
        }
        for s in _compressor._last_scored
        if s.relevance >= 0.2
    ]

    return {
        **state,
        "extracted_errors":    extracted_errors,
        "task_compressed_log": task_compressed_log,
        "compression_stats":   compression_stats,
    }


# --- 3. Classification ---
def format_errors_for_prompt(errors: list[dict]) -> str:
    return json.dumps(errors, indent=2)

@_traceable(name="classification_node", run_type="llm")
async def classification_node(state: PipelineState) -> PipelineState:
    try:
        errors_text = format_errors_for_prompt(state.get("extracted_errors", []))
        metadata = json.dumps(state.get("pipeline_metadata", {}), indent=2)
        
        prompt = CLASSIFICATION_PROMPT.format(
            entity_context=json.dumps(state.get("entity_context", {}), indent=2),
            loaded_memories=json.dumps(state.get("loaded_memories", []), indent=2),
            errors=errors_text,
            metadata=metadata
        )
        
        response = await asyncio.to_thread(
            generate_content_with_retry,
            model=GEMINI_PRO,
            contents=prompt,
            config=classification_config
        )
        
        result = json.loads(response.text)
        
        usage = dict(state.get("gemini_usage", {}))
        if response.usage_metadata:
            usage["classification"] = response.usage_metadata.total_token_count
            
        classification   = result.get("classification", "Unknown")
        confidence_score = result.get("confidence_score", 0.0)
        threshold        = get_threshold(classification)  # dynamic per-type threshold
        needs_review     = confidence_score < threshold

        # Record classification outcome (human fields filled in later if reviewed)
        meta = state.get("pipeline_metadata", {})
        record_outcome(
            run_id         = meta.get("run_id", ""),
            repo           = meta.get("repo", ""),
            branch         = meta.get("branch", ""),
            error_type     = classification,
            model_class    = classification,
            confidence     = confidence_score,
            threshold_used = threshold,
        )

        return {
            **state,
            "classification":           classification,
            "confidence_score":         confidence_score,
            "classification_reasoning": result.get("reasoning", ""),
            "needs_human_review":       needs_review,
            "threshold_used":           threshold,
            "gemini_usage":             usage,
        }
    except Exception as e:
        logger.error(f"Classification Node Failed: {e}")
        return {
            **state,
            "classification": "Unknown",
            "needs_human_review": True,
            "error_message": f"Classification failed: {str(e)}"
        }


# --- 3b. Correlation — cross-repo infrastructure incident detection ---
from ci_cd_analyzer.correlation_store import (
    init_store as _init_corr_store,
    record_event as _record_event,
    find_correlation,
    update_incident_analysis,
)
try:
    _init_corr_store()
except Exception:
    pass  # never block startup

@_traceable(name="correlation_node", run_type="chain")
async def correlation_node(state: PipelineState) -> PipelineState:
    """
    Records this run in the shared event stream and checks whether
    3+ simultaneous failures across >=2 repos share the same error type.
    Leaders do full analysis; followers inherit results and skip LLM nodes.
    """
    meta       = state.get("pipeline_metadata", {})
    error_type = state.get("classification", "Unknown")
    run_id     = meta.get("run_id", "")

    # Always record this run (async-safe: sqlite write is fast)
    await asyncio.to_thread(
        _record_event,
        run_id, meta.get("repo", ""), meta.get("branch", ""),
        error_type, state.get("confidence_score", 0.0),
    )

    # Query for correlation
    correlation = await asyncio.to_thread(
        find_correlation, error_type, run_id
    )

    if correlation is None:
        return {
            **state,
            "is_correlated":      False,
            "incident_id":        None,
            "affected_repos":     [],
            "skip_llm_analysis":  False,
            "is_incident_leader": False,
        }

    logger.info(
        "[Correlation] Incident %s detected (%d repos, is_new=%s)",
        correlation["incident_id"], len(correlation["affected_repos"]), correlation["is_new"],
    )

    if not correlation["is_new"] and correlation["root_cause"]:
        # Follower: existing incident already has root_cause — inherit and skip LLM
        return {
            **state,
            "is_correlated":      True,
            "incident_id":        correlation["incident_id"],
            "affected_repos":     correlation["affected_repos"],
            "root_cause":         correlation["root_cause"],
            "recommended_fix":    correlation["fix"] or "",
            "similar_past_errors": [],
            "skip_llm_analysis":  True,
            "is_incident_leader": False,
        }

    # Leader: new cluster or existing cluster without root_cause yet — do full analysis
    return {
        **state,
        "is_correlated":      True,
        "incident_id":        correlation["incident_id"],
        "affected_repos":     correlation["affected_repos"],
        "skip_llm_analysis":  False,
        "is_incident_leader": True,
    }


# ── Retrieval helpers ────────────────────────────────────────────────

def extract_keywords(extracted_errors: list[dict]) -> list[str]:
    """Tokenise error lines into BM25 query keywords, removing stopwords."""
    STOPWORDS = {
        "the","a","an","is","in","on","at","to","for","of","and",
        "or","not","with","this","was","from","that","are","has","by",
    }
    words: list[str] = []
    for e in extracted_errors:
        tokens = re.findall(r'\b[A-Za-z][A-Za-z0-9_]{2,}\b', e.get("error_text", ""))
        words += [t.lower() for t in tokens if t.lower() not in STOPWORDS]
    return list(dict.fromkeys(words))[:50]   # preserve order, cap at 50


def rrf(result_lists: list, k: int = 60) -> list[dict]:
    """Reciprocal Rank Fusion across multiple ranked result lists."""
    rrf_scores: dict[str, float] = {}
    docs:       dict[str, dict]  = {}

    for result_list in result_lists:
        if isinstance(result_list, Exception) or not result_list:
            continue
        items = (
            result_list.get("results", [])
            if isinstance(result_list, dict)
            else result_list
        )
        for rank, item in enumerate(items):
            mid = item.get("id") or item.get("memory_id")
            if not mid:
                continue
            rrf_scores[mid] = rrf_scores.get(mid, 0.0) + 1.0 / (k + rank + 1)
            docs[mid] = item   # later route may overwrite with richer metadata

    ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [
        {**docs[mid], "rrf_score": round(score, 6), "rrf_rank": i + 1}
        for i, (mid, score) in enumerate(ranked[:7])
    ]


# --- 4. Retrieval — Three-Route RRF Hybrid Search ---
@_traceable(name="retrieval_node", run_type="retriever")
async def retrieval_node(state: PipelineState) -> PipelineState:
    """
    Runs Dense semantic, BM25 sparse, and exact metadata-filter searches in
    parallel, merges with Reciprocal Rank Fusion. Any single route failure
    is tolerated gracefully via asyncio.gather(return_exceptions=True).
    """
    memory = await get_memory()
    meta   = state.get("pipeline_metadata", {})

    # ── Route A: Dense semantic via Mem0 ────────────────────────────────────
    async def dense_search():
        return await memory.search(
            query   = state.get("memory_search_query", ""),
            user_id = state.get("memory_user_id", "unknown"),
            limit   = 5,
        )

    # ── Route B: BM25 sparse keyword search ───────────────────────────────
    async def bm25_search():
        corpus_docs = await load_memory_corpus()
        if not corpus_docs:
            return []
        tokenized = [d["text"].lower().split() for d in corpus_docs]
        bm25      = BM25Okapi(tokenized)
        keywords  = extract_keywords(state.get("extracted_errors", []))
        if not keywords:
            return []
        scores   = bm25.get_scores(keywords)
        top_idxs = scores.argsort()[-5:][::-1]
        return [
            {
                "id":       corpus_docs[i]["id"],
                "memory":   corpus_docs[i]["text"],
                "metadata": corpus_docs[i]["metadata"],
                "score":    float(scores[i]),
                "route":    "bm25",
            }
            for i in top_idxs
            if scores[i] > 0
        ]

    # ── Route C: Exact metadata filter ────────────────────────────────────
    async def metadata_filter_search():
        return await memory.search(
            query   = state.get("classification", ""),
            user_id = state.get("memory_user_id", "unknown"),
            limit   = 5,
            filters = {
                "AND": [
                    {"repo":       {"eq": meta.get("repo", "")}},
                    {"error_type": {"eq": state.get("classification", "")}},
                    {"resolved":   {"eq": True}},
                ]
            },
        )

    # ── Run all three routes in parallel ─────────────────────────────────
    dense_res, bm25_res, filter_res = await asyncio.gather(
        dense_search(),
        bm25_search(),
        metadata_filter_search(),
        return_exceptions=True,
    )

    # ── Track which routes succeeded ──────────────────────────────────────
    routes_used: list[str] = []
    if not isinstance(dense_res, Exception):  routes_used.append("dense")
    if not isinstance(bm25_res, Exception):   routes_used.append("bm25")
    if not isinstance(filter_res, Exception): routes_used.append("filter")
    logger.info("[Retrieval] Routes succeeded: %s", routes_used)

    # ── Reciprocal Rank Fusion ───────────────────────────────────────────
    d_items = dense_res  if not isinstance(dense_res,  Exception) else []
    b_items = bm25_res   if not isinstance(bm25_res,   Exception) else []
    f_items = filter_res if not isinstance(filter_res, Exception) else []

    merged = rrf([d_items, b_items, f_items])

    # ── Normalise into existing similar_past_errors schema ──────────────────
    similar_past_errors: list[dict] = [
        {
            "error_type":       m.get("metadata", {}).get("error_type", "unknown"),
            "root_cause":       m.get("memory", m.get("text", "")),
            "fix_applied":      m.get("metadata", {}).get("fix_summary",
                                m.get("metadata", {}).get("recommended_fix", "")),
            "resolution_time":  m.get("metadata", {}).get("resolution_time", ""),
            "similarity_score": m.get("rrf_score", 0.0),
            "retrieval_route":  m.get("route", "dense"),
            "rrf_rank":         m.get("rrf_rank", 0),
            "repo":             m.get("metadata", {}).get("repo", ""),
            "branch":           m.get("metadata", {}).get("branch", ""),
            "run_id":           m.get("metadata", {}).get("run_id", ""),
        }
        for m in merged
    ]

    return {
        **state,
        "similar_past_errors":  similar_past_errors,
        "retrieval_routes_used": routes_used,
        "retrieval_rrf_scores":  [m.get("rrf_score", 0.0) for m in merged],
    }


# --- 5. Root Cause Analysis — augmented with Tier 4 Entity Facts ---
@_traceable(name="root_cause_analysis_node", run_type="llm")
async def root_cause_analysis_node(state: PipelineState) -> PipelineState:
    try:
        meta = state.get("pipeline_metadata", {})
        repo = meta.get("repo", "unknown_repo")

        errors_text = format_errors_for_prompt(state.get("extracted_errors", []))
        similar_cases = json.dumps(state.get("similar_past_errors", []), indent=2)

        entity_context = state.get("entity_context", {})
        repo_patterns = "\n".join(f"- {f}" for f in entity_context.get("repo_patterns", [])) or "None"
        team_preferences = "\n".join(f"- {f}" for f in entity_context.get("team_preferences", [])) or "None"
        known_flaky_tests = "\n".join(f"- {f}" for f in entity_context.get("known_flaky_tests", [])) or "None"

        prompt = ROOT_CAUSE_PROMPT.format(
            repo=repo,
            repo_patterns=repo_patterns,
            team_preferences=team_preferences,
            known_flaky_tests=known_flaky_tests,
            errors=errors_text,
            classification=state.get("classification", "Unknown"),
            similar_cases=similar_cases
        )

        config = types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=4096,
            thinking_config=types.ThinkingConfig(
                thinking_budget=8192
            )
        )

        response = await asyncio.to_thread(
            generate_content_with_retry,
            model=GEMINI_PRO,
            contents=prompt,
            config=config
        )

        usage = dict(state.get("gemini_usage", {}))
        if response.usage_metadata:
            usage["root_cause_analysis"] = response.usage_metadata.total_token_count

        return {
            **state,
            "root_cause":      response.text,
            "gemini_usage":    usage,
        }
    except Exception as e:
        logger.error(f"Root Cause Node Failed: {e}")
        return {**state, "root_cause": f"Analysis failed: {str(e)}", "error_message": str(e)}


# --- 6. Fix Recommendation ---
@_traceable(name="fix_recommendation_node", run_type="llm")
async def fix_recommendation_node(state: PipelineState) -> PipelineState:
    try:
        similar_cases = json.dumps(state.get("similar_past_errors", []), indent=2)
        
        prompt = FIX_RECOMMENDATION_PROMPT.format(
            classification=state.get("classification", "Unknown"),
            root_cause=state.get("root_cause", ""),
            similar_cases=similar_cases
        )
        
        response = await asyncio.to_thread(
            generate_content_with_retry,
            model=GEMINI_FLASH,
            contents=prompt,
            config=analysis_config
        )
        
        usage = dict(state.get("gemini_usage", {}))
        if response.usage_metadata:
            usage["fix_recommendation"] = response.usage_metadata.total_token_count
            
        return {**state, "recommended_fix": response.text, "gemini_usage": usage}
    except Exception as e:
        logger.error(f"Fix Recommendation Node Failed: {e}")
        return {**state, "recommended_fix": "Could not generate fix recommendations.", "error_message": str(e)}


# --- 7. Remediation Executor — Gemini function-calling auto-fix ---
_SAFE_SEVERITIES   = {"low", "medium"}
_PROTECTED_BRANCHES = {"main", "master", "production", "release"}

@_traceable(name="remediation_executor_node", run_type="tool")
async def remediation_executor_node(state: PipelineState) -> PipelineState:
    """
    Uses Gemini function-calling to execute low-risk, reversible fixes automatically.
    Safety gate: only fires for low/medium severity, non-protected branches, high confidence.
    """
    # Lazy import here to avoid circular imports at module load
    from ci_cd_analyzer.tool_schemas import REMEDIATION_TOOLS, TOOL_REGISTRY

    meta   = state.get("pipeline_metadata", {})
    branch = meta.get("branch", "main")

    # ── Safety gate ──────────────────────────────────────────────────────────
    auto_ok = (
        state.get("severity") in _SAFE_SEVERITIES
        and branch not in _PROTECTED_BRANCHES
        and state.get("confidence_score", 0) >= 0.85
    )

    if not auto_ok:
        reason = (
            f"Safety gate blocked: severity={state.get('severity')}, "
            f"branch={branch}, "
            f"confidence={state.get('confidence_score', 0):.2f}"
        )
        logger.info(f"[Remediation] Skipping auto-execution — {reason}")
        return {
            **state,
            "remediation_result": {
                "executed":      False,
                "reason":        reason,
                "actions_taken": [],
                "auto_executed": False,
            },
        }

    # ── Ask Gemini Flash to select and parameterise tools ────────────────────
    prompt = REMEDIATION_SELECTION_PROMPT.format(
        classification  = state.get("classification", "Unknown"),
        root_cause      = state.get("root_cause", "")[:800],
        recommended_fix = state.get("recommended_fix", "")[:600],
        repo            = meta.get("repo", ""),
        branch          = branch,
        run_id          = meta.get("run_id", ""),
    )

    tool_config = types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode="ANY",  # must call a tool — no free-text bypass
            allowed_function_names=list(TOOL_REGISTRY.keys()),
        )
    )

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model   = GEMINI_FLASH,
            contents= prompt,
            config  = types.GenerateContentConfig(
                temperature = 0.0,
                tools       = REMEDIATION_TOOLS,
                tool_config = tool_config,
            ),
        )
    except Exception as e:
        logger.error(f"[Remediation] Gemini function-calling failed: {e}")
        return {
            **state,
            "remediation_result": {
                "executed":      False,
                "reason":        f"Gemini call failed: {e}",
                "actions_taken": [],
                "auto_executed": False,
            },
        }

    # ── Execute each tool call returned by Gemini ────────────────────────────
    actions_taken: list[dict] = []
    usage = dict(state.get("gemini_usage", {}))
    if response.usage_metadata:
        usage["remediation"] = response.usage_metadata.total_token_count

    for part in response.candidates[0].content.parts:
        if not hasattr(part, "function_call") or not part.function_call:
            continue
        fn_name = part.function_call.name
        fn_args = dict(part.function_call.args)

        if fn_name not in TOOL_REGISTRY:
            logger.warning(f"[Remediation] Unknown tool requested: {fn_name}")
            continue

        try:
            result = await TOOL_REGISTRY[fn_name](**fn_args)
            actions_taken.append({"tool": fn_name, "args": fn_args, "result": result, "status": "success"})
            logger.info(f"[Remediation] ✅ {fn_name}({fn_args}) → {result}")
        except Exception as e:
            actions_taken.append({"tool": fn_name, "args": fn_args, "error": str(e), "status": "failed"})
            logger.error(f"[Remediation] ❌ {fn_name} failed: {e}")

    return {
        **state,
        "gemini_usage": usage,
        "remediation_result": {
            "executed":      True,
            "actions_taken": actions_taken,
            "auto_executed": auto_ok,
        },
    }


# --- 7. Severity Assessment ---
SEVERITY_MATRIX = {
    "critical": ["Deployment Failure", "Security Scan Failure"],
    "high":     ["Build Failure", "Resource Exhaustion", "Permission Error"],
    "medium":   ["Test Failure", "Configuration Error", "Dependency Error"],
    "low":      ["Timeout", "Network Error"]
}

def get_severity(classification: str, branch: str) -> tuple[str, bool]:
    severity = "medium"
    for level, typelist in SEVERITY_MATRIX.items():
        if classification in typelist:
            severity = level
            break
    escalate = (severity == "critical" and branch == "main")
    return severity, escalate

@_traceable(name="severity_assessment_node", run_type="chain")
async def severity_assessment_node(state: PipelineState) -> PipelineState:
    branch = state.get("pipeline_metadata", {}).get("branch", "unknown")
    severity, escalate = get_severity(state.get("classification", ""), branch)
    return {**state, "severity": severity, "escalate": escalate}


# --- 8. Human Review ---
@_traceable(name="human_review_node", run_type="chain")
async def human_review_node(state: PipelineState) -> PipelineState:
    review_payload = {
        "classification": state.get("classification"),
        "confidence":     state.get("confidence_score"),
        "reasoning":      state.get("classification_reasoning"),
        "severity":       state.get("severity"),
        "root_cause":     state.get("root_cause"),
        "fix":            state.get("recommended_fix"),
        "threshold_used": state.get("threshold_used"),
    }
    human_input = interrupt(review_payload)

    if human_input and isinstance(human_input, dict):
        human_class    = human_input.get("classification", state.get("classification", ""))
        was_overridden = human_class != state.get("classification", "")

        # Record human override into calibration DB
        meta = state.get("pipeline_metadata", {})
        record_outcome(
            run_id         = meta.get("run_id", ""),
            repo           = meta.get("repo", ""),
            branch         = meta.get("branch", ""),
            error_type     = state.get("classification", ""),
            model_class    = state.get("classification", ""),
            human_class    = human_class,
            confidence     = state.get("confidence_score", 0.0),
            threshold_used = state.get("threshold_used", 0.70),
            was_overridden = was_overridden,
        )
        return {**state, **human_input}
    return state


# --- 9. Report Generation — with Tier 2 Episodic Storage ---
@_traceable(name="report_generation_node", run_type="llm")
async def report_generation_node(state: PipelineState) -> PipelineState:
    try:
        payload = {
            "run_id":         state.get("pipeline_metadata", {}).get("run_id", "unknown"),
            "timestamp":      state.get("pipeline_metadata", {}).get("timestamp", "unknown"),
            "classification": state.get("classification", "Unknown"),
            "confidence":     float(state.get("confidence_score", 0.0)),
            "severity":       state.get("severity", "medium"),
            "root_cause":     state.get("root_cause", ""),
            "recommended_fix":state.get("recommended_fix", ""),
            "similar_cases":  state.get("similar_past_errors", []),
            "escalated":      bool(state.get("escalate", False)),
            "human_reviewed": bool(state.get("needs_human_review", False)),
            "token_usage":    state.get("gemini_usage", {}),
        }

        # Attach incident metadata when this run is part of a correlation cluster
        if state.get("is_correlated"):
            payload["incident"] = {
                "incident_id":   state.get("incident_id"),
                "affected_repos": state.get("affected_repos", []),
                "is_leader":     bool(state.get("is_incident_leader", False)),
                "scope":         "infrastructure",
            }

        prompt = (
            f"Generate a final JSON report for the pipeline failure based on the following details:\n"
            f"{json.dumps(payload, indent=2)}\n"
            f"Ensure it includes a high-quality 'executive_summary' string outlining the failure and resolution."
        )

        response = await asyncio.to_thread(
            generate_content_with_retry,
            model=GEMINI_FLASH,
            contents=prompt,
            config=report_config
        )

        result = json.loads(response.text)
        usage = dict(state.get("gemini_usage", {}))
        if response.usage_metadata:
            usage["report_generation"] = response.usage_metadata.total_token_count
        result["token_usage"] = usage

        new_state = {**state, "final_report": result, "gemini_usage": usage}

        return new_state
    except Exception as e:
        logger.error(f"Report Generation Failed: {e}")
        return {**state, "error_message": str(e)}


# --- 10. Error Handler ---
@_traceable(name="error_handler_node", run_type="chain")
async def error_handler_node(state: PipelineState) -> PipelineState:
    # This node provides a graceful fallback payload if processing fails entirely 
    # and is routed to. 
    error_msg = state.get("error_message", "Unknown error in processing pipeline")
    logger.error(f"System Error Handler Triggered: {error_msg}")
    
    partial_report = {
        "run_id": state.get("pipeline_metadata", {}).get("run_id", "unknown"),
        "timestamp": state.get("pipeline_metadata", {}).get("timestamp", "unknown"),
        "classification": state.get("classification", "Unknown"),
        "confidence": float(state.get("confidence_score", 0.0)),
        "severity": state.get("severity", "high"),
        "root_cause": state.get("root_cause", ""),
        "recommended_fix": state.get("recommended_fix", ""),
        "similar_cases": state.get("similar_past_errors", []),
        "escalated": bool(state.get("escalate", False)),
        "human_reviewed": True,
        "token_usage": state.get("gemini_usage", {}),
        "executive_summary": f"Pipeline analysis failed: {error_msg}"
    }

    return {**state, "final_report": partial_report, "needs_human_review": True}

# --- NEW 11. Memory Load Node ---
@_traceable(name="memory_load_node", run_type="retriever")
async def memory_load_node(state: PipelineState) -> PipelineState:
    """
    Fetch relevant memories for this pipeline run from mem0.
    Populates state with historical context before any LLM nodes run.
    """
    meta = state.get("pipeline_metadata", {})
    
    # Build composite user_id for scoped memory retrieval
    user_id = f"{meta.get('repo', 'unknown')}:{meta.get('branch', 'unknown')}:{meta.get('team', 'default')}"
    
    # Build semantic search query from extracted errors
    errors = state.get("extracted_errors", [])
    error_summary = " | ".join([
        e["error_text"][:120] for e in errors[:3]
    ])
    search_query = (
        f"pipeline failure {meta.get('stage', '')} "
        f"{meta.get('language', '')} "
        f"{error_summary}"
    )
    
    # Search long-term memory (semantic + episodic)
    memory = await get_memory()
    search_results = await memory.search(
        query=search_query,
        user_id=user_id,
        limit=5,
        filters={
            "AND": [
                {"repo": {"eq": meta.get("repo", "")}},
            ]
        }
    )
    
    # Fetch entity context (repo/team knowledge graph facts)
    entity_results = await memory.search(
        query=f"repo {meta.get('repo', '')} known issues patterns team preferences",
        user_id=user_id,
        limit=3,
    )
    
    # Also fetch global memories (cross-repo patterns, not user-scoped)
    global_results = await memory.search(
        query=search_query,
        limit=3,
    )
    
    s_res = search_results.get("results", []) if isinstance(search_results, dict) else search_results
    e_res = entity_results.get("results", []) if isinstance(entity_results, dict) else entity_results
    g_res = global_results.get("results", []) if isinstance(global_results, dict) else global_results
    
    # Merge and deduplicate by memory id
    all_memories = {
        m["id"]: m
        for m in (s_res + e_res + g_res) if isinstance(m, dict) and "id" in m
    }.values()
    
    # Sort by relevance score descending
    loaded = sorted(all_memories, key=lambda x: x.get("score", 0), reverse=True)
    
    # Build entity context dict
    entity_context = {
        "repo_patterns":      [m["memory"] for m in e_res if isinstance(m, dict)],
        "team_preferences":   [],
        "known_flaky_tests":  [],
    }
    for m in loaded:
        cats = m.get("categories", [])
        if "team_preference" in cats:
            entity_context["team_preferences"].append(m["memory"])
        if "flaky_test" in cats:
            entity_context["known_flaky_tests"].append(m["memory"])
    
    return {
        **state,
        "memory_user_id":     user_id,
        "memory_run_id":      meta.get("run_id", str(uuid.uuid4())),
        "loaded_memories":    list(loaded),
        "entity_context":     entity_context,
        "memory_search_query": search_query,
    }


# --- NEW 12. Memory Save Node ---
@_traceable(name="memory_save_node", run_type="retriever")
async def memory_save_node(state: PipelineState) -> PipelineState:
    """
    Persist this run's outcome into mem0 long-term memory.
    Saves structured facts that will enrich future runs for the same repo/team.
    """
    meta = state.get("pipeline_metadata", {})
    user_id = state.get("memory_user_id", "unknown:unknown:default")
    
    # Build rich memory message for episodic storage
    memory_message = f"""
    Pipeline failure on {meta.get('repo', 'unknown')} ({meta.get('branch', 'unknown')} branch) 
    at stage '{meta.get('stage', 'unknown')}'.
    
    Error type: {state.get('classification', 'Unknown')} (confidence: {state.get('confidence_score', 0):.2f})
    Severity: {state.get('severity', 'medium')}
    Root cause: {state.get('root_cause', '')}
    Fix applied: {state.get('recommended_fix', '')[:500]}
    Escalated: {state.get('escalate', False)}
    Human reviewed: {state.get('needs_human_review', False)}
    Run ID: {state.get('memory_run_id', 'unknown')}
    """.strip()
    
    # Build metadata for filtering in future searches
    memory_metadata = {
        "repo":           meta.get("repo", "unknown"),
        "branch":         meta.get("branch", "unknown"),
        "stage":          meta.get("stage", "unknown"),
        "error_type":     state.get("classification", "Unknown"),
        "severity":       state.get("severity", "medium"),
        "run_id":         state.get("memory_run_id", "unknown"),
        "timestamp":      meta.get("timestamp", ""),
        "resolved":       not state.get("escalate", False),
        "confidence":     state.get("confidence_score", 0),
    }
    
    # Save episodic memory
    memory = await get_memory()
    await memory.add(
        messages=[{"role": "user", "content": memory_message}],
        user_id=user_id,
        metadata=memory_metadata,
        infer=True,          # let mem0 extract entities automatically
    )
    
    # Save team preference if human reviewer changed the classification
    if state.get("needs_human_review") and state.get("classification"):
        await memory.add(
            messages=[{
                "role": "user",
                "content": (
                    f"For repo {meta.get('repo', 'unknown')}, team prefers classifying "
                    f"'{state.get('classification_reasoning', '')[:200]}' as "
                    f"'{state.get('classification')}' error type."
                )
            }],
            user_id=user_id,
            metadata={
                **memory_metadata,
                "categories": ["team_preference"],
            },
            infer=True,
        )
    
    # Save flaky test pattern if Test Failure
    if state.get("classification") == "Test Failure":
        await memory.add(
            messages=[{
                "role": "user",
                "content": (
                    f"Known flaky test in {meta.get('repo', 'unknown')}: "
                    f"{state.get('root_cause', '')[:300]}"
                )
            }],
            user_id=user_id,
            metadata={**memory_metadata, "categories": ["flaky_test"]},
            infer=True,
        )
    
    if state.get("is_incident_leader") and state.get("incident_id"):
        await asyncio.to_thread(
            update_incident_analysis,
            state["incident_id"],
            state.get("root_cause", ""),
            state.get("recommended_fix", ""),
        )
        logger.info("[MemorySave] Incident %s updated with leader analysis.", state["incident_id"])

    return {**state, "memory_saved": True}
