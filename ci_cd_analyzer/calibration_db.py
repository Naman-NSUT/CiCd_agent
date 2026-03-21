"""
calibration_db.py — SQLite-backed calibration store for per-error-type
confidence thresholds, driven by human override rates.

DB_PATH defaults to ./data/calibration.db but can be overridden via
the CALIBRATION_DB environment variable.
"""

import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.environ.get("CALIBRATION_DB", "./data/calibration.db")

ERROR_TYPES = [
    "Build Failure", "Configuration Error", "Dependency Error",
    "Deployment Failure", "Network Error", "Permission Error",
    "Resource Exhaustion", "Security Scan Failure", "Test Failure", "Timeout",
]

# Category-tuned seed thresholds — must stay in sync with threshold_manager.DEFAULT_THRESHOLDS
SEED_THRESHOLDS: dict[str, float] = {
    "Build Failure":         0.70,
    "Configuration Error":   0.75,
    "Dependency Error":      0.75,
    "Deployment Failure":    0.70,
    "Network Error":         0.68,
    "Permission Error":      0.72,
    "Resource Exhaustion":   0.68,
    "Security Scan Failure": 0.80,
    "Test Failure":          0.65,
    "Timeout":               0.65,
}


def _conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    """Create tables and seed the thresholds table. Safe to call repeatedly."""
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS classification_outcomes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id          TEXT NOT NULL,
                repo            TEXT,
                branch          TEXT,
                error_type      TEXT NOT NULL,
                model_class     TEXT NOT NULL,
                human_class     TEXT,
                confidence      REAL NOT NULL,
                was_overridden  INTEGER,
                threshold_used  REAL NOT NULL,
                created_at      TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS thresholds (
                error_type    TEXT PRIMARY KEY,
                threshold     REAL NOT NULL DEFAULT 0.70,
                override_rate REAL,
                sample_count  INTEGER DEFAULT 0,
                last_updated  TEXT
            )
        """)
        for et, seed_th in SEED_THRESHOLDS.items():
            conn.execute(
                "INSERT OR IGNORE INTO thresholds (error_type, threshold) VALUES (?, ?)",
                (et, seed_th),
            )
        conn.commit()


def record_outcome(
    run_id: str,
    repo: str,
    branch: str,
    error_type: str,
    model_class: str,
    confidence: float,
    threshold_used: float,
    human_class: str | None = None,
    was_overridden: bool | None = None,
) -> None:
    """
    Insert one calibration row.
    Called twice per reviewed run:
      1. After classification  — human_class=None, was_overridden=None
      2. After human review    — human_class filled, was_overridden set
    """
    try:
        with _conn() as conn:
            conn.execute(
                """
                INSERT INTO classification_outcomes
                    (run_id, repo, branch, error_type, model_class,
                     human_class, confidence, was_overridden, threshold_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id, repo, branch, error_type, model_class,
                    human_class, confidence,
                    int(was_overridden) if was_overridden is not None else None,
                    threshold_used,
                ),
            )
            conn.commit()
    except Exception as e:
        # Never crash the pipeline for a logging failure
        import logging
        logging.getLogger(__name__).warning("[CalibrationDB] record_outcome failed: %s", e)


def get_thresholds() -> dict[str, float]:
    """Return all stored per-type thresholds."""
    try:
        init_db()  # ensure tables exist on first call
        with _conn() as conn:
            rows = conn.execute(
                "SELECT error_type, threshold FROM thresholds"
            ).fetchall()
        return {row[0]: row[1] for row in rows}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("[CalibrationDB] get_thresholds failed: %s", e)
        return {}


def recalibrate() -> dict[str, float]:
    """
    Recompute per-error-type thresholds from observed override rates.
    Rules:
      override_rate > 0.30                → +0.05 (cap 0.92)  — model unreliable
      override_rate < 0.10 AND total>=30  → -0.03 (floor 0.55) — model trustworthy
      otherwise                           → no change
    Requires ≥10 samples per type to act.
    """
    with _conn() as conn:
        rows = conn.execute("""
            SELECT error_type,
                   COUNT(*)         AS total,
                   SUM(was_overridden) AS overrides
            FROM classification_outcomes
            WHERE was_overridden IS NOT NULL
            GROUP BY error_type
            HAVING total >= 10
        """).fetchall()

        for error_type, total, overrides in rows:
            override_rate = (overrides or 0) / total
            current = conn.execute(
                "SELECT threshold FROM thresholds WHERE error_type = ?",
                (error_type,),
            ).fetchone()
            if not current:
                continue
            current_th = current[0]

            if override_rate > 0.30:
                new_th = min(current_th + 0.05, 0.92)
            elif override_rate < 0.10 and total >= 30:
                new_th = max(current_th - 0.03, 0.55)
            else:
                new_th = current_th

            conn.execute(
                """
                UPDATE thresholds
                SET threshold=?, override_rate=?, sample_count=?, last_updated=?
                WHERE error_type=?
                """,
                (
                    new_th,
                    round(override_rate, 4),
                    total,
                    datetime.now(timezone.utc).isoformat(),
                    error_type,
                ),
            )

        conn.commit()

    return get_thresholds()
