import logging
from langgraph.graph import StateGraph, END
from ci_repair_agent.state import RepairState
from ci_repair_agent.nodes.error_analyzer import error_analyzer
from ci_repair_agent.nodes.code_repair import code_repair
from ci_repair_agent.nodes.test_validator import test_validator
from ci_repair_agent.nodes.git_push import git_push

logger = logging.getLogger("[GRAPH]")

def human_review_halt(state: RepairState) -> dict:
    reason = state.get("human_review_reason", "Unknown reason")
    logger.warning(f"\n=========================================\n"
                   f"🚨 HUMAN REVIEW REQUIRED 🚨\n"
                   f"Reason: {reason}\n"
                   f"=========================================\n")
    return {"requires_human_review": True}

def should_repair(state: RepairState) -> str:
    if state.get("requires_human_review"):
        return "human_review_halt"
    return "code_repair"

def post_validation(state: RepairState) -> str:
    report = state.get("validation_report", {})
    if report.get("ready_to_push"):
        return "git_push"
    
    if state.get("requires_human_review") or state.get("retry_count", 0) >= state.get("max_retries", 3):
        return "human_review_halt"
        
    return "code_repair"

def build_graph():
    builder = StateGraph(RepairState)
    
    # 1. Add Nodes
    builder.add_node("error_analyzer", error_analyzer)
    builder.add_node("code_repair", code_repair)
    builder.add_node("test_validator", test_validator)
    builder.add_node("git_push", git_push)
    builder.add_node("human_review_halt", human_review_halt)
    
    # 2. Add Edges
    builder.set_entry_point("error_analyzer")
    
    builder.add_conditional_edges(
        "error_analyzer",
        should_repair,
        {
            "human_review_halt": "human_review_halt",
            "code_repair": "code_repair"
        }
    )
    
    builder.add_edge("code_repair", "test_validator")
    
    builder.add_conditional_edges(
        "test_validator",
        post_validation,
        {
            "code_repair": "code_repair",
            "git_push": "git_push",
            "human_review_halt": "human_review_halt"
        }
    )
    
    builder.add_edge("git_push", END)
    builder.add_edge("human_review_halt", END)
    
    return builder.compile()
