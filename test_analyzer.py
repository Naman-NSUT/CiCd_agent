import asyncio
import json
import os
from dotenv import load_dotenv

# Load env in case KEY is in .env
load_dotenv()

from ci_cd_analyzer.graph import graph
from ci_cd_analyzer.state import PipelineState

async def main():
    sample_log = """
Starting build...
npm install
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package - Not found
npm ERR! 404 
npm ERR! 404  'nonexistent-package@*' is not in the npm registry.
Failed to build project.
exit code 1
"""
    initial_state = {
        "raw_log": sample_log,
        "pipeline_metadata": {
            "stage": "build",
            "repo": "my-app",
            "branch": "main",
            "run_id": "12345",
            "timestamp": "2023-10-27T10:00:00Z"
        }
    }
    
    config = {"configurable": {"thread_id": "test_thread_1"}}
    
    print("Starting pipeline analysis...")
    print("--------------------------------------------------")
    
    # Run the graph until it pauses for human review or finishes
    async for event in graph.astream(initial_state, config):
        for node, state in event.items():
            print(f"--- Completed Node: {node} ---")
            if node == "classification":
                print(f" > Classification: {state.get('classification')} (Confidence: {state.get('confidence_score')})")
            if node == "severity_assessment":
                print(f" > Severity: {state.get('severity')} (Escalate: {state.get('escalate')})")
            
    print("\n--- Current State After Run ---")
    current_state = graph.get_state(config)
    
    if current_state.next:
        print(f"Graph paused at node for interrupt: {current_state.next}")
        
        # It paused for human review. Let's provide human input and resume.
        print("\nProviding human review input to resume (simulating review)...")
        # In a real app we would pass human overrides here.
        from langgraph.types import Command
        
        async for event in graph.astream(Command(resume={"needs_human_review": False, "escalate": False}), config):
            for node, state in event.items():
                print(f"--- Completed Node (Post-review): {node} ---")
                
        final_state = graph.get_state(config).values
    else:
        final_state = current_state.values
        
    print("\n==================================================")
    print("--- Final Report ---")
    if "final_report" in final_state:
        print(json.dumps(final_state["final_report"], indent=2))
    else:
        print("No final report generated.")

    print("\n--- Token Usage ---")
    print(json.dumps(final_state.get("gemini_usage", {}), indent=2))

if __name__ == "__main__":
    if "GEMINI_API_KEY" not in os.environ:
        print("WARNING: GEMINI_API_KEY not found in environment!")
    asyncio.run(main())
