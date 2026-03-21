from agents.state import AgentState

def supervisor_node(state: AgentState) -> dict:
    """
    Supervisor node only orchestrates the task and sends the log to the worker node.
    It receives the raw input, stores it in the graph state, and forwards it to the worker.
    """
    # Simply passing along the state (it is already populated with the input).
    # LangGraph requires returning a dict of updates for a state graph.
    return {
        "pipeline_log": state.pipeline_log,
        "tabular_features": state.tabular_features
    }
