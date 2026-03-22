// analytics_data.ts — rich mock data for the Analytics screen
import type { ErrorType } from '../types/pipeline';

export type TimeRange = '7d' | '30d' | '90d';

export interface DailyPoint {
    date: string;
    total: number;
    buildFailures: number;
    testFailures: number;
    deploymentFailures: number;
    networkErrors: number;
    securityFailures: number;
    other: number;
}

export interface ErrorTypeStat {
    type: ErrorType;
    count: number;
    percentage: number;
    avgConfidence: number;
    avgMttrMin: number;
    fixAttempted: number;
    fixSuccess: number;
}

export interface CalibrationRow {
    type: ErrorType;
    threshold: number;
    overrideRate: number;
    sampleSize: number;
    trend: number[];  // last 7 threshold values
}

export interface RepoStat {
    repo: string;
    failures: number;
    topErrorType: ErrorType;
    autoFixRate: number;
    memoryEntries: number;
    dailyFailures: number[];
    breakdownByType: Partial<Record<ErrorType, number>>;
}

export interface NodePerf {
    node: string;
    avgMs: number;
    p95Ms: number;
    tokenUsage: number;
}

// ── generate time series ────────────────────────────────────────────────────
function makeSeries(days: number, scale: number): DailyPoint[] {
    const result: DailyPoint[] = [];
    const now = new Date('2026-03-18');
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        const noise = () => Math.floor(Math.random() * 4 * scale);
        const b = Math.floor((Math.random() * 8 + 5) * scale) + noise();
        const t = Math.floor((Math.random() * 6 + 3) * scale) + noise();
        const dep = Math.floor((Math.random() * 4 + 2) * scale) + noise();
        const n = Math.floor((Math.random() * 3 + 1) * scale) + noise();
        const s = Math.floor((Math.random() * 2 + 1) * scale) + noise();
        const o = Math.floor((Math.random() * 3 + 1) * scale) + noise();
        result.push({ date: label, total: b + t + dep + n + s + o, buildFailures: b, testFailures: t, deploymentFailures: dep, networkErrors: n, securityFailures: s, other: o });
    }
    return result;
}

export const SERIES_7D = makeSeries(7, 1);
export const SERIES_30D = makeSeries(30, 1);
export const SERIES_90D = makeSeries(90, 1.2);

export function getSeriesFor(range: TimeRange): DailyPoint[] {
    return range === '7d' ? SERIES_7D : range === '30d' ? SERIES_30D : SERIES_90D;
}

function sumField(series: DailyPoint[], key: keyof DailyPoint) {
    return series.reduce((a, d) => a + (d[key] as number), 0);
}

export function getTopStats(range: TimeRange) {
    const s = getSeriesFor(range);
    const total = sumField(s, 'total');
    const failures = sumField(s, 'buildFailures') + sumField(s, 'deploymentFailures') + sumField(s, 'securityFailures');
    const failRate = total > 0 ? (failures / total) * 100 : 0;
    const autoFix = 67 + Math.round(Math.random() * 8);
    const mttr = range === '7d' ? 11.4 : range === '30d' ? 13.2 : 15.8;
    const tokenCost = range === '7d' ? 2.84 : range === '30d' ? 11.23 : 31.6;
    return { total, failRate: failRate.toFixed(1), autoFix, mttr: mttr.toFixed(1), tokenCost: tokenCost.toFixed(2) };
}

// ── error type stats ────────────────────────────────────────────────────────
export const ERROR_TYPE_STATS: ErrorTypeStat[] = [
    { type: 'Build Failure', count: 87, percentage: 31, avgConfidence: 0.91, avgMttrMin: 8.2, fixAttempted: 87, fixSuccess: 74 },
    { type: 'Test Failure', count: 61, percentage: 22, avgConfidence: 0.87, avgMttrMin: 5.3, fixAttempted: 61, fixSuccess: 55 },
    { type: 'Deployment Failure', count: 50, percentage: 18, avgConfidence: 0.78, avgMttrMin: 18.6, fixAttempted: 50, fixSuccess: 31 },
    { type: 'Network Error', count: 33, percentage: 12, avgConfidence: 0.82, avgMttrMin: 12.1, fixAttempted: 33, fixSuccess: 22 },
    { type: 'Security Scan Failure', count: 22, percentage: 8, avgConfidence: 0.68, avgMttrMin: 34.2, fixAttempted: 22, fixSuccess: 7 },
    { type: 'Dependency Error', count: 14, percentage: 5, avgConfidence: 0.85, avgMttrMin: 10.4, fixAttempted: 14, fixSuccess: 11 },
    { type: 'Configuration Error', count: 8, percentage: 3, avgConfidence: 0.76, avgMttrMin: 22.0, fixAttempted: 8, fixSuccess: 4 },
    { type: 'Timeout', count: 3, percentage: 1, avgConfidence: 0.93, avgMttrMin: 3.1, fixAttempted: 3, fixSuccess: 3 },
];

