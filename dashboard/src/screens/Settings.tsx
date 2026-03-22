import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    GitBranch, Webhook, Bell, Shield, Brain, Cpu, DollarSign, Flame,
    Eye, EyeOff, Copy, Plus, X, Check, CheckCheck, Trash2, Download,
    ChevronRight, RefreshCw, Package, Timer, Loader2, Database, Search,
    Grip, ExternalLink, AlertTriangle, Lock, Users, Key,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { NODE_LABELS } from '../lib/constants';
import { RepoManager } from './RepoManager';
import { TeamMembers } from './TeamMembers';
import { NotificationSettings } from './NotificationSettings';
import { ApiKeys } from './ApiKeys';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS / MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const TOOLTIP_STYLE = {
    backgroundColor: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, color: '#A1A1B5', fontSize: 11,
};
const AXIS_STYLE = { fill: '#6B6B80', fontSize: 10 };

const REPOS = [
    { id: 'r1', name: 'acme/payments-api', status: 'healthy', runs: 247, failures: 31, days: 7, branches: 'all', autoFix: true },
    { id: 'r2', name: 'acme/gateway', status: 'degraded', runs: 134, failures: 38, days: 7, branches: 'main', autoFix: false, warnMsg: 'Webhook timeout errors detected' },
    { id: 'r3', name: 'acme/k8s-infra', status: 'error', runs: 88, failures: 31, days: 7, branches: 'main', autoFix: false, errMsg: 'HMAC validation failed: invalid secret (401)' },
];

const WEBHOOK_DELIVERIES = [
    { ts: '09:14:02', event: 'workflow_run', status: 200, size: '4.2 KB', ms: 84 },
    { ts: '09:01:44', event: 'check_run', status: 200, size: '1.8 KB', ms: 62 },
    { ts: '08:47:19', event: 'workflow_run', status: 500, size: '0.8 KB', ms: 12 },
    { ts: '08:33:55', event: 'check_suite', status: 200, size: '2.1 KB', ms: 78 },
    { ts: '07:58:30', event: 'workflow_run', status: 200, size: '5.6 KB', ms: 91 },
    { ts: '07:42:11', event: 'check_run', status: 422, size: '0.4 KB', ms: 31 },
];

const INITIAL_RULES = [
    { id: 'ru1', severity: 'critical', errorType: 'any', branch: 'main', channels: ['pagerduty', 'slack:#incidents'] },
    { id: 'ru2', severity: 'high', errorType: 'Security Scan Failure', branch: 'any', channels: ['slack:#security', 'email'] },
    { id: 'ru3', severity: 'any', errorType: 'Deployment Failure', branch: 'any', channels: ['slack:#deploys'] },
];

const CHANNEL_STYLES: Record<string, { label: string; color: string }> = {
    'pagerduty': { label: 'PagerDuty', color: '#10B981' },
    'slack:#incidents': { label: '#incidents', color: '#6366F1' },
    'slack:#security': { label: '#security', color: '#8B5CF6' },
    'slack:#deploys': { label: '#deploys', color: '#818CF8' },
    'email': { label: 'Email', color: '#F59E0B' },
    'jira': { label: 'Jira', color: '#06B6D4' },
};

const SAFE_TOOLS = ['trigger_rerun', 'clear_cache', 'notify_slack'];
const CONFIRM_TOOLS = ['bump_dependency', 'increase_timeout'];

const MEMORIES = [
    { id: 'm1', text: 'grpc-java >1.57 breaks payments-service RPC wrapper', repo: 'acme/payments-api', source: 'repo', date: 'Mar 15' },
    { id: 'm2', text: 'Team preference: always pin exact versions for grpc', repo: 'acme/payments-api', source: 'entity', date: 'Mar 14' },
    { id: 'm3', text: 'K8s OOM errors on node-pool-prod correlate with deploy failures', repo: 'acme/k8s-infra', source: 'repo', date: 'Mar 12' },
    { id: 'm4', text: 'Security scan excludes .story files and test fixtures by policy', repo: 'global', source: 'global', date: 'Mar 10' },
    { id: 'm5', text: 'Build cache invalidation required after node version upgrade', repo: 'acme/gateway', source: 'repo', date: 'Mar 9' },
];

