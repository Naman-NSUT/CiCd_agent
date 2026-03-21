"""
log_preprocessor.py — Drain3-based log template mining for CI/CD logs.

Reduces 100k-line raw logs to ~200 ranked event templates before any
Gemini API call, cutting token costs 80%+ while preserving error signal.
"""

import os
import re
import logging
from pathlib import Path
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig

logger = logging.getLogger(__name__)

# Error keywords for ranking templates by diagnostic importance
ERROR_KEYWORDS = [
    "error", "fatal", "failed", "failure", "exception", "traceback",
    "exit code", "killed", "oom", "timeout", "timed out", "refused",
    "denied", "unauthorized", "not found", "unreachable", "cannot find",
    "segfault", "core dumped", "assertion", "no such", "permission",
    "http 4", "http 5", "403", "404", "500", "502", "503", "504",
]

# Locate drain3.ini — look in project root relative to this file
_INI_PATH = str(Path(__file__).resolve().parent.parent / "drain3.ini")


def _build_miner() -> TemplateMiner:
    """Build a fresh TemplateMiner, falling back gracefully if .ini missing."""
    config = TemplateMinerConfig()
    if os.path.exists(_INI_PATH):
        config.load(_INI_PATH)
    else:
        logger.warning(
            f"drain3.ini not found at {_INI_PATH}; using default Drain3 config."
        )
        # Sensible defaults
        config.drain_sim_th        = 0.4
        config.drain_depth         = 4
        config.drain_max_children  = 100
        config.drain_max_clusters  = 1024
    config.profiling_enabled = False
    return TemplateMiner(config=config)


def _error_score(template: str) -> int:
    """Count how many error-signal keywords appear in a template."""
    t_lower = template.lower()
    return sum(kw in t_lower for kw in ERROR_KEYWORDS)


class DrainPreprocessor:
    """
    Runs Drain3 template mining on raw CI/CD log text.

    Usage:
        preprocessor = DrainPreprocessor(max_templates=200)
        compressed_log, stats = preprocessor.preprocess(raw_log)
    """

    def __init__(self, max_templates: int = 200):
        self.max_templates = max_templates

    def preprocess(self, raw_log: str) -> tuple[str, dict]:
        """
        Parse raw_log through Drain3, rank templates by error signal,
        and return a compact representation with line-number annotations.

        Returns:
            compressed_log: str   — Ranked template lines in [L{n}] format
            stats: dict           — raw_line_count, compressed_line_count,
                                    compression_ratio
        """
        # 1. Strip ANSI escape codes & normalise line endings
        clean = re.sub(r'\x1b\[[0-9;]*[mGKHF]', '', raw_log)
        clean = clean.replace('\r\n', '\n').replace('\r', '\n')
        lines = clean.split('\n')
        total_lines = len(lines)

        # 2. Feed every non-empty line into Drain3
        miner = _build_miner()
        templates: dict[str, list[int]] = {}   # template_text → [line_numbers]

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            result = miner.add_log_message(stripped)
            if result:
                tmpl = result["template_mined"]
                templates.setdefault(tmpl, []).append(i + 1)

        # 3. Rank: primary key = error keyword count, secondary = frequency
        ranked = sorted(
            templates.items(),
            key=lambda x: (_error_score(x[0]), len(x[1])),
            reverse=True,
        )[: self.max_templates]

        # 4. Reconstruct compressed log as annotated template lines
        compressed_lines: list[str] = []
        for template, line_nums in ranked:
            first_line = line_nums[0]
            count = len(line_nums)
            suffix = f" [x{count}]" if count > 1 else ""
            compressed_lines.append(f"[L{first_line}] {template}{suffix}")

        # 5. Append a summary trailer for the LLM's awareness
        n_templates = len(ranked)
        compression_ratio = round((1 - n_templates / max(total_lines, 1)) * 100, 1)
        compressed_lines.append(
            f"\n[DRAIN SUMMARY: {total_lines} raw lines → "
            f"{n_templates} templates, {compression_ratio}% reduction]"
        )

        stats = {
            "raw_line_count":        total_lines,
            "compressed_line_count": n_templates,
            "compression_ratio":     compression_ratio,
        }

        logger.info(
            f"[Drain3] {total_lines} lines → {n_templates} templates "
            f"({compression_ratio}% reduction)"
        )

        return "\n".join(compressed_lines), stats

    def preprocess_with_clusters(
        self, raw_log: str
    ) -> tuple[str, list[dict], dict]:
        """
        Like preprocess() but also returns the ranked clusters as structured
        dicts for downstream scoring by TaskAwareCompressor.

        Returns:
            compressed_log: str       — same Drain3 string (for backward compat)
            clusters:       list[dict] — [{template, count, first_lineno, is_error}]
            stats:          dict       — raw_line_count, compressed_line_count, …
        """
        # 1. Strip ANSI & normalise line endings
        clean = re.sub(r'\x1b\[[0-9;]*[mGKHF]', '', raw_log)
        clean = clean.replace('\r\n', '\n').replace('\r', '\n')
        lines = clean.split('\n')
        total_lines = len(lines)

        # 2. Feed into Drain3
        miner = _build_miner()
        templates: dict[str, list[int]] = {}

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            result = miner.add_log_message(stripped)
            if result:
                tmpl = result["template_mined"]
                templates.setdefault(tmpl, []).append(i + 1)

        # 3. Rank templates
        ranked = sorted(
            templates.items(),
            key=lambda x: (_error_score(x[0]), len(x[1])),
            reverse=True,
        )[: self.max_templates]

        # 4. Build structured cluster list
        clusters: list[dict] = []
        compressed_lines: list[str] = []

        for template, line_nums in ranked:
            count      = len(line_nums)
            first_line = line_nums[0]
            is_err     = _error_score(template) > 0
            clusters.append({
                "template":     template,
                "count":        count,
                "first_lineno": first_line,
                "is_error":     is_err,
                "context":      [],  # context window populated by error_extraction_node
            })
            suffix = f" [x{count}]" if count > 1 else ""
            compressed_lines.append(f"[L{first_line}] {template}{suffix}")

        # 5. DRAIN SUMMARY trailer
        n_templates = len(ranked)
        compression_ratio = round((1 - n_templates / max(total_lines, 1)) * 100, 1)
        compressed_lines.append(
            f"\n[DRAIN SUMMARY: {total_lines} raw lines → "
            f"{n_templates} templates, {compression_ratio}% reduction]"
        )

        stats = {
            "raw_line_count":        total_lines,
            "compressed_line_count": n_templates,
            "compression_ratio":     compression_ratio,
        }

        logger.info(
            "[Drain3] %d lines → %d templates (%.1f%% reduction)",
            total_lines, n_templates, compression_ratio,
        )
        return "\n".join(compressed_lines), clusters, stats

