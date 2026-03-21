import sys
import json
import logging
import os
from ci_repair_agent.graph import build_graph
from ci_repair_agent.config import config
from ci_repair_agent.tools.file_tools import read_file
from ci_repair_agent.state import RepairState

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("[MAIN]")

def main():
    logger.info("Starting CI/CD Repair Agent Engine...")
    
    payload_raw = ""
    # Check if a file was passed as argument
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            payload_raw = f.read()
    else:
        # Read from stdin
        if not sys.stdin.isatty():
            payload_raw = sys.stdin.read()
            
    if not payload_raw:
        logger.error("No input payload provided. Pass a JSON file or pipe payload directly to stdin.")
        sys.exit(1)
        
    try:
        payload = json.loads(payload_raw)
    except Exception as e:
        logger.error(f"Failed to parse input JSON payload: {e}")
        sys.exit(1)
        
    ci_logs = payload.get("ci_logs", "")
    test_report = payload.get("test_report", "")
    file_tree = payload.get("file_tree", [])
    trigger_branch = payload.get("trigger_branch", "main")
    
    source_files = {}
    test_files = {}
    
    repo_path = config.REPO_PATH
    
    for fpath in file_tree:
        full_path = os.path.join(repo_path, fpath)
        try:
            content = read_file(full_path)
            # Simple heuristic for tests
            if "test" in fpath.lower() or fpath.lower().endswith("_test.py") or str(full_path).startswith("tests/"):
                test_files[fpath] = content
            else:
                source_files[fpath] = content
        except Exception:
            pass # Ignore files we couldn't read
            
    initial_state = RepairState(
        ci_logs=ci_logs,
        test_report=test_report,
        file_tree=file_tree,
        trigger_branch=trigger_branch,
        source_files=source_files,
        test_files=test_files,
        error_report=None,
        repair_report=None,
        validation_report=None,
        git_report=None,
        requires_human_review=False,
        human_review_reason=None,
        retry_count=0,
        max_retries=config.MAX_RETRIES
    )
    
    graph = build_graph()
    
    logger.info("Invoking graph...")
    final_state = graph.invoke(initial_state)
    
    logger.info("=== FINAL STATE SUMMARY ===")
    if final_state.get("requires_human_review"):
        logger.warning(f"Result: HALTED for human review. Reason: {final_state.get('human_review_reason')}")
    else:
        logger.info("Result: SUCCESS. Automation fully pushed.")
        
    if final_state.get('repair_report'):
        logger.info(f"Total fixes found/applied: {len(final_state['repair_report'].get('patches', []))}")
        
    if final_state.get('validation_report'):
        logger.info(f"Validation tests resolved: {final_state['validation_report'].get('tests_resolved', [])}")
        
if __name__ == "__main__":
    main()
