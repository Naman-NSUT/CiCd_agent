"""
tool_schemas.py — Gemini FunctionDeclaration schemas for remediation tools.
"""

from google.genai import types
from ci_cd_analyzer.remediation_tools import (
    trigger_pipeline_rerun,
    bump_dependency_version,
    clear_cache,
    increase_job_timeout,
    notify_slack,
)

# Registry: maps Gemini function name → async callable
TOOL_REGISTRY: dict = {
    "trigger_pipeline_rerun": trigger_pipeline_rerun,
    "bump_dependency_version": bump_dependency_version,
    "clear_cache":             clear_cache,
    "increase_job_timeout":    increase_job_timeout,
    "notify_slack":            notify_slack,
}

# Gemini tool schema — passed as the `tools` arg in generate_content()
REMEDIATION_TOOLS = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="trigger_pipeline_rerun",
            description=(
                "Re-trigger the failed CI/CD pipeline run. "
                "Use for transient failures: network errors, flaky tests, resource exhaustion."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "repo":   types.Schema(type="STRING", description="Owner/repo e.g. acme/backend"),
                    "run_id": types.Schema(type="STRING", description="GitHub Actions run ID"),
                    "branch": types.Schema(type="STRING", description="Branch name"),
                },
                required=["repo", "run_id", "branch"],
            ),
        ),
        types.FunctionDeclaration(
            name="bump_dependency_version",
            description=(
                "Open a PR to pin or upgrade a specific package. "
                "Use for Dependency Error when root cause names an exact package and version."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "repo":    types.Schema(type="STRING"),
                    "branch":  types.Schema(type="STRING"),
                    "package": types.Schema(type="STRING", description="Package name e.g. grpc, numpy"),
                    "version": types.Schema(type="STRING", description="Target version e.g. 1.54.2"),
                },
                required=["repo", "branch", "package", "version"],
            ),
        ),
        types.FunctionDeclaration(
            name="clear_cache",
            description=(
                "Delete a CI cache entry. "
                "Use when root cause is stale cache or corrupted dependency cache."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "repo":      types.Schema(type="STRING"),
                    "cache_key": types.Schema(type="STRING", description="Cache key pattern to delete"),
                },
                required=["repo", "cache_key"],
            ),
        ),
        types.FunctionDeclaration(
            name="increase_job_timeout",
            description=(
                "Patch workflow YAML to raise a job timeout. "
                "Use ONLY for Timeout errors on non-main branches. Hard cap: 120 minutes."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "repo":             types.Schema(type="STRING"),
                    "job_name":         types.Schema(type="STRING", description="Exact job name from workflow"),
                    "new_timeout_mins": types.Schema(type="INTEGER", description="New timeout in minutes, max 120"),
                },
                required=["repo", "job_name", "new_timeout_mins"],
            ),
        ),
        types.FunctionDeclaration(
            name="notify_slack",
            description="Always call this after any remediation action to notify the team.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "channel":  types.Schema(type="STRING", description="Slack channel name without #"),
                    "message":  types.Schema(type="STRING", description="Human-readable summary of action taken"),
                    "severity": types.Schema(type="STRING", enum=["low", "medium", "high", "critical"]),
                },
                required=["channel", "message", "severity"],
            ),
        ),
    ])
]
