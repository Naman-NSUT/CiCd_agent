"""
threshold_manager.py — TTL-cached per-error-type confidence threshold loader.

Reads thresholds from the calibration DB every 5 minutes.
Falls back to DEFAULT_THRESHOLDS on any DB error.
"""

import time
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes

# Category-tuned starting thresholds (before any calibration data)
DEFAULT_THRESHOLDS: dict[str, float] = {
    "Build Failure":         0.70,
    "Configuration Error":   0.75,   # often confused with Dependency Error
    "Dependency Error":      0.75,
    "Deployment Failure":    0.70,
    "Network Error":         0.68,
    "Permission Error":      0.72,
    "Resource Exhaustion":   0.68,
    "Security Scan Failure": 0.80,   # high stakes — be conservative
    "Test Failure":          0.65,   # usually obvious
    "Timeout":               0.65,
}

_cache: dict = {"thresholds": {}, "loaded_at": 0.0}


def _refresh() -> None:
    try:
        from ci_cd_analyzer.calibration_db import get_thresholds
        db_thresholds = get_thresholds()
        if db_thresholds:
            _cache["thresholds"] = db_thresholds
            logger.debug("[ThresholdManager] Loaded %d thresholds from DB.", len(db_thresholds))
        else:
            _cache["thresholds"] = dict(DEFAULT_THRESHOLDS)
    except Exception as e:
        logger.warning("[ThresholdManager] DB unavailable (%s) — using defaults.", e)
        _cache["thresholds"] = dict(DEFAULT_THRESHOLDS)
    _cache["loaded_at"] = time.time()


def get_threshold(error_type: str) -> float:
    """Return the calibrated confidence threshold for the given error type."""
    if time.time() - _cache["loaded_at"] > CACHE_TTL:
        _refresh()
    return _cache["thresholds"].get(error_type, DEFAULT_THRESHOLDS.get(error_type, 0.70))


def invalidate_threshold_cache() -> None:
    """Force a reload on the next get_threshold() call (e.g. after recalibrate())."""
    _cache["loaded_at"] = 0.0
