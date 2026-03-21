"""
cron_calibrate.py — Nightly calibration job for per-error-type thresholds.

Add to crontab:
    0 2 * * * cd /path/to/project && venv/bin/python -m ci_cd_analyzer.cron_calibrate

Or run manually:
    python -m ci_cd_analyzer.cron_calibrate
"""

import sys
import os

def main():
    from ci_cd_analyzer.calibration_db import recalibrate

    print("▶ Running threshold recalibration...")
    updated = recalibrate()

    if not updated:
        print("⚠️  No thresholds returned — DB may be empty or have insufficient data.")
        sys.exit(0)

    print("\nRecalibrated thresholds:")
    print(f"  {'Error Type':<30}  {'Threshold':>9}")
    print("  " + "-" * 42)
    for et, th in sorted(updated.items()):
        print(f"  {et:<30}  {th:>9.2f}")
    print(f"\n✅ Done — {len(updated)} types recalibrated.")


if __name__ == "__main__":
    main()
