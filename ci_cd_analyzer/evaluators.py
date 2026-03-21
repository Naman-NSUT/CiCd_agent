"""
evaluators.py — LangSmith evaluator functions for CI/CD classifier regression testing.

Each evaluator receives (run, example) and returns {"key": str, "score": 0|1}.
"""


def classification_correct(run, example) -> dict:
    """Exact match on the predicted error classification."""
    predicted = (run.outputs or {}).get("classification", "")
    expected  = (example.outputs or {}).get("classification", "")
    return {
        "key":     "classification_exact_match",
        "score":   int(predicted == expected),
        "comment": f"predicted={predicted!r}, expected={expected!r}",
    }


def confidence_adequate(run, example) -> dict:
    """Check that confidence_score meets or exceeds the per-example threshold."""
    score     = (run.outputs or {}).get("confidence_score", 0.0)
    threshold = (example.outputs or {}).get("confidence_gte", 0.80)
    return {
        "key":     "confidence_above_threshold",
        "score":   int(float(score) >= float(threshold)),
        "comment": f"score={score:.2f}, threshold={threshold:.2f}",
    }


def severity_correct(run, example) -> dict:
    """Exact match on severity label (critical/high/medium/low)."""
    predicted = (run.outputs or {}).get("severity", "")
    expected  = (example.outputs or {}).get("severity", "")
    return {
        "key":     "severity_match",
        "score":   int(predicted == expected),
        "comment": f"predicted={predicted!r}, expected={expected!r}",
    }


def latency_ok(run, example) -> dict:
    """Check that the run completed within 10 seconds."""
    try:
        latency_ms = (run.end_time - run.start_time).total_seconds() * 1000
        passed     = latency_ms < 10_000
    except Exception:
        latency_ms = -1
        passed     = False
    return {
        "key":     "latency_under_10s",
        "score":   int(passed),
        "comment": f"latency={latency_ms:.0f}ms",
    }


# Convenience list — pass this directly to evaluate()
ALL_EVALUATORS = [
    classification_correct,
    confidence_adequate,
    severity_correct,
    latency_ok,
]