const MODELS = [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'Premium' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'Balanced' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', tier: 'Budget' },
];

const MODEL_NODES = [
    { key: 'classification', label: 'Classification', model: 'gemini-2.5-pro', temp: 0.1, thinking: 8192 },
    { key: 'root_cause_analysis', label: 'Root Cause', model: 'gemini-2.5-pro', temp: 0.2, thinking: 16384 },
    { key: 'fix_recommendation', label: 'Fix Recommendation', model: 'gemini-2.0-flash', temp: 0.3, thinking: 4096 },
    { key: 'report_generation', label: 'Report Generation', model: 'gemini-2.0-flash', temp: 0.4, thinking: 2048 },
    { key: 'severity_assessment', label: 'Severity Assessment', model: 'gemini-2.0-flash', temp: 0.1, thinking: 1024 },
];

const DAILY_COST = Array.from({ length: 7 }, (_, i) => ({
    date: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
    pro: +(Math.random() * 1.5 + 0.5).toFixed(2),
    flash: +(Math.random() * 0.3 + 0.1).toFixed(2),
}));

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL REUSABLE PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════════ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch" aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
            style={{ background: checked ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)' }}
        >
            <motion.div
                className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                animate={{ left: checked ? 18 : 2 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            />
        </button>
    );
}

function CopyBtn({ value }: { value: string }) {
    const [done, setDone] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setDone(true); setTimeout(() => setDone(false), 2000);
    };
    return (
        <button onClick={copy} className="btn-secondary h-7 px-2 gap-1 text-xs" aria-label="Copy to clipboard">
            {done ? <CheckCheck size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
        </button>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-base font-semibold text-white mb-5" style={{ letterSpacing: '-0.01em' }}>{children}</h2>;
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="min-w-0 pr-6">
                <p className="text-sm font-medium text-white">{label}</p>
                {description && <p className="text-xs text-label mt-0.5">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1: Repositories
   ═══════════════════════════════════════════════════════════════════════════ */
function ReposSection() {
    const [repos, setRepos] = useState(REPOS);
    return (
        <div>
            <SectionTitle>Repositories</SectionTitle>
            <div className="space-y-3 mb-4">
                {repos.map(repo => {
                    const dotColor = repo.status === 'healthy' ? '#10B981' : repo.status === 'degraded' ? '#F59E0B' : '#F43F5E';
                    const borderColor = repo.status === 'error' ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.06)';
                    return (
                        <div key={repo.id} className="glass-card p-4" style={{ borderColor }}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                                    <span className="text-sm font-medium text-white font-mono">{repo.name}</span>
                                </div>
                                <button className="btn-secondary h-7 text-xs gap-1 px-2.5">
                                    <span>Configure</span><ChevronRight size={11} />
                                </button>
                            </div>
                            <p className="text-xs text-label mb-1">
                                Webhook active · {repo.runs} runs · {repo.failures} failures · {repo.days} days
                            </p>
                            <p className="text-xs text-label">
                                Branches: <span className="text-white">{repo.branches}</span>
                                {' · '}Auto-fix: <span style={{ color: repo.autoFix ? '#10B981' : '#6B6B80' }}>{repo.autoFix ? 'enabled' : 'disabled'}</span>
                            </p>
                            {repo.errMsg && (
                                <div className="mt-3 flex items-center justify-between p-2 rounded-lg"
                                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
                                    <code className="text-xs font-mono" style={{ color: '#FB7185' }}>{repo.errMsg}</code>
                                    <button className="btn-secondary h-6 px-2 text-xs ml-2 shrink-0" style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#F43F5E' }}>
                                        Reconnect
                                    </button>
                                </div>
                            )}
                            {repo.warnMsg && (
                                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#F59E0B' }}>
                                    <AlertTriangle size={10} />{repo.warnMsg}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            <button className="btn-secondary gap-2 text-sm">
                <Plus size={14} /><span>Add repository</span>
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2: Webhook config
   ═══════════════════════════════════════════════════════════════════════════ */
function WebhookSection() {
    const [show, setShow] = useState(false);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [events, setEvents] = useState({ workflow_run: true, check_run: true, check_suite: false });
    const url = 'https://pipelineiq.example.com/webhooks/ingest';
    const secret = 'whsec_a3k9Xf2mBqLpR8nYvD5cZ7tW1eUiOs4jGhN6';

    return (
        <div>
            <SectionTitle>Webhook Config</SectionTitle>
            <div className="space-y-4">
                <Card className="p-4">
                    <p className="label-text mb-2">Endpoint URL</p>
                    <div className="flex gap-2 items-center">
                        <div className="code-block flex-1 py-2 px-3 text-xs font-mono text-white break-all">{url}</div>
                        <CopyBtn value={url} />
                    </div>
                </Card>
                <Card className="p-4">
                    <p className="label-text mb-2">HMAC Secret</p>
                    <div className="flex gap-2 items-center">
                        <div className="code-block flex-1 py-2 px-3 text-xs font-mono tracking-wider"
                            style={{ color: '#6B6B80' }}>
                            {show ? secret : '•'.repeat(40)}
                        </div>
                        <button className="btn-secondary h-8 w-8 p-0 justify-center" onClick={() => setShow(!show)} aria-label={show ? 'Hide secret' : 'Reveal secret'}>
                            {show ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <CopyBtn value={secret} />
                    </div>
                </Card>
                <Card className="p-4">
                    <p className="label-text mb-3">Event Filters</p>
                    <div className="flex gap-4">
                        {(Object.keys(events) as (keyof typeof events)[]).map(ev => (
                            <label key={ev} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                                <input type="checkbox" checked={events[ev]} onChange={e => setEvents(s => ({ ...s, [ev]: e.target.checked }))}
                                    className="w-3.5 h-3.5 rounded accent-indigo-500" />
                                <code className="text-xs font-mono">{ev}</code>
                            </label>
                        ))}
                    </div>
                </Card>
                <Card className="p-4">
                    <p className="label-text mb-3">Recent Deliveries</p>
                    <div className="space-y-1">
                        {WEBHOOK_DELIVERIES.map((d, i) => (
                            <div key={i}>
                                <button
                                    onClick={() => setExpanded(expanded === i ? null : i)}
                                    className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                                >
                                    <span className="font-mono text-xs text-label w-14 shrink-0">{d.ts}</span>
                                    <code className="text-xs font-mono flex-1 text-muted">{d.event}</code>
                                    <span className="font-mono text-xs shrink-0 font-medium"
                                        style={{ color: d.status === 200 ? '#10B981' : '#F43F5E' }}>{d.status}</span>
                                    <span className="text-xs text-label shrink-0 w-12 text-right">{d.size}</span>
                                    <span className="text-xs text-label shrink-0 w-10 text-right">{d.ms}ms</span>
                                    <ChevronRight size={11} className="text-label shrink-0 transition-transform"
                                        style={{ transform: expanded === i ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                </button>
                                <AnimatePresence>
                                    {expanded === i && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                            <div className="mx-3 mb-2 p-3 rounded-lg text-xs font-mono text-label"
                                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <p>X-GitHub-Event: {d.event}</p>
                                                <p>X-Hub-Signature-256: sha256=a3f8...</p>
                                                <p style={{ color: d.status === 200 ? '#10B981' : '#F43F5E' }}>HTTP {d.status} · {d.ms}ms</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}



/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4: Remediation gates
   ═══════════════════════════════════════════════════════════════════════════ */
function RemediationSection() {
    const [safeToggles, setSafeToggles] = useState<Record<string, boolean>>(
        Object.fromEntries(SAFE_TOOLS.map(t => [t, true]))
    );
    const [confirmToggles, setConfirmToggles] = useState<Record<string, boolean>>(
        Object.fromEntries(CONFIRM_TOOLS.map(t => [t, true]))
    );
    const [approver, setApprover] = useState('any');

    const TOOL_LABELS: Record<string, string> = {
        trigger_rerun: 'Trigger pipeline re-run', clear_cache: 'Clear build cache',
        notify_slack: 'Notify Slack', bump_dependency: 'Bump dependency version',
        increase_timeout: 'Increase job timeout',
    };
    const TOOL_ICONS: Record<string, typeof RefreshCw> = {
        trigger_rerun: RefreshCw, clear_cache: Trash2, notify_slack: Bell,
        bump_dependency: Package, increase_timeout: Timer,
    };

    const zone = (
        title: string, desc: string, bg: string, border: string, textColor: string,
        children: React.ReactNode
    ) => (
        <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: textColor }}>{title}</p>
            <p className="text-xs text-label mb-4">{desc}</p>
            {children}
        </div>
    );

    return (
        <div>
            <SectionTitle>Remediation Gates</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {zone('Safe to auto-execute', 'Non-main · severity low/medium',
                    'rgba(16,185,129,0.04)', 'rgba(16,185,129,0.2)', '#10B981',
                    <div className="space-y-3">
                        {SAFE_TOOLS.map(t => {
                            const Icon = TOOL_ICONS[t] ?? RefreshCw;
                            return (
                                <div key={t} className="flex items-center gap-2">
                                    <Icon size={12} style={{ color: '#10B981' }} className="shrink-0" />
                                    <span className="text-xs text-muted flex-1 truncate">{TOOL_LABELS[t]}</span>
                                    <Toggle checked={safeToggles[t]} onChange={v => setSafeToggles(s => ({ ...s, [t]: v }))} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {zone('Requires confirmation', 'Main branch · severity high',
                    'rgba(245,158,11,0.04)', 'rgba(245,158,11,0.2)', '#F59E0B',
                    <div className="space-y-3">
                        {CONFIRM_TOOLS.map(t => {
                            const Icon = TOOL_ICONS[t] ?? Package;
                            return (
                                <div key={t} className="flex items-center gap-2">
                                    <Icon size={12} style={{ color: '#F59E0B' }} className="shrink-0" />
                                    <span className="text-xs text-muted flex-1 truncate">{TOOL_LABELS[t]}</span>
                                    <Toggle checked={confirmToggles[t]} onChange={v => setConfirmToggles(s => ({ ...s, [t]: v }))} />
                                </div>
                            );
                        })}
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
                            <p className="text-xs text-label mb-1.5">Who can approve</p>
                            <select className="input-base text-xs h-7 py-0" value={approver} onChange={e => setApprover(e.target.value)}>
                                {['any', 'senior engineers only', 'admin only'].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>
                )}
                {zone('Never auto-execute', 'Critical severity · security failures',
                    'rgba(244,63,94,0.04)', 'rgba(244,63,94,0.2)', '#F43F5E',
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Lock size={12} style={{ color: '#F43F5E' }} />
                            <span className="text-xs" style={{ color: '#FB7185' }}>Always routes to human review</span>
                        </div>
                        <div className="p-3 rounded-lg text-xs text-label" style={{ background: 'rgba(244,63,94,0.06)' }}>
                            <p>✗ All auto-execution disabled</p>
                            <p className="mt-1">✗ No tool calls permitted</p>
                            <p className="mt-1">✓ Immediate reviewer notification</p>
                            <p className="mt-1">✓ PagerDuty if configured</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5: Memory management
   ═══════════════════════════════════════════════════════════════════════════ */
function MemorySection() {
    const [query, setQuery] = useState('');
    const [delConfirm, setDelConfirm] = useState<string | null>(null);
    const filtered = MEMORIES.filter(m =>
        !query || m.text.toLowerCase().includes(query.toLowerCase()) || m.repo.includes(query)
    );
    const srcColor = (src: string) => src === 'repo' ? '#6366F1' : src === 'entity' ? '#F59E0B' : '#10B981';
    const storageUsed = 47;

    return (
        <div>
            <SectionTitle>Memory Management</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Stats */}
                <Card className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[['Total', '216'], ['Repo', '134'], ['Global', '82']].map(([l, v]) => (
                            <div key={l} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <p className="text-xs text-label">{l}</p>
                                <p className="text-lg font-semibold text-white font-mono">{v}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-label mb-1.5">
                            <span>Storage used</span>
                            <span className="font-mono">{storageUsed} MB / 500 MB</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div className="h-full rounded-full" style={{ width: `${(storageUsed / 500) * 100}%`, background: '#6366F1' }}
                                initial={{ width: 0 }} animate={{ width: `${(storageUsed / 500) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                    </div>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-label">Last mem0 sync</span>
                            <span className="font-mono text-muted">2026-03-18 09:00 UTC</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-label">Vector store (Qdrant)</span>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />connected
                            </span>
                        </div>
                    </div>
                    <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <button className="btn-secondary text-xs gap-1.5 w-full justify-center h-8">
                            <RefreshCw size={11} />Recalibrate thresholds now
                        </button>
                        <p className="text-center text-xs text-label mt-1.5">Last run: Mar 18 00:00 UTC</p>
                    </div>
                </Card>
                {/* Browser */}
                <Card className="p-4">
                    <div className="relative mb-3">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-label" />
                        <input className="input-base pl-8 h-8 text-xs" placeholder="Search memories…"
                            value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        <AnimatePresence>
                            {filtered.map((m, i) => (
                                <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }} transition={{ delay: i * 0.04 }}
                                    className="p-3 rounded-lg group" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <p className="text-xs text-muted leading-relaxed mb-2">{m.text}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono" style={{ color: srcColor(m.source) }}>{m.source}</span>
                                        <span className="text-xs text-label">{m.repo}</span>
                                        <span className="text-xs text-label ml-auto">{m.date}</span>
                                        <button onClick={() => setDelConfirm(delConfirm === m.id ? null : m.id)}
                                            className="opacity-0 group-hover:opacity-100 text-xs transition-opacity"
                                            style={{ color: delConfirm === m.id ? '#F43F5E' : '#6B6B80' }}>
                                            {delConfirm === m.id ? 'Confirm' : <Trash2 size={11} />}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <button className="btn-secondary text-xs h-7 px-2.5 gap-1 flex-1 justify-center">
                            <Trash2 size={11} />Clear repo
                        </button>
                        <button className="btn-secondary text-xs h-7 px-2.5 gap-1 flex-1 justify-center">
                            <Download size={11} />Export JSON
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6: Model configuration
   ═══════════════════════════════════════════════════════════════════════════ */
function ModelSection() {
    const [nodes, setNodes] = useState(MODEL_NODES.map(n => ({ ...n })));
    const tempLabel = (t: number) => t <= 0.15 ? 'Very deterministic' : t <= 0.4 ? 'Conservative' : t <= 0.7 ? 'Balanced' : 'Creative';
    const update = (i: number, field: string, val: unknown) => {
        setNodes(prev => prev.map((n, j) => j === i ? { ...n, [field]: val } : n));
    };

    return (
        <div>
            <SectionTitle>Model Configuration</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
                {nodes.map((n, i) => (
                    <Card key={n.key} className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-white">{n.label}</p>
                        <div>
                            <p className="label-text mb-1.5" style={{ fontSize: 9 }}>Model</p>
                            <select className="input-base text-xs h-8 py-0" value={n.model}
                                onChange={e => update(i, 'model', e.target.value)}>
                                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.tier}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="label-text" style={{ fontSize: 9 }}>Temperature</p>
                                <span className="text-xs font-mono text-white">{n.temp.toFixed(1)}</span>
                            </div>
                            <input type="range" min={0} max={1} step={0.05} value={n.temp}
                                onChange={e => update(i, 'temp', parseFloat(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: '#6366F1' }} aria-label={`Temperature for ${n.label}`} />
                            <p className="text-xs text-label mt-1">{tempLabel(n.temp)}</p>
                        </div>
                        <div>
                            <p className="label-text mb-1" style={{ fontSize: 9 }}>Thinking tokens</p>
                            <p className="text-xs font-mono text-muted">{n.thinking.toLocaleString()}</p>
                        </div>
                    </Card>
                ))}
            </div>
            <button className="btn-secondary text-xs gap-1.5 h-8 px-3">
                <RefreshCw size={11} />Reset to defaults
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7: Cost & budgets
   ═══════════════════════════════════════════════════════════════════════════ */
function CostSection() {
    const [daily, setDaily] = useState(15);
    const totalUsed = DAILY_COST.reduce((a, d) => a + d.pro + d.flash, 0);
    const pct = (totalUsed / daily) * 100;

    return (
        <div>
            <SectionTitle>Cost & Budgets</SectionTitle>
            <div className="space-y-5">
                <Card className="p-5">
                    <p className="label-text mb-3">Daily Token Cost</p>
                    <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={DAILY_COST} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v}`, '']} />
                            <Area type="monotone" dataKey="pro" name="Gemini 2.5 Pro" stackId="c" stroke="#8B5CF6" fill="url(#cp)" strokeWidth={1.5} dot={false} />
                            <Area type="monotone" dataKey="flash" name="Gemini 2.0 Flash" stackId="c" stroke="#6366F1" fill="url(#cf)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="label-text">Global Daily Budget</p>
                        <span className="text-sm font-mono font-semibold text-white">${totalUsed.toFixed(2)} / ${daily}</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#F43F5E' : pct >= 80 ? '#F59E0B' : '#6366F1' }} />
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <label className="text-xs text-label">Daily limit ($)</label>
                        <input type="number" className="input-base h-7 w-24 text-xs text-right" value={daily}
                            onChange={e => setDaily(Number(e.target.value))} min={1} />
                        <span className="text-xs text-label">· Fallback to</span>
                        <select className="input-base h-7 text-xs flex-1">
                            <option>gemini-2.0-flash-lite</option>
                            <option>gemini-2.0-flash</option>
                        </select>
                    </div>
                </Card>
                <div className="flex justify-end">
                    <button className="btn-secondary text-xs h-8 px-3 gap-1.5">
                        <Download size={11} />Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 8: Danger zone
   ═══════════════════════════════════════════════════════════════════════════ */
type DangerAction = { key: string; label: string; desc: string; word: string };
const DANGER_ACTIONS: DangerAction[] = [
    { key: 'purge', label: 'Purge all memories', desc: 'Clears the entire mem0 store. Cannot be undone.', word: 'PURGE' },
    { key: 'reset', label: 'Reset calibration data', desc: 'All thresholds revert to their factory defaults.', word: 'RESET' },
    { key: 'revoke', label: 'Revoke all webhooks', desc: 'Disconnects every connected repository immediately.', word: 'REVOKE' },
];

function DangerSection() {
    const [active, setActive] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [done, setDone] = useState<string | null>(null);

    const execute = (word: string, key: string) => {
        if (input.toUpperCase() !== word) return;
        setDone(key); setActive(null); setInput('');
        setTimeout(() => setDone(null), 3000);
    };

    return (
        <div>
            <SectionTitle>Danger Zone</SectionTitle>
            <div className="rounded-xl p-5 space-y-0 divide-y divide-rose-900/30"
                style={{ background: 'rgba(244,63,94,0.03)', border: '1px solid rgba(244,63,94,0.2)' }}>
                {DANGER_ACTIONS.map(action => (
                    <div key={action.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div>
                            <p className="text-sm font-medium text-white">{action.label}</p>
                            <p className="text-xs text-label mt-0.5">{action.desc}</p>
                            {done === action.key && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs mt-1 flex items-center gap-1"
                                    style={{ color: '#10B981' }}>
                                    <CheckCheck size={11} />Action completed
                                </motion.p>
                            )}
                        </div>
                        <div className="ml-4">
                            {active !== action.key ? (
                                <button onClick={() => { setActive(action.key); setInput(''); }}
                                    className="btn-secondary text-xs h-8 px-3 gap-1 shrink-0"
                                    style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#F43F5E' }}>
                                    <Flame size={12} />{action.label.split(' ').slice(0, 2).join(' ')}
                                </button>
                            ) : (
                                <AnimatePresence>
                                    <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            className="input-base h-8 text-xs w-28 font-mono"
                                            placeholder={`Type ${action.word}`}
                                            value={input} onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') execute(action.word, action.key); if (e.key === 'Escape') setActive(null); }}
                                            aria-label={`Type ${action.word} to confirm`}
                                            style={{ borderColor: input.toUpperCase() === action.word ? '#F43F5E' : 'rgba(255,255,255,0.1)' }}
                                        />
                                        <button onClick={() => execute(action.word, action.key)}
                                            disabled={input.toUpperCase() !== action.word}
                                            className="h-8 px-3 rounded-lg text-xs font-medium text-white transition-all"
                                            style={{ background: input.toUpperCase() === action.word ? '#F43F5E' : 'rgba(255,255,255,0.05)', opacity: input.toUpperCase() === action.word ? 1 : 0.4 }}>
                                            Confirm
                                        </button>
                                        <button onClick={() => setActive(null)} className="btn-secondary h-8 w-8 p-0 justify-center">
                                            <X size={12} />
                                        </button>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
    { key: 'repos', label: 'Repositories', Icon: GitBranch },
    { key: 'webhook', label: 'Webhook Config', Icon: Webhook },
    { key: 'apiKeys', label: 'API Keys', Icon: Key },
    { key: 'team', label: 'Team Members', Icon: Users },
    { key: 'notifications', label: 'Notifications', Icon: Bell },
    { key: 'gates', label: 'Remediation Gates', Icon: Shield },
    { key: 'memory', label: 'Memory Management', Icon: Brain },
    { key: 'model', label: 'Model Config', Icon: Cpu },
    { key: 'danger', label: 'Danger Zone', Icon: Flame },
];

const SECTIONS: Record<string, () => JSX.Element> = {
    repos: RepoManager, webhook: WebhookSection, team: TeamMembers,
    apiKeys: ApiKeys, notifications: NotificationSettings, gates: RemediationSection,
    memory: MemorySection, model: ModelSection,
    danger: DangerSection,
};

export function Settings() {
    const [active, setActive] = useState('repos');
    const ActiveSection = SECTIONS[active];

    return (
        <div className="max-w-5xl mx-auto flex gap-6 min-h-[80vh]">
            {/* ── LEFT NAV ──────────────────────────────────────────────────── */}
            <nav className="w-44 shrink-0 sticky top-20 self-start" aria-label="Settings navigation">
                <p className="label-text px-2 mb-3">Settings</p>
                <div className="space-y-0.5">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActive(item.key)}
                            className={`nav-item w-full text-left gap-2 ${active === item.key ? 'active' : ''}`}
                            aria-current={active === item.key ? 'page' : undefined}
                            style={item.key === 'danger' && active !== item.key ? { color: '#F43F5E', opacity: 0.6 } :
                                item.key === 'danger' && active === item.key ? { color: '#F43F5E' } : {}}
                        >
                            <item.Icon size={13} className="shrink-0" />
                            <span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── CONTENT ───────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={active}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <ActiveSection />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
