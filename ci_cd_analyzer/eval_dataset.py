"""
eval_dataset.py — Golden evaluation dataset for CI/CD classifier regression testing.

Inline synthetic logs (no file I/O) covering all 10 error categories.
Run create_langsmith_dataset() once to push to LangSmith.
"""

import os

EVAL_EXAMPLES = [
    # ── Build Failure ──────────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
[build] Compiling src/main/java/PaymentService.java
[build] error: cannot find symbol
[build]   symbol:   class TransactionRepository
[build]   location: class PaymentService
[build] 1 error
[build] FAILED: BUILD FAILURE
[build] Total time: 5.231 s
""",
            "pipeline_metadata": {"repo": "acme/payments-api", "branch": "feature/tx", "stage": "build"},
        },
        "expected": {"classification": "Build Failure", "severity": "high", "confidence_gte": 0.80},
    },
    # ── Dependency Error ───────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
ERROR: Could not find a version that satisfies the requirement grpc==1.48.0
ERROR: No matching distribution found for grpc==1.48.0
pip install failed with exit code 1
""",
            "pipeline_metadata": {"repo": "acme/backend", "branch": "deps/update", "stage": "install"},
        },
        "expected": {"classification": "Dependency Error", "severity": "medium", "confidence_gte": 0.80},
    },
    # ── Test Failure ───────────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
FAILED tests/test_auth.py::test_login_invalid_password - AssertionError: assert 200 == 401
FAILED tests/test_auth.py::test_refresh_token_expired - AssertionError: Token should be expired
2 failed, 48 passed in 12.34s
""",
            "pipeline_metadata": {"repo": "acme/auth-service", "branch": "fix/token", "stage": "test"},
        },
        "expected": {"classification": "Test Failure", "severity": "medium", "confidence_gte": 0.80},
    },
    # ── Timeout ────────────────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
##[error]The job running on runner ubuntu-latest has exceeded the maximum execution time of 60 minutes.
##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, the machine is shutting down, the job was cancelled.
error: The operation was cancelled.
""",
            "pipeline_metadata": {"repo": "acme/ml-pipeline", "branch": "train/v2", "stage": "train"},
        },
        "expected": {"classification": "Timeout", "severity": "medium", "confidence_gte": 0.80},
    },
    # ── Resource Exhaustion / OOM ──────────────────────────────────────────
    {
        "input": {
            "raw_log": """
java.lang.OutOfMemoryError: Java heap space
    at java.util.Arrays.copyOf(Arrays.java:3210)
Killed
Process exited with code 137
""",
            "pipeline_metadata": {"repo": "acme/data-processor", "branch": "main", "stage": "process"},
        },
        "expected": {"classification": "Resource Exhaustion", "severity": "high", "confidence_gte": 0.80},
    },
    # ── Permission Error ───────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
Error response from daemon: pull access denied for gcr.io/acme/service, repository does not exist or may require 'docker login': denied: Permission "artifactregistry.repositories.downloadArtifacts" denied on resource
exit status 1
""",
            "pipeline_metadata": {"repo": "acme/infra", "branch": "deploy/prod", "stage": "deploy"},
        },
        "expected": {"classification": "Permission Error", "severity": "high", "confidence_gte": 0.80},
    },
    # ── Network Error ─────────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
curl: (6) Could not resolve host: registry.npmjs.org
npm ERR! network request to https://registry.npmjs.org/react failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
npm ERR! network This is a problem related to network connectivity.
""",
            "pipeline_metadata": {"repo": "acme/frontend", "branch": "feature/ui", "stage": "install"},
        },
        "expected": {"classification": "Network Error", "severity": "medium", "confidence_gte": 0.75},
    },
    # ── Configuration Error ────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
Error: Invalid configuration file .github/workflows/deploy.yml
Line 23: mapping values are not allowed in this context
  on: push: branches: [main
                      ^
""",
            "pipeline_metadata": {"repo": "acme/api", "branch": "ci/fix", "stage": "validate"},
        },
        "expected": {"classification": "Configuration Error", "severity": "medium", "confidence_gte": 0.80},
    },
    # ── Deployment Failure ─────────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
Error from server: error when creating "deployment.yaml": admission webhook "validate.kyverno.svc" denied the request:
resource Deployment/production/payment-api was blocked due to the following policies: require-labels
helm upgrade --install failed: context deadline exceeded
""",
            "pipeline_metadata": {"repo": "acme/k8s-infra", "branch": "release/2.1", "stage": "deploy"},
        },
        "expected": {"classification": "Deployment Failure", "severity": "critical", "confidence_gte": 0.80},
    },
    # ── Security Scan Failure ──────────────────────────────────────────────
    {
        "input": {
            "raw_log": """
[HIGH] CVE-2023-44487: HTTP/2 rapid reset attack in golang.org/x/net v0.10.0
[CRITICAL] CVE-2023-39325: HTTP/2 rapid reset vulnerability in net/http
Total: 2 (HIGH: 1, CRITICAL: 1)
FAILED: Security scan found critical vulnerabilities. Pipeline blocked.
""",
            "pipeline_metadata": {"repo": "acme/gateway", "branch": "main", "stage": "scan"},
        },
        "expected": {"classification": "Security Scan Failure", "severity": "critical", "confidence_gte": 0.85},
    },
]


def create_langsmith_dataset():
    """Push the golden dataset to LangSmith. Run once per project setup."""
    api_key = os.environ.get("LANGCHAIN_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "LANGCHAIN_API_KEY not set. Add it to .env before creating the dataset."
        )

    from langsmith import Client
    client = Client()

    # Delete existing dataset if it exists (idempotent re-run)
    existing = [d for d in client.list_datasets() if d.name == "cicd_classifier_golden_set"]
    if existing:
        client.delete_dataset(dataset_id=existing[0].id)

    dataset = client.create_dataset(
        dataset_name = "cicd_classifier_golden_set",
        description  = "Ground-truth CI/CD failures — 10 error categories for regression testing.",
    )

    for ex in EVAL_EXAMPLES:
        client.create_example(
            inputs     = ex["input"],
            outputs    = ex["expected"],
            dataset_id = dataset.id,
        )

    print(f"✅ Created dataset '{dataset.name}' with {len(EVAL_EXAMPLES)} examples (id={dataset.id})")
    return dataset


if __name__ == "__main__":
    create_langsmith_dataset()
