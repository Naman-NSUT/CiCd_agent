from typing import TypedDict, Optional, List

class PipelineState(TypedDict):
    raw_log:              str
    pipeline_metadata:    dict          # stage, repo, branch, run_id, timestamp
    cleaned_log:          str
    extracted_errors:     list[dict]    # parsed error blocks with line numbers
    raw_line_count:        int           # total raw lines before Drain3
    compressed_line_count: int           # unique templates after Drain3
    compression_ratio:     float         # percentage reduction
    classification:       str           # one of the 10 error types
    confidence_score:     float         # 0.0 - 1.0
    classification_reasoning: str       # Gemini's chain-of-thought
    needs_human_review:   bool
    root_cause:           str
    similar_past_errors:  list[dict]
    recommended_fix:      str
    severity:             str           # critical / high / medium / low
    escalate:             bool
    final_report:         dict
    gemini_usage:         dict          # token usage tracking across nodes
    memory_context:       List[str]     # Tier 4 entity facts injected into prompts
    error_message:        Optional[str]
    
    # Memory fields (NEW)
    memory_user_id:     str        # composite key: f"{repo}:{branch}:{team}"
    memory_run_id:      str        # uuid for this specific run
    loaded_memories:    list[dict] # memories fetched at run start
    entity_context:     dict       # repo/team entity facts from mem0
    memory_saved:       bool       # flag: did save succeed?
    memory_search_query: str       # constructed search query for retrieval
    remediation_result: dict       # auto-remediation outcome: executed, actions_taken, auto_executed
    retrieval_routes_used: list[str]  # which of Dense/BM25/Filter returned results
    retrieval_rrf_scores:  list[float] # RRF scores of top results
    all_drain_clusters:    list[dict]  # structured Drain3 clusters for TaskAwareCompressor
    task_compressed_log:   str         # relevance-filtered log for LLM nodes
    compression_stats:     dict        # selected/dropped cluster counts, est_tokens
    threshold_used:        float       # per-error-type threshold applied in this run
    # Correlation fields
    is_correlated:          bool        # part of a multi-repo incident cluster?
    incident_id:            Optional[str] # e.g. "INC-NETW-1742301234"
    affected_repos:         list[str]   # all repos in this incident
    skip_llm_analysis:      bool        # follower runs skip RCA/fix nodes
    is_incident_leader:     bool        # first run to detect this correlation
