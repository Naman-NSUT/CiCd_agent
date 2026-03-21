import json
from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.supervisor_node import supervisor_node
from agents.worker_node import worker_node

def build_graph():
    """
    Create a LangGraph with:
    Supervisor Node -> Worker Node -> END
    """
    graph_builder = StateGraph(AgentState)
    
    # Add nodes
    graph_builder.add_node("Supervisor", supervisor_node)
    graph_builder.add_node("Worker", worker_node)
    
    # Add edges
    graph_builder.set_entry_point("Supervisor")
    graph_builder.add_edge("Supervisor", "Worker")
    graph_builder.add_edge("Worker", END)
    
    return graph_builder.compile()

def analyze_failure(pipeline_log: str, tabular_features: dict) -> dict:
    graph = build_graph()
    
    # Initial state
    initial_state = AgentState(
        pipeline_log=pipeline_log,
        tabular_features=tabular_features
    )
    
    # Run graph
    final_state = graph.invoke(initial_state)
    
    # Access state attributes safely
    if isinstance(final_state, dict):
        state_dict = final_state
    else:
        state_dict = final_state.dict()
        
    return {
        "root_cause": state_dict.get("final_root_cause"),
        "xgb_prediction": state_dict.get("xgb_prediction"),
        "codebert_prediction": state_dict.get("codebert_prediction"),
        "confidence": float(state_dict.get("confidence", 0.0))
    }

if __name__ == "__main__":
    example_tabular = {
        "failure_stage": "build",
        "failure_type": "dependency_error",
        "error_code": "E102",
        "severity": "high",
        "cpu_usage_pct": 75,
        "memory_usage_mb": 2048,
        "retry_count": 1,
        "is_flaky_test": False,
        "rollback_triggered": False,
        "incident_created": False
    }

    print("\n--- CI/CD Agent Diagnosis ---")
    print("Type 'quit' or 'exit' to stop.")
    
    while True:
        try:
            print("\n" + "="*50)
            user_log = input("📝 What is your pipeline error log? (paste below and press Enter)\n> ")
            
            if user_log.lower().strip() in ['quit', 'exit']:
                print("Exiting agent...")
                break
                
            if not user_log.strip():
                print("Please enter a valid error log.")
                continue
                
            print("\n🤖 Analyzing with LangGraph Agent...\n")
            output = analyze_failure(user_log, example_tabular)
            
            print("✅ Agent Output:")
            print(json.dumps(output, indent=4))
            
        except (KeyboardInterrupt, EOFError):
            print("\nExiting agent...")
            break
