import type { PipelineRun, SimilarCase, FinalReport, AnalyticsData, NodeMetric, RunStatus, Severity } from '../types/pipeline';
import { REPOS, BRANCHES, STAGES, ERROR_TYPES } from './constants';
import type { ErrorType } from '../types/pipeline';

let idCounter = 1000;
const uid = () => `run_${(++idCounter).toString(36)}`;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randNum(min: number, max: number) { return Math.floor(Math.random() * (max - min)) + min; }
function randFloat(min: number, max: number) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }

const SIMILAR_CASES: SimilarCase[] = [
    { repo: 'acme/payments-api', runId: 'run_a1b', errorType: 'Build Failure', rootCause: 'Missing TypeScript type declarations', fixApplied: 'Added @types/node to devDependencies', similarityScore: 0.94, resolvedInMs: 18000 },
    { repo: 'acme/auth-service', runId: 'run_c2d', errorType: 'Dependency Error', rootCause: 'Incompatible grpc version lock', fixApplied: 'Bumped grpc to 1.56.1', similarityScore: 0.88, resolvedInMs: 42000 },
    { repo: 'acme/backend', runId: 'run_e3f', errorType: 'Test Failure', rootCause: 'Flakey async test - race condition', fixApplied: 'Added retry logic + increased timeout', similarityScore: 0.79, resolvedInMs: 9000 },
];

const ROOT_CAUSES: Record<ErrorType, string> = {
    'Build Failure': 'Transitive dependency version conflict in build cache — grpc@1.48.0 incompatible with node v20',
    'Configuration Error': 'Typo in helm values.yaml — missing required env variable DATABASE_URL in staging overlay',
    'Dependency Error': 'Lock file conflict after merge — npm ci fails on incompatible peer dependency @grpc/grpc-js@1.8',
    'Deployment Failure': 'Kubernetes health check failing — /health endpoint returns 503 during startup race with DB migration',
    'Network Error': 'DNS resolution timeout to internal service mesh gateway — istio sidecar proxy not ready',
    'Permission Error': 'GitHub Actions runner missing write permission to packages — GITHUB_TOKEN scope insufficient',
    'Resource Exhaustion': 'OOM killed at 2.1GB — memory leak in test suite from unclosed database connections',
    'Security Scan Failure': 'Critical CVE-2024-38816 in spring-webmvc 6.1.6 — path traversal via crafted URL',
    'Test Failure': 'Race condition in async payment webhook handler test — event emitted before listener attached',
    'Timeout': 'E2E test suite exceeded 30 min limit — Playwright browser launch hanging on CI (no GPU)',
};

const FIXES: Record<ErrorType, string> = {
    'Build Failure': 'Bump grpc to >=1.56.1 or add resolution to package.json. Clear build cache.',
    'Configuration Error': 'Add DATABASE_URL to staging overlay in helm/values-staging.yaml line 47.',
    'Dependency Error': 'Run `npm install --legacy-peer-deps` or pin @grpc/grpc-js@^1.10.0.',
    'Deployment Failure': 'Add initialDelaySeconds: 30 to readinessProbe in deployment.yaml.',
    'Network Error': 'Increase istio proxy ready timeout to 60s. Add retry with backoff to service client.',
    'Permission Error': 'Add `packages: write` to workflow permissions block in .github/workflows/ci.yml.',
    'Resource Exhaustion': 'Add afterAll() hook to close DB pool. Set --max-old-space-size=4096.',
    'Security Scan Failure': 'Upgrade spring-webmvc to 6.1.13+. Patch is backward compatible.',
    'Test Failure': 'Wrap event emission in nextTick(). Add { timeout: 5000 } to waitForEvent call.',
    'Timeout': 'Split E2E suite into 3 parallel shards. Cache Playwright browsers in CI.',
};

export type Outcome = 'Auto-fixed' | 'Re-run triggered' | 'PR opened' | 'Human reviewed' | 'Escalated' | 'No action';

function makeFinalReport(run: Partial<PipelineRun>): FinalReport {
    return {
        runId: run.runId ?? uid(),
        timestamp: new Date().toISOString(),
        classification: run.errorType ?? 'Build Failure',
        confidence: run.confidenceScore ?? 0.87,
        severity: run.severity ?? 'high',
        rootCause: run.rootCause ?? ROOT_CAUSES[run.errorType ?? 'Build Failure'],
        recommendedFix: run.recommendedFix ?? FIXES[run.errorType ?? 'Build Failure'],
        similarCases: SIMILAR_CASES.slice(0, 2),
        escalated: run.severity === 'critical',
        humanReviewed: run.needsHumanReview ?? false,
        tokenUsage: { log_ingestion: 1200, classification: 3400, root_cause_analysis: 5600, report_generation: 2100 },
        executiveSummary: `A ${run.errorType ?? 'Build Failure'} was detected in ${run.repo ?? 'acme/payments-api'} on branch ${run.branch ?? 'main'}. Root cause identified. Auto-remediation attempted and succeeded.`,
    };
}

