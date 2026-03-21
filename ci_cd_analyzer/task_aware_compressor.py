"""
task_aware_compressor.py — LogSieve-style task-aware log relevance scorer.

Scores every Drain3 cluster against the target error category and drops
low-signal clusters, producing a task_compressed_log that is 40-60% smaller
than the raw Drain3 output before any Gemini API call.
"""

import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Per-category keyword signal maps ──────────────────────────────────────────
SIGNAL_KEYWORDS: dict[str, list[str]] = {
    "Build Failure": [
        "compile", "build", "make", "cmake", "gcc", "clang", "linker",
        "undefined symbol", "syntax error", "import error", "cannot find",
        "failed to build", "assembler", "object file",
    ],
    "Configuration Error": [
        "config", "yaml", "json", "env", "variable", "missing key",
        "invalid value", "parse error", "not set", "undefined", "malformed",
    ],
    "Dependency Error": [
        "dependency", "requirements", "package", "version", "not found",
        "incompatible", "pip", "npm", "maven", "gradle", "lock",
        "resolution", "cannot resolve",
    ],
    "Deployment Failure": [
        "deploy", "helm", "kubectl", "k8s", "kubernetes", "rollout",
        "pod", "container", "image", "registry", "push failed", "crashloop",
    ],
    "Network Error": [
        "connection", "timeout", "dns", "refused", "unreachable", "socket",
        "ssl", "tls", "certificate", "proxy", "403", "502", "504",
    ],
    "Permission Error": [
        "permission", "denied", "unauthorized", "forbidden", "403",
        "access", "iam", "role", "policy", "credentials",
    ],
    "Resource Exhaustion": [
        "oom", "memory", "cpu", "disk", "quota", "limit", "exceeded",
        "killed", "out of", "no space", "ulimit", "swap",
    ],
    "Security Scan Failure": [
        "vulnerability", "cve", "critical", "high severity", "snyk",
        "trivy", "dependabot", "insecure", "exploit", "malware",
    ],
    "Test Failure": [
        "test", "assert", "expect", "fail", "pass", "pytest", "jest",
        "junit", "spec", "coverage", "flaky", "assertion error",
    ],
    "Timeout": [
        "timeout", "timed out", "deadline", "exceeded", "too long",
        "max time", "cancelled", "context deadline",
    ],
}

_STACK_TRACE_RE = re.compile(
    r'(at\s+\w[\w.]+\(|File ".+", line \d+|Traceback |^\s+at )',
    re.MULTILINE,
)


# ── ScoredCluster dataclass ─────────────────────────────────────────────────
@dataclass
class ScoredCluster:
    template:     str
    count:        int
    first_lineno: int
    context:      list[str] = field(default_factory=list)
    relevance:    float = 0.0
    signal_terms: list[str] = field(default_factory=list)


# ── TaskAwareCompressor ─────────────────────────────────────────────────────
class TaskAwareCompressor:
    """
    Scores Drain3 clusters for task relevance and returns a compact log
    containing only the most diagnostic clusters for the Gemini prompt.

    After calling compress(), self._last_scored holds all ScoredCluster
    objects (including those dropped) for use by error_extraction_node.
    """

    def __init__(self) -> None:
        self._last_scored: list[ScoredCluster] = []

    # ── Scoring ────────────────────────────────────────────────────────────
    def score_cluster(
        self,
        cluster: dict,
        classification_hint: str | None = None,
    ) -> ScoredCluster:
        text  = cluster.get("template", "").lower()
        score = 0.0
        hits: list[str] = []

        # 1. Hard error-signal boost
        if cluster.get("is_error"):
            score += 0.4

        # 2. Classification-specific keyword matching
        if classification_hint and classification_hint in SIGNAL_KEYWORDS:
            for kw in SIGNAL_KEYWORDS[classification_hint]:
                if kw in text:
                    score += 0.1
                    hits.append(kw)
        else:
            # No hint — score against all categories, take max contribution
            max_cat = max(
                sum(0.08 for kw in kws if kw in text)
                for kws in SIGNAL_KEYWORDS.values()
            )
            score += min(max_cat, 0.4)

        # 3. Frequency effects
        count = cluster.get("count", 1)
        if count > 100:
            score -= 0.1   # very-high-freq → structural noise
        elif count > 1:
            score += 0.05  # repeated occurrence → probably meaningful

        # 4. Stack-trace boost
        if _STACK_TRACE_RE.search(cluster.get("template", "")):
            score += 0.2

        return ScoredCluster(
            template     = cluster.get("template", ""),
            count        = count,
            first_lineno = cluster.get("first_lineno", 0),
            context      = cluster.get("context", []),
            relevance    = round(min(max(score, 0.0), 1.0), 3),
            signal_terms = hits,
        )

    # ── Compression ────────────────────────────────────────────────────────
    def compress(
        self,
        clusters: list[dict],
        classification_hint: str | None = None,
        max_tokens: int = 4000,
        min_relevance: float = 0.2,
    ) -> tuple[str, dict]:
        """
        Score clusters, split into must-keep (≥0.5) and can-keep (0.2–0.5),
        fill token budget from can-keep, format and return compressed log.

        Returns:
            task_compressed_log: str
            compression_stats:   dict
        """
        if not clusters:
            return "[NO CLUSTERS]", {"total_clusters": 0, "selected_clusters": 0,
                                     "dropped_clusters": 0, "est_tokens": 0, "top_signals": []}

        scored = [self.score_cluster(c, classification_hint) for c in clusters]
        scored.sort(key=lambda s: s.relevance, reverse=True)
        self._last_scored = scored  # expose to error_extraction_node

        must_keep = [s for s in scored if s.relevance >= 0.5]
        can_keep  = [s for s in scored if min_relevance <= s.relevance < 0.5]

        selected   = list(must_keep)
        est_tokens = sum(len(s.template.split()) * 1.3 for s in selected)

        for s in can_keep:
            line_tok = len(s.template.split()) * 1.3
            if est_tokens + line_tok > max_tokens:
                break
            selected.append(s)
            est_tokens += line_tok

        # Re-sort selected by line number for readability
        selected.sort(key=lambda s: s.first_lineno)

        lines: list[str] = []
        for s in selected:
            prefix = f"[x{s.count}|rel={s.relevance:.2f}]"
            lines.append(f"{prefix} (ln {s.first_lineno}) {s.template}")
            if s.relevance >= 0.6 and s.context:
                lines.append("  context: " + " | ".join(s.context[:2]))

        stats = {
            "total_clusters":    len(clusters),
            "selected_clusters": len(selected),
            "dropped_clusters":  len(clusters) - len(selected),
            "est_tokens":        int(est_tokens),
            "top_signals":       [s.signal_terms for s in must_keep[:3]],
            "classification_hint": classification_hint,
        }

        logger.info(
            "[LogSieve] %d/%d clusters kept (hint=%s, ~%d tokens)",
            len(selected), len(clusters), classification_hint, int(est_tokens),
        )
        return "\n".join(lines), stats
