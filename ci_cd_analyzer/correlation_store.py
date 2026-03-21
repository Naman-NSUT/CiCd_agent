"""
correlation_store.py — SQLite event stream for cross-repo failure correlation.

Detects when 3+ pipeline failures with the same error type occur within a
5-minute window across ≥2 different repos, flagging them as an infrastructure
incident rather than individual code issues.
"""

import json
import os
import sqlite3
import time
import uuid
import logging

logger = logging.getLogger(__name__)

STORE_PATH = os.environ.get("CORRELATION_DB", "./data/correlation.db")
WINDOW_SECS = int(os.environ.get("CORRELATION_WINDOW_SECS", 300))   # 5 min
THRESHOLD   = int(os.environ.get("CORRELATION_THRESHOLD", 3))        # 3+ runs


def _conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(STORE_PATH) if os.path.dirname(STORE_PATH) else ".", exist_ok=True)
    conn = sqlite3.connect(STORE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_store() -> None:
    """Create tables and index. Safe to call repeatedly."""
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pipeline_events (
                id          TEXT PRIMARY KEY,
                run_id      TEXT NOT NULL,
                repo        TEXT NOT NULL,
                branch      TEXT,
                error_type  TEXT NOT NULL,
                confidence  REAL,
                incident_id TEXT,
                created_at  REAL DEFAULT (unixepoch('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id              TEXT PRIMARY KEY,
                error_type      TEXT NOT NULL,
                first_run_id    TEXT NOT NULL,
                member_run_ids  TEXT,
                root_cause      TEXT,
                recommended_fix TEXT,
                status          TEXT DEFAULT 'open',
                created_at      REAL DEFAULT (unixepoch('now'))
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_time
            ON pipeline_events(error_type, created_at)
        """)
        conn.commit()


def record_event(
    run_id: str,
    repo: str,
    branch: str,
    error_type: str,
    confidence: float,
) -> str:
    """Insert a lightweight event record. Returns the new event id."""
    event_id = str(uuid.uuid4())
    try:
        with _conn() as conn:
            conn.execute(
                """
                INSERT INTO pipeline_events
                    (id, run_id, repo, branch, error_type, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (event_id, run_id, repo, branch, error_type, confidence),
            )
            conn.commit()
    except Exception as e:
        logger.warning("[CorrelationStore] record_event failed: %s", e)
    return event_id


def find_correlation(error_type: str, exclude_run_id: str) -> dict | None:
    """
    Check if enough similar failures occurred in the correlation window.

    Requires:
    - At least THRESHOLD-1 other events with the same error_type in window
    - Those events must come from at least 2 distinct repos (infra signal)

    Returns incident dict if correlated, None otherwise.
    """
    cutoff = time.time() - WINDOW_SECS
    try:
        with _conn() as conn:
            rows = conn.execute(
                """
                SELECT run_id, repo, incident_id
                FROM pipeline_events
                WHERE error_type = ?
                  AND created_at >= ?
                  AND run_id != ?
                ORDER BY created_at ASC
                """,
                (error_type, cutoff, exclude_run_id),
            ).fetchall()

            if len(rows) < THRESHOLD - 1:
                return None

            distinct_repos = {r["repo"] for r in rows}
            if len(distinct_repos) < 2:
                # Same repo repeated — not an infra event
                return None

            # Check if an incident already exists for this cluster
            existing_incident_id = next(
                (r["incident_id"] for r in rows if r["incident_id"]), None
            )

            if existing_incident_id:
                inc = conn.execute(
                    "SELECT * FROM incidents WHERE id = ?",
                    (existing_incident_id,),
                ).fetchone()
                return {
                    "incident_id":    existing_incident_id,
                    "is_new":         False,
                    "error_type":     error_type,
                    "member_count":   len(rows) + 1,
                    "affected_repos": list(distinct_repos),
                    "root_cause":     inc["root_cause"] if inc else None,
                    "fix":            inc["recommended_fix"] if inc else None,
                }

            # New cluster — this run is the leader
            incident_id = f"INC-{error_type[:4].upper()}-{int(time.time())}"
            member_ids  = [r["run_id"] for r in rows]

            conn.execute(
                """
                INSERT INTO incidents
                    (id, error_type, first_run_id, member_run_ids)
                VALUES (?, ?, ?, ?)
                """,
                (incident_id, error_type, exclude_run_id, json.dumps(member_ids)),
            )
            if member_ids:
                placeholders = ",".join("?" * len(member_ids))
                conn.execute(
                    f"UPDATE pipeline_events SET incident_id=? WHERE run_id IN ({placeholders})",
                    [incident_id] + member_ids,
                )
            conn.commit()

            return {
                "incident_id":    incident_id,
                "is_new":         True,
                "error_type":     error_type,
                "member_count":   len(rows) + 1,
                "affected_repos": list(distinct_repos),
                "root_cause":     None,
                "fix":            None,
            }
    except Exception as e:
        logger.warning("[CorrelationStore] find_correlation failed: %s", e)
        return None


def update_incident_analysis(
    incident_id: str, root_cause: str, fix: str
) -> None:
    """Write the leader's root_cause and fix back to the incident row."""
    try:
        with _conn() as conn:
            conn.execute(
                "UPDATE incidents SET root_cause=?, recommended_fix=? WHERE id=?",
                (root_cause, fix, incident_id),
            )
            conn.commit()
        logger.info("[CorrelationStore] Incident %s updated with analysis.", incident_id)
    except Exception as e:
        logger.warning("[CorrelationStore] update_incident_analysis failed: %s", e)