export function generateMockRun(overrides: Partial<PipelineRun> & { outcome?: Outcome } = {}): PipelineRun & { outcome?: Outcome } {
    const errorType = overrides.errorType ?? rand(ERROR_TYPES);
    const severity = (overrides.severity ?? rand(['critical', 'high', 'medium', 'low'] as const)) as Severity;
    const status = (overrides.status ?? rand(['completed', 'analyzing', 'classifying', 'paused_review', 'failed'] as const)) as RunStatus;
    const repo = overrides.repo ?? rand(REPOS);
    const branch = overrides.branch ?? rand(BRANCHES);
    const stage = overrides.stage ?? rand(STAGES);
    const run: PipelineRun & { outcome?: Outcome } = {
        id: uid(),
        runId: `run_${Math.random().toString(36).slice(2, 9)}`,
        repo,
        branch,
        stage,
        status,
        errorType,
        severity,
        confidenceScore: randFloat(0.62, 0.98),
        needsHumanReview: status === 'paused_review',
        isCorrelated: Math.random() > 0.85,
        startedAt: new Date(Date.now() - randNum(30000, 900000)),
        durationMs: status === 'completed' || status === 'failed' ? randNum(8000, 120000) : undefined,
        currentNode: !['completed', 'failed'].includes(status) ? overrides.currentNode ?? rand(['classification', 'root_cause_analysis', 'retrieval', 'fix_recommendation']) : undefined,
        nodeProgress: !['completed', 'failed'].includes(status) ? randNum(15, 92) : status === 'completed' ? 100 : randNum(10, 60),
        rootCause: ROOT_CAUSES[errorType],
        recommendedFix: FIXES[errorType],
        similarCases: SIMILAR_CASES,
        outcome: overrides.outcome,
        remediationResult: {
            executed: true,
            autoExecuted: true,
            actionsTaken: [
                { tool: 'trigger_pipeline_rerun', args: { repo, branch }, status: 'success' as const },
                { tool: 'bump_dependency_version', args: { package: 'grpc', version: '1.56.1' }, status: 'success' as const },
                { tool: 'clear_cache', args: { scope: 'build' }, status: 'success' as const },
                { tool: 'increase_job_timeout', args: { timeout: '30m' }, status: 'skipped' as const, result: { reason: 'Not applicable for build failures' } },
                { tool: 'notify_slack', args: { channel: '#ci-alerts' }, status: 'success' as const },
            ],
        },
        memoryContext: [
            { text: `Known: ${errorType === 'Dependency Error' ? 'grpc-java >1.57 breaks payments-service RPC wrapper' : 'Build cache invalidation required after node upgrade'}`, source: 'repo memory' as const, confidence: 0.92 },
            { text: `Team preference: ${errorType === 'Dependency Error' ? 'always pin exact versions, never ^-range for grpc' : 'prefer automated fixes over manual intervention'}`, source: 'entity memory' as const, confidence: 0.88 },
            { text: 'Pattern: similar failures resolved in <5min with cache clear + dependency bump', source: 'global memory' as const, confidence: 0.76 },
        ],
        modelReasoning: `The error signature matches a transitive dependency conflict pattern. The build log shows \`grpc@1.48.0\` being resolved despite \`package-lock.json\` specifying \`1.56.1\`, indicating a stale node_modules cache from a previous CI run. This is consistent with 3 similar failures in the last 30 days across \`acme/payments-api\` and \`acme/auth-service\`. The root cause is the CI runner reusing a warm cache that contains an incompatible version. Memory context confirms the team prefers exact version pinning. Confidence is high (91%) because the log pattern, dependency graph, and historical context all converge on the same diagnosis.`,
        fixSteps: [
            'Clear the CI build cache for this repository (npm cache clean --force)',
            'Pin grpc dependency to exact version 1.56.1 in package.json (remove ^ prefix)',
            'Run npm install to regenerate package-lock.json with correct resolution tree',
            'Add a preventive CI step to validate dependency versions before build',
        ],
        rawLogCompressed: {
            originalLines: 47221,
            templates: 183,
            reduction: '99.6%',
            lines: [
                '[INFO]  2026-03-18T03:14:02Z  Starting build for acme/payments-api@feat/auth-v2',
                '[INFO]  2026-03-18T03:14:03Z  Node.js v20.11.1 detected',
                '[INFO]  2026-03-18T03:14:03Z  npm v10.5.0',
                '[INFO]  2026-03-18T03:14:04Z  Restoring build cache from previous run...',
                '[WARN]  2026-03-18T03:14:05Z  Cache contains node_modules from 2026-03-14 (4 days stale)',
                '[INFO]  2026-03-18T03:14:08Z  Running npm ci --prefer-offline',
                '[WARN]  2026-03-18T03:14:12Z  npm warn ERESOLVE overriding peer dependency',
                '[ERROR] 2026-03-18T03:14:15Z  npm ERR! Could not resolve dependency:',
                '[ERROR] 2026-03-18T03:14:15Z  npm ERR! peer grpc@"^1.56.0" from @acme/rpc-client@2.3.1',
                '[ERROR] 2026-03-18T03:14:15Z  npm ERR! node_modules/@acme/rpc-client',
                '[ERROR] 2026-03-18T03:14:15Z  npm ERR!   @acme/rpc-client@"^2.3.0" from the root project',
                '[ERROR] 2026-03-18T03:14:16Z  npm ERR! Fix the upstream dependency conflict, or retry',
                '[ERROR] 2026-03-18T03:14:16Z  npm ERR! with --force or --legacy-peer-deps',
                '[INFO]  2026-03-18T03:14:17Z  Build failed with exit code 1',
                '[INFO]  2026-03-18T03:14:17Z  Total duration: 15.2s',
            ],
        },
        ...overrides,
    };
    if (status === 'completed' || status === 'failed') {
        run.finalReport = makeFinalReport(run);
        run.completedAt = new Date(run.startedAt.getTime() + (run.durationMs ?? 30000));
    }
    return run;
}