// ── calibration table ───────────────────────────────────────────────────────
export const CALIBRATION_ROWS: CalibrationRow[] = [
    { type: 'Build Failure', threshold: 0.80, overrideRate: 9, sampleSize: 87, trend: [0.82, 0.82, 0.81, 0.81, 0.80, 0.80, 0.80] },
    { type: 'Test Failure', threshold: 0.75, overrideRate: 12, sampleSize: 61, trend: [0.78, 0.77, 0.76, 0.76, 0.75, 0.75, 0.75] },
    { type: 'Deployment Failure', threshold: 0.70, overrideRate: 28, sampleSize: 50, trend: [0.75, 0.73, 0.72, 0.71, 0.70, 0.70, 0.70] },
    { type: 'Network Error', threshold: 0.72, overrideRate: 18, sampleSize: 33, trend: [0.70, 0.71, 0.71, 0.72, 0.72, 0.72, 0.72] },
    { type: 'Security Scan Failure', threshold: 0.60, overrideRate: 34, sampleSize: 22, trend: [0.70, 0.67, 0.65, 0.63, 0.62, 0.60, 0.60] },
    { type: 'Dependency Error', threshold: 0.78, overrideRate: 7, sampleSize: 14, trend: [0.75, 0.76, 0.77, 0.77, 0.78, 0.78, 0.78] },
    { type: 'Configuration Error', threshold: 0.65, overrideRate: 22, sampleSize: 8, trend: [0.68, 0.67, 0.66, 0.66, 0.65, 0.65, 0.65] },
];

export const CALIBRATION_META = {
    lastRun: '2026-03-18T00:00:00Z',
    nextRun: '2026-03-19T00:00:00Z',
};

// ── repo stats ──────────────────────────────────────────────────────────────
export const REPO_STATS: RepoStat[] = [
    { repo: 'acme/payments-api', failures: 42, topErrorType: 'Build Failure', autoFixRate: 82, memoryEntries: 47, dailyFailures: [8, 5, 7, 4, 6, 3, 9], breakdownByType: { 'Build Failure': 24, 'Dependency Error': 10, 'Test Failure': 8 } },
    { repo: 'acme/gateway', failures: 38, topErrorType: 'Security Scan Failure', autoFixRate: 42, memoryEntries: 31, dailyFailures: [4, 6, 8, 7, 5, 4, 4], breakdownByType: { 'Security Scan Failure': 22, 'Deployment Failure': 10, 'Network Error': 6 } },
    { repo: 'acme/k8s-infra', failures: 31, topErrorType: 'Deployment Failure', autoFixRate: 55, memoryEntries: 23, dailyFailures: [5, 4, 5, 4, 6, 3, 4], breakdownByType: { 'Deployment Failure': 20, 'Configuration Error': 7, 'Network Error': 4 } },
    { repo: 'acme/ml-pipeline', failures: 28, topErrorType: 'Dependency Error', autoFixRate: 71, memoryEntries: 56, dailyFailures: [3, 5, 4, 6, 4, 2, 4], breakdownByType: { 'Dependency Error': 14, 'Resource Exhaustion': 8, 'Test Failure': 6 } },
    { repo: 'acme/auth-service', failures: 22, topErrorType: 'Test Failure', autoFixRate: 90, memoryEntries: 38, dailyFailures: [3, 2, 4, 3, 4, 3, 3], breakdownByType: { 'Test Failure': 16, 'Build Failure': 4, 'Configuration Error': 2 } },
    { repo: 'acme/frontend', failures: 17, topErrorType: 'Build Failure', autoFixRate: 88, memoryEntries: 19, dailyFailures: [2, 3, 2, 3, 2, 2, 3], breakdownByType: { 'Build Failure': 12, 'Test Failure': 3, 'Timeout': 2 } },
];

// ── node performance ────────────────────────────────────────────────────────
export const NODE_PERF: NodePerf[] = [
    { node: 'log_ingestion', avgMs: 340, p95Ms: 820, tokenUsage: 1200 },
    { node: 'error_extraction', avgMs: 180, p95Ms: 460, tokenUsage: 800 },
    { node: 'memory_load', avgMs: 420, p95Ms: 980, tokenUsage: 0 },
    { node: 'classification', avgMs: 1240, p95Ms: 2800, tokenUsage: 3400 },
    { node: 'correlation', avgMs: 290, p95Ms: 640, tokenUsage: 0 },
    { node: 'retrieval', avgMs: 890, p95Ms: 2100, tokenUsage: 0 },
    { node: 'root_cause_analysis', avgMs: 2100, p95Ms: 4600, tokenUsage: 5600 },
    { node: 'fix_recommendation', avgMs: 1800, p95Ms: 3900, tokenUsage: 3900 },
    { node: 'remediation_executor', avgMs: 5400, p95Ms: 9200, tokenUsage: 0 },
    { node: 'severity_assessment', avgMs: 620, p95Ms: 1400, tokenUsage: 1100 },
    { node: 'memory_save', avgMs: 380, p95Ms: 850, tokenUsage: 0 },
    { node: 'report_generation', avgMs: 1400, p95Ms: 3200, tokenUsage: 2100 },
];

// ── auto-fix radar data per error type ─────────────────────────────────────
export const AUTO_FIX_RADAR = ERROR_TYPE_STATS.filter(e => e.count > 10).map(e => ({
    type: e.type.split(' ')[0],
    attempted: e.fixAttempted,
    success: e.fixSuccess,
    failed: e.fixAttempted - e.fixSuccess,
}));

// ── correlation events (incident lines for area chart) ──────────────────────
export const CORRELATION_EVENTS_7D = [
    { date: '3/13', label: 'INC-NETW-1742' },
    { date: '3/16', label: 'INC-DEPE-1743' },
];
