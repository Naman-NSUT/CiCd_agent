import os
from google import genai
from google.genai import types

# Shared Gemini client — requires GEMINI_API_KEY in environment
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Model constants
GEMINI_PRO        = "gemini-2.5-pro"        # deep reasoning nodes
GEMINI_FLASH      = "gemini-2.0-flash"      # fast/cheap nodes
GEMINI_FLASH_LITE = "gemini-2.0-flash-lite" # rule-assist nodes

# For classification — deterministic, structured output
classification_config = types.GenerateContentConfig(
    temperature=0.1,
    top_p=0.9,
    max_output_tokens=512,
    response_mime_type="application/json",   # Force JSON output
    response_schema={                         # Schema-constrained output
        "type": "object",
        "properties": {
            "classification": {"type": "string", "enum": [
                "Build Failure", "Configuration Error", "Dependency Error",
                "Deployment Failure", "Network Error", "Permission Error",
                "Resource Exhaustion", "Security Scan Failure",
                "Test Failure", "Timeout"
            ]},
            "confidence_score": {"type": "number"},
            "reasoning":        {"type": "string"}
        },
        "required": ["classification", "confidence_score", "reasoning"]
    }
)

# For root cause & fix — creative, verbose
analysis_config = types.GenerateContentConfig(
    temperature=0.3,
    top_p=0.95,
    max_output_tokens=2048,
)

# For report generation — factual, concise
report_config = types.GenerateContentConfig(
    temperature=0.1,
    max_output_tokens=1024,
    response_mime_type="application/json",
    response_schema={
        "type": "object",
        "properties": {
            "run_id": {"type": "string"},
            "timestamp": {"type": "string"},
            "classification": {"type": "string"},
            "confidence": {"type": "number"},
            "severity": {"type": "string"},
            "root_cause": {"type": "string"},
            "recommended_fix": {"type": "string"},
            "similar_cases": {"type": "array", "items": {"type": "object"}},
            "escalated": {"type": "boolean"},
            "human_reviewed": {"type": "boolean"},
            "token_usage": {"type": "object"},
            "executive_summary": {"type": "string"}
        },
        "required": [
             "run_id", "timestamp", "classification", "confidence", "severity",
             "root_cause", "recommended_fix", "similar_cases", "escalated",
             "human_reviewed", "token_usage", "executive_summary"
        ]
    }
)
