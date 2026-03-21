#!/usr/bin/env python3
"""
run.py — Top-level CLI entry-point for the CI/CD error analyzer.

Usage:
    # Interactive — paste a log and get a report
    python run.py

    # One-shot from a file
    python run.py --log-file /var/log/ci/build.log --repo acme/api --branch main

    # Run LangSmith regression suite
    python run.py --eval
"""

import argparse
import asyncio
import json
import os
import sys
import uuid
from dotenv import load_dotenv

load_dotenv()


def _build_metadata(args) -> dict:
    return {
        "repo":   args.repo,
        "branch": args.branch,
        "stage":  args.stage,
        "run_id": args.run_id or str(uuid.uuid4()),
        "team":   args.team or "",
    }


async def _analyze(raw_log: str, metadata: dict) -> dict:
    from ci_cd_analyzer.observability import run_graph
    return await run_graph(raw_log, metadata)


def main():
    parser = argparse.ArgumentParser(description="CI/CD Pipeline Error Analyzer")
    parser.add_argument("--log-file", help="Path to raw pipeline log file")
    parser.add_argument("--repo",   default="unknown/repo",  help="owner/repo")
    parser.add_argument("--branch", default="unknown",        help="Branch name")
    parser.add_argument("--stage",  default="",               help="Pipeline stage")
    parser.add_argument("--team",   default="",               help="Owning team")
    parser.add_argument("--run-id", default="",               help="CI run ID")
    parser.add_argument("--eval",   action="store_true",      help="Run regression suite instead")
    parser.add_argument("--create-dataset", action="store_true",
                        help="Create LangSmith golden dataset and exit")
    args = parser.parse_args()

    # ── Dataset creation mode ──────────────────────────────────────────
    if args.create_dataset:
        from ci_cd_analyzer.eval_dataset import create_langsmith_dataset
        create_langsmith_dataset()
        sys.exit(0)

    # ── Regression eval mode ───────────────────────────────────────────
    if args.eval:
        from ci_cd_analyzer.eval_runner import run_regression_suite
        try:
            run_regression_suite()
        except AssertionError as e:
            print(f"❌ {e}")
            sys.exit(1)
        sys.exit(0)

    # ── Analysis mode ──────────────────────────────────────────────────
    if args.log_file:
        with open(args.log_file, "r", encoding="utf-8", errors="replace") as f:
            raw_log = f.read()
    else:
        print("📝 Paste your pipeline log (Ctrl-D to finish):\n")
        raw_log = sys.stdin.read()

    if not raw_log.strip():
        print("Error: Empty log. Provide via --log-file or stdin.")
        sys.exit(1)

    metadata = _build_metadata(args)
    print(f"\n🤖 Analyzing log for {metadata['repo']} @ {metadata['branch']} ...\n")

    result = asyncio.run(_analyze(raw_log, metadata))

    print("\n" + "=" * 60)
    print("✅  Analysis Complete")
    print("=" * 60)
    report = result.get("final_report") or {
        "classification":  result.get("classification"),
        "severity":        result.get("severity"),
        "confidence":      result.get("confidence_score"),
        "root_cause":      result.get("root_cause"),
        "recommended_fix": result.get("recommended_fix"),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
