import type { ErrorType, Severity } from '../types/pipeline';

export const ERROR_TYPE_COLORS: Record<ErrorType, { bg: string; text: string; border: string; glow: string }> = {
    'Build Failure': { bg: 'rgba(99,102,241,0.15)', text: '#818CF8', border: 'rgba(99,102,241,0.3)', glow: 'rgba(99,102,241,0.2)' },
    'Configuration Error': { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.2)' },
    'Dependency Error': { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA', border: 'rgba(139,92,246,0.3)', glow: 'rgba(139,92,246,0.2)' },
    'Deployment Failure': { bg: 'rgba(244,63,94,0.15)', text: '#FB7185', border: 'rgba(244,63,94,0.3)', glow: 'rgba(244,63,94,0.2)' },
    'Network Error': { bg: 'rgba(6,182,212,0.15)', text: '#67E8F9', border: 'rgba(6,182,212,0.3)', glow: 'rgba(6,182,212,0.2)' },
    'Permission Error': { bg: 'rgba(249,115,22,0.15)', text: '#FCA27A', border: 'rgba(249,115,22,0.3)', glow: 'rgba(249,115,22,0.2)' },
    'Resource Exhaustion': { bg: 'rgba(236,72,153,0.15)', text: '#F472B6', border: 'rgba(236,72,153,0.3)', glow: 'rgba(236,72,153,0.2)' },
    'Security Scan Failure': { bg: 'rgba(244,63,94,0.2)', text: '#F43F5E', border: 'rgba(244,63,94,0.5)', glow: 'rgba(244,63,94,0.3)' },
    'Test Failure': { bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.2)' },
    'Timeout': { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF', border: 'rgba(156,163,175,0.3)', glow: 'rgba(156,163,175,0.2)' },
};

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; pulse: string }> = {
    critical: { bg: 'rgba(244,63,94,0.2)', text: '#F43F5E', pulse: '#F43F5E' },
    high: { bg: 'rgba(249,115,22,0.15)', text: '#FB923C', pulse: '#FB923C' },
    medium: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', pulse: '#FBBF24' },
    low: { bg: 'rgba(16,185,129,0.12)', text: '#34D399', pulse: '#34D399' },
};

export const NODE_ORDER = [
    'log_ingestion', 'error_extraction', 'memory_load', 'classification',
    'correlation', 'retrieval', 'root_cause_analysis', 'fix_recommendation',
    'remediation_executor', 'severity_assessment', 'memory_save', 'report_generation',
];

export const NODE_LABELS: Record<string, string> = {
    log_ingestion: 'Log Ingestion',
    error_extraction: 'Error Extraction',
    memory_load: 'Memory Load',
    classification: 'Classification',
    correlation: 'Correlation',
    retrieval: 'Retrieval',
    root_cause_analysis: 'Root Cause',
    fix_recommendation: 'Fix Recommendation',
    remediation_executor: 'Auto-Remediation',
    severity_assessment: 'Severity',
    memory_save: 'Memory Save',
    report_generation: 'Report Generation',
};

export const STATUS_LABELS: Record<string, string> = {
    ingesting: 'Ingesting',
    extracting: 'Extracting',
    classifying: 'Classifying',
    retrieving: 'Retrieving',
    analyzing: 'Analyzing',
    fixing: 'Generating Fix',
    assessing: 'Assessing',
    paused_review: 'Awaiting Review',
    remediating: 'Remediating',
    reporting: 'Reporting',
    completed: 'Completed',
    failed: 'Failed',
};

export const REPOS = [
    'acme/payments-api', 'acme/auth-service', 'acme/frontend',
    'acme/ml-pipeline', 'acme/data-processor', 'acme/k8s-infra',
    'acme/gateway', 'acme/backend', 'acme/notification-svc',
];

export const BRANCHES = ['main', 'develop', 'feat/auth-v2', 'fix/memory-leak', 'release/2.1', 'chore/deps'];
export const STAGES = ['build', 'test', 'deploy', 'scan', 'install', 'validate'];
export const ERROR_TYPES: ErrorType[] = [
    'Build Failure', 'Configuration Error', 'Dependency Error', 'Deployment Failure',
    'Network Error', 'Permission Error', 'Resource Exhaustion', 'Security Scan Failure',
    'Test Failure', 'Timeout',
];