export const MOCK_ACTIVE_RUNS: PipelineRun[] = [];
export const MOCK_COMPLETED_RUNS: (PipelineRun & { outcome: Outcome })[] = [];
export const MOCK_RUNS: PipelineRun[] = [];

// 7-day sparkline data for "avg resolve time"
export const RESOLVE_SPARKLINE = [0, 0, 0, 0, 0, 0, 0];

export const MOCK_ANALYTICS: AnalyticsData[] = [];

export const MOCK_NODE_METRICS: NodeMetric[] = [];

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export async function fetchRuns(workspaceId?: string): Promise<PipelineRun[]> {
    try {
        const query = workspaceId ? `?workspace_id=${workspaceId}` : '';
        const res = await fetch(`${API_BASE}/runs${query}`);
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        // Return only real API data
        return data.map((r: any) => ({
            id: r.id,
            runId: r.metadata.run_id,
            repo: r.metadata.repo,
            branch: r.metadata.branch,
            stage: r.metadata.stage,
            status: r.status,
            errorType: r.report.classification,
            severity: r.report.severity,
            confidenceScore: r.report.confidence,
            needsHumanReview: r.status === 'paused_review',
            isCorrelated: r.metadata.is_correlated || false,
            startedAt: new Date(r.timestamp),
            rootCause: r.report.root_cause,
            recommendedFix: r.report.recommended_fix,
        }));
    } catch (e) {
        console.warn('Backend not reached:', e);
        return [];
    }
}

export async function fetchRun(id: string, workspaceId?: string): Promise<PipelineRun> {
    try {
        const query = workspaceId ? `?workspace_id=${workspaceId}` : '';
        const res = await fetch(`${API_BASE}/runs/${id}${query}`);
        if (!res.ok) throw new Error('Not found');
        const r = await res.json();
        return {
            id: r.id,
            runId: r.metadata.run_id,
            repo: r.metadata.repo,
            branch: r.metadata.branch,
            stage: r.metadata.stage,
            status: r.status,
            errorType: r.report.classification,
            severity: r.report.severity,
            confidenceScore: r.report.confidence,
            needsHumanReview: r.status === 'paused_review',
            isCorrelated: r.metadata.is_correlated || false,
            startedAt: new Date(r.timestamp),
            rootCause: r.report.root_cause,
            recommendedFix: r.report.recommended_fix,
        };
    } catch (e) {
        console.warn('Backend fail, fallback to mock:', e);
        throw e;
    }
}

export async function analyzeLog(log: string, metadata: any): Promise<any> {
    const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log, metadata }),
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
}

export async function submitHumanReview(runId: string, decision: { classification: string; approved: boolean }): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    console.log('Review submitted:', runId, decision);
}
