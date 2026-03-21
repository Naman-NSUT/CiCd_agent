"""
eval_runner.py — CI regression gate for the CI/CD classifier.

Usage:
    python -m ci_cd_analyzer.eval_runner           # run suite, exit 1 on fail
    python -m ci_cd_analyzer.eval_runner --create  # create dataset then run
"""

import argparse
import sys
import os


def run_regression_suite(accuracy_threshold: float = 0.90):
    """
    Run the CI/CD classifier against the golden evaluation dataset.
    Raises AssertionError if classification accuracy falls below threshold.
    """
    from langsmith.evaluation import evaluate
    from ci_cd_analyzer.evaluators import ALL_EVALUATORS
    from ci_cd_analyzer.graph import graph

    def _invoke(inp: dict) -> dict:
        """Synchronous wrapper for graph.invoke() for use in evaluate()."""
        import asyncio
        state = {
            "raw_log":           inp.get("raw_log", ""),
            "pipeline_metadata": inp.get("pipeline_metadata", {}),
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # In Jupyter / async context — use thread executor
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, graph.ainvoke(state))
                    return future.result(timeout=60)
            return loop.run_until_complete(graph.ainvoke(state))
        except Exception as e:
            return {"error": str(e), "classification": "", "severity": "", "confidence_score": 0.0}

    print("▶ Running CI/CD classifier regression suite...")
    results = evaluate(
        _invoke,
        data            = "cicd_classifier_golden_set",
        evaluators      = ALL_EVALUATORS,
        experiment_prefix = "cicd-regression",
        max_concurrency = 2,   # keep low to avoid rate limits
    )

    # ── Check accuracy gate ────────────────────────────────────────────
    raw = results._results if hasattr(results, "_results") else []
    if not raw:
        print("⚠️  No results returned — check dataset and API keys.")
        return results

    total = len(raw)
    correct = sum(
        1 for r in raw
        if r.get("evaluation_results", {}).get("classification_exact_match", 0) == 1
    )
    accuracy = correct / total if total > 0 else 0.0

    print(f"\n{'='*50}")
    print(f"  Classification accuracy: {accuracy:.1%}  ({correct}/{total})")
    print(f"  Threshold:               {accuracy_threshold:.1%}")
    print(f"{'='*50}\n")

    if accuracy < accuracy_threshold:
        raise AssertionError(
            f"Regression gate FAILED: classification accuracy {accuracy:.1%} "
            f"is below the {accuracy_threshold:.1%} threshold."
        )

    print(f"✅ Regression suite PASSED ({accuracy:.1%} accuracy)")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CI/CD Classifier Regression Suite")
    parser.add_argument("--create", action="store_true",
                        help="Create/recreate the LangSmith golden dataset before running evals")
    parser.add_argument("--threshold", type=float, default=0.90,
                        help="Minimum classification accuracy (default: 0.90)")
    args = parser.parse_args()

    api_key = os.environ.get("LANGCHAIN_API_KEY")
    if not api_key:
        print("ERROR: LANGCHAIN_API_KEY not set. Add it to .env and try again.")
        sys.exit(1)

    if args.create:
        from ci_cd_analyzer.eval_dataset import create_langsmith_dataset
        create_langsmith_dataset()

    try:
        run_regression_suite(accuracy_threshold=args.threshold)
    except AssertionError as e:
        print(f"❌ {e}")
        sys.exit(1)
