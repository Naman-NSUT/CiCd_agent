from typing import TypedDict, Optional, List, Dict, Any

class RepairState(TypedDict):
    ci_logs: str
    test_report: str
    file_tree: List[str]
    trigger_branch: str
    source_files: Dict[str, str]
    test_files: Dict[str, str]
    
    error_report: Optional[Dict[str, Any]]
    repair_report: Optional[Dict[str, Any]]
    validation_report: Optional[Dict[str, Any]]
    git_report: Optional[Dict[str, Any]]
    
    requires_human_review: bool
    human_review_reason: Optional[str]
    
    retry_count: int
    max_retries: int
