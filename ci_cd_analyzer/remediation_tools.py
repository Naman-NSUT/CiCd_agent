"""
remediation_tools.py — Async tool functions for auto-remediation.

All functions degrade gracefully when environment tokens are absent:
they log the intended action and return a descriptive dict instead of
raising, so the graph always continues safely.
"""

import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)

_GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
_SLACK_TOKEN  = os.environ.get("SLACK_BOT_TOKEN", "")
_GH_HEADERS   = {
    "Authorization": f"Bearer {_GITHUB_TOKEN}",
    "Accept":        "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


# ── GitHub Tools ───────────────────────────────────────────────────────────────

async def trigger_pipeline_rerun(repo: str, run_id: str, branch: str) -> dict:
    """Re-trigger the failed CI run via GitHub Actions API."""
    if not _GITHUB_TOKEN:
        logger.warning("[Remediation] GITHUB_TOKEN not set — skipping rerun (would rerun %s/%s)", repo, run_id)
        return {"status": "skipped", "reason": "GITHUB_TOKEN not configured", "action": "rerun", "run_id": run_id}

    url = f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/rerun"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(url, headers=_GH_HEADERS)
    logger.info("[Remediation] Rerun triggered: %s → HTTP %s", url, r.status_code)
    return {"status": r.status_code, "action": "rerun", "repo": repo, "run_id": run_id, "branch": branch}


async def bump_dependency_version(repo: str, branch: str, package: str, version: str) -> dict:
    """Open a PR bumping a dependency to a specific version via GitHub Contents API."""
    if not _GITHUB_TOKEN:
        logger.warning("[Remediation] GITHUB_TOKEN not set — skipping bump %s==%s", package, version)
        return {"status": "skipped", "reason": "GITHUB_TOKEN not configured", "package": package, "version": version}

    # Fetch current requirements.txt SHA
    contents_url = f"https://api.github.com/repos/{repo}/contents/requirements.txt"
    async with httpx.AsyncClient(timeout=15) as client:
        get_resp = await client.get(contents_url, headers=_GH_HEADERS, params={"ref": branch})
        if get_resp.status_code != 200:
            return {"status": "error", "detail": f"Could not fetch requirements.txt: HTTP {get_resp.status_code}"}

        file_data = get_resp.json()
        import base64
        content = base64.b64decode(file_data["content"]).decode()
        sha = file_data["sha"]

        # Patch the version line (simple sed-style replacement)
        import re
        new_content = re.sub(
            rf"(?m)^{re.escape(package)}[>=!~].*$",
            f"{package}>={version}",
            content,
        )
        if new_content == content:
            # Package line not found — append it
            new_content = content.rstrip() + f"\n{package}>={version}\n"

        # Create a new branch + commit via the API
        new_branch = f"fix/bump-{package}-{version}"
        encoded = base64.b64encode(new_content.encode()).decode()
        put_resp = await client.put(
            contents_url,
            headers=_GH_HEADERS,
            json={
                "message": f"chore: bump {package} to {version}",
                "content": encoded,
                "sha":     sha,
                "branch":  new_branch,
            }
        )
        status = "pr_opened" if put_resp.status_code in (200, 201) else f"http_{put_resp.status_code}"

    logger.info("[Remediation] Dependency bump: %s==%s → %s", package, version, status)
    return {"status": status, "package": package, "version": version, "branch": new_branch}


async def clear_cache(repo: str, cache_key: str) -> dict:
    """Delete a named GitHub Actions cache entry."""
    if not _GITHUB_TOKEN:
        logger.warning("[Remediation] GITHUB_TOKEN not set — skipping cache clear for key '%s'", cache_key)
        return {"status": "skipped", "reason": "GITHUB_TOKEN not configured", "key": cache_key}

    list_url = f"https://api.github.com/repos/{repo}/actions/caches"
    async with httpx.AsyncClient(timeout=15) as client:
        list_resp = await client.get(list_url, headers=_GH_HEADERS, params={"key": cache_key})
        caches = list_resp.json().get("actions_caches", [])
        deleted = []
        for cache in caches:
            del_url = f"{list_url}/{cache['id']}"
            await client.delete(del_url, headers=_GH_HEADERS)
            deleted.append(cache["id"])

    logger.info("[Remediation] Cleared %d cache(s) matching key '%s'", len(deleted), cache_key)
    return {"status": "cache_cleared", "key": cache_key, "deleted_ids": deleted}


async def increase_job_timeout(repo: str, job_name: str, new_timeout_mins: int) -> dict:
    """
    Open a PR patching .github/workflows YAML to increase a job's timeout-minutes.
    Hard cap: 120 minutes (never auto-set more than 2 hours).
    """
    if not _GITHUB_TOKEN:
        logger.warning("[Remediation] GITHUB_TOKEN not set — skipping timeout patch for job '%s'", job_name)
        return {"status": "skipped", "reason": "GITHUB_TOKEN not configured", "job": job_name}

    # Clamp to safety maximum
    capped_timeout = min(new_timeout_mins, 120)

    # Find the workflow file containing the job
    search_url = f"https://api.github.com/repos/{repo}/contents/.github/workflows"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(search_url, headers=_GH_HEADERS)
        if resp.status_code != 200:
            return {"status": "error", "detail": f"Could not list workflows: HTTP {resp.status_code}"}
        files = [f for f in resp.json() if f["name"].endswith((".yml", ".yaml"))]

        patched = None
        for wf_file in files:
            content_resp = await client.get(wf_file["url"], headers=_GH_HEADERS)
            import base64, re
            raw = base64.b64decode(content_resp.json()["content"]).decode()
            if job_name in raw:
                # Inject or replace timeout-minutes under the job key
                new_raw = re.sub(
                    r'(\s+timeout-minutes:\s*)\d+',
                    rf'\g<1>{capped_timeout}',
                    raw,
                )
                if new_raw == raw:
                    # No existing timeout line — insert after job name line
                    new_raw = re.sub(
                        rf'({re.escape(job_name)}:)',
                        rf'\1\n      timeout-minutes: {capped_timeout}',
                        raw,
                    )
                encoded = base64.b64encode(new_raw.encode()).decode()
                sha = content_resp.json()["sha"]
                new_branch = f"fix/timeout-{job_name}"
                await client.put(
                    wf_file["url"].split('?')[0],
                    headers=_GH_HEADERS,
                    json={
                        "message": f"ci: increase {job_name} timeout to {capped_timeout}m",
                        "content": encoded,
                        "sha": sha,
                        "branch": new_branch,
                    }
                )
                patched = wf_file["name"]
                break

    logger.info("[Remediation] Timeout patch: job=%s new_timeout=%sm file=%s", job_name, capped_timeout, patched)
    return {"status": "pr_opened" if patched else "not_found", "job_name": job_name, "new_timeout": capped_timeout, "file": patched}


# ── Notification ───────────────────────────────────────────────────────────────

async def notify_slack(channel: str, message: str, severity: str) -> dict:
    """Post a structured remediation alert to Slack."""
    if not _SLACK_TOKEN:
        logger.warning("[Remediation] SLACK_BOT_TOKEN not set — would post to #%s: %s", channel, message)
        return {"status": "skipped", "reason": "SLACK_BOT_TOKEN not configured", "channel": channel}

    SEVERITY_EMOJI = {"low": "🟡", "medium": "🟠", "high": "🔴", "critical": "🚨"}
    emoji = SEVERITY_EMOJI.get(severity, "ℹ️")
    payload = {
        "channel": channel,
        "text":    f"{emoji} *[CI/CD Auto-Remediation | {severity.upper()}]*\n{message}",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {_SLACK_TOKEN}", "Content-Type": "application/json"},
            json=payload,
        )
    data = r.json()
    logger.info("[Remediation] Slack notification → #%s: ok=%s", channel, data.get("ok"))
    return {"status": "sent" if data.get("ok") else "failed", "channel": channel, "slack_response": data.get("error")}
