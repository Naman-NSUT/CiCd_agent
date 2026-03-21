export type ErrorType =
    | 'Build Failure'
    | 'Configuration Error'
    | 'Dependency Error'
    | 'Deployment Failure'
    | 'Network Error'
    | 'Permission Error'
    | 'Resource Exhaustion'
    | 'Security Scan Failure'
    | 'Test Failure'
    | 'Timeout';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type RunStatus =
    | 'ingesting' | 'extracting' | 'classifying' | 'retrieving'
    | 'analyzing' | 'fixing' | 'assessing' | 'paused_review'
    | 'remediating' | 'reporting' | 'completed' | 'failed';

export interface MemoryItem {
    text: string;
    source: 'repo memory' | 'global memory' | 'entity memory';
    confidence: number;
}

export interface PipelineRun {
    id: string;
    runId: string;
    repo: string;
    branch: string;
    stage: string;
    status: RunStatus;
    errorType?: ErrorType;
    severity?: Severity;
    confidenceScore?: number;
    needsHumanReview: boolean;
    isCorrelated: boolean;
    incidentId?: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    currentNode?: string;
    nodeProgress?: number;
    rootCause?: string;
    recommendedFix?: string;
    similarCases?: SimilarCase[];
    remediationResult?: RemediationResult;
    finalReport?: FinalReport;
    affectedRepos?: string[];
    memoryContext?: MemoryItem[];
    modelReasoning?: string;
    fixSteps?: string[];
    rawLogCompressed?: { originalLines: number; templates: number; reduction: string; lines: string[] };
    humanReviewOverride?: { reviewer: string; note: string };
}

export interface SimilarCase {
    repo: string;
    runId: string;
    errorType: ErrorType;
    rootCause: string;
    fixApplied: string;
    similarityScore: number;
    resolvedInMs: number;
}

export interface RemediationResult {
    executed: boolean;
    actionsTaken: RemediationAction[];
    autoExecuted: boolean;
}

export interface RemediationAction {
    tool: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
    status: 'success' | 'failed' | 'skipped';
}

export interface FinalReport {
    runId: string;
    timestamp: string;
    classification: ErrorType;
    confidence: number;
    severity: Severity;
    rootCause: string;
    recommendedFix: string;
    similarCases: SimilarCase[];
    escalated: boolean;
    humanReviewed: boolean;
    tokenUsage: Record<string, number>;
    executiveSummary: string;
    incidentId?: string;
    affectedRepos?: string[];
}

export interface AnalyticsData {
    period: string;
    buildFailures: number;
    testFailures: number;
    deploymentFailures: number;
    networkErrors: number;
    timeouts: number;
    other: number;
}

export interface NodeMetric {
    node: string;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
}
