from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from ci_cd_analyzer.state import PipelineState
from ci_cd_analyzer.nodes import (
    log_ingestion_node,
    error_extraction_node,
    classification_node,
    correlation_node,
    retrieval_node,
    root_cause_analysis_node,
    fix_recommendation_node,
    severity_assessment_node,
    human_review_node,
    report_generation_node,
    error_handler_node,
    memory_load_node,
    memory_save_node,
    remediation_executor_node,
)


# ── Routing functions ─────────────────────────────────────────────────────────

def route_after_correlation(state: PipelineState) -> str:
    """
    Route after correlation_node:
    - Followers (skip_llm_analysis=True) jump straight to memory_save
    - Runs needing human review go to human_review first
    - All others proceed through the normal retrieval → RCA → fix path
    """
    if state.get("skip_llm_analysis"):
        return "memory_save"
    if state.get("needs_human_review"):
        return "human_review"
    return "retrieval"


def route_after_severity(state: PipelineState) -> str:
    if state.get("escalate"):
        return "human_review"
    return "report_generation"


# ── Graph builder ─────────────────────────────────────────────────────────────
builder = StateGraph(PipelineState)

# Register nodes
builder.add_node("log_ingestion",       log_ingestion_node)
builder.add_node("error_extraction",    error_extraction_node)
builder.add_node("classification",      classification_node)
builder.add_node("correlation",         correlation_node)        # NEW
builder.add_node("retrieval",           retrieval_node)
builder.add_node("root_cause_analysis", root_cause_analysis_node)
builder.add_node("fix_recommendation",  fix_recommendation_node)
builder.add_node("severity_assessment", severity_assessment_node)
builder.add_node("human_review",        human_review_node)
builder.add_node("report_generation",   report_generation_node)
builder.add_node("error_handler",       error_handler_node)
builder.add_node("memory_load",         memory_load_node)
builder.add_node("memory_save",         memory_save_node)
builder.add_node("remediation_executor", remediation_executor_node)

# ── Linear entry path ─────────────────────────────────────────────────────────
builder.add_edge(START,              "log_ingestion")
builder.add_edge("log_ingestion",    "error_extraction")
builder.add_edge("error_extraction", "memory_load")
builder.add_edge("memory_load",      "classification")
builder.add_edge("classification",   "correlation")              # NEW direct edge

# ── Conditional: after correlation (replaces route_after_classification) ──────
builder.add_conditional_edges(
    "correlation",
    route_after_correlation,
    {
        "human_review": "human_review",
        "retrieval":    "retrieval",
        "memory_save":  "memory_save",   # correlated follower fast-path
    },
)

# ── Normal analysis path ──────────────────────────────────────────────────────
builder.add_edge("retrieval",            "root_cause_analysis")
builder.add_edge("root_cause_analysis",  "fix_recommendation")
builder.add_edge("fix_recommendation",   "remediation_executor")
builder.add_edge("remediation_executor", "severity_assessment")
builder.add_edge("severity_assessment",  "memory_save")

# ── Save → report (with escalation gate) ─────────────────────────────────────
builder.add_conditional_edges(
    "memory_save",
    route_after_severity,
    {
        "human_review":     "human_review",
        "report_generation": "report_generation",
    },
)

# Human review always leads to report
builder.add_edge("human_review",     "report_generation")
builder.add_edge("report_generation", END)

# ── Compile ───────────────────────────────────────────────────────────────────
checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)
