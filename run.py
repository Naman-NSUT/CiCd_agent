#!/usr/bin/env python3
"""
run.py — Top-level CLI entry-point for the CI/CD error analyzer.

Usage:
    # Interactive — paste a log and get a report
    python run.py

    # One-shot from a file
    python run.py --log-file /var/log/ci/build.log --repo acme/api --branch main
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
    from ci_cd_analyzer.graph import graph
    return await graph.ainvoke({"raw_log": raw_log, "pipeline_metadata": metadata})


def main():
    parser = argparse.ArgumentParser(description="CI/CD Pipeline Error Analyzer")
    parser.add_argument("--log-file", help="Path to raw pipeline log file")
    parser.add_argument("--repo",   default="unknown/repo",  help="owner/repo")
    parser.add_argument("--branch", default="unknown",        help="Branch name")
    parser.add_argument("--stage",  default="",               help="Pipeline stage")
    parser.add_argument("--team",   default="",               help="Owning team")
    parser.add_argument("--run-id", default="",               help="CI run ID")
    args = parser.parse_args()



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
