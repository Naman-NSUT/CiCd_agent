import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useRun, useRuns } from '../hooks/usePipelineData';
import { useCountUp } from '../hooks/useCountUp';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
    ChevronLeft, GitBranch, Clock, Hash, CheckCircle2, XCircle,
    Loader2, Circle, RefreshCw, Package, Trash2, Timer, Bell,
    Shield, Copy, ChevronDown, ChevronUp, Link2, Brain, Database,
    FileText, Sparkles, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
    ERROR_TYPE_COLORS, SEVERITY_COLORS, NODE_ORDER, NODE_LABELS, STATUS_LABELS,
} from '../lib/constants';
import type { PipelineRun, RemediationAction, SimilarCase, MemoryItem } from '../types/pipeline';

const MOCK_AUTH = {
    workspaceId: 'ws_123',
    workspaceName: 'Acme Corp',
    plan: 'free',
};

/* ═══════════════════════════════════════════════════════════════════════════
   ARC GAUGE (SVG confidence ring)
   ═══════════════════════════════════════════════════════════════════════════ */
function ArcGauge({ value, size = 40 }: { value: number; size?: number }) {
    const animated = useCountUp(Math.round(value * 100), 800);
    const r = (size - 4) / 2;
    const circumference = 2 * Math.PI * r;
    const strokeDash = circumference * value;
    const color = value >= 0.85 ? '#10B981' : value >= 0.7 ? '#F59E0B' : '#F43F5E';
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={3} strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - strokeDash }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    strokeDasharray={circumference}
                />
            </svg>
            <span className="absolute text-xs font-semibold font-mono" style={{ color }}>
                {animated}%
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HORIZONTAL NODE TIMELINE
   ═══════════════════════════════════════════════════════════════════════════ */
function HorizontalTimeline({ currentNode, status }: { currentNode?: string; status?: string }) {
    const currentIdx = currentNode ? NODE_ORDER.indexOf(currentNode) : (status === 'completed' ? NODE_ORDER.length : -1);
    return (
        <div className="flex items-center gap-1 overflow-x-auto py-3 px-1" role="list" aria-label="Node pipeline">
            {NODE_ORDER.map((node, idx) => {
                const isDone = idx < currentIdx || status === 'completed';
                const isCurrent = idx === currentIdx && status !== 'completed' && status !== 'failed';
                const isFailed = status === 'failed' && idx === currentIdx;
                return (
                    <motion.div
                        key={node}
                        role="listitem"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className="flex items-center gap-1 shrink-0"
                    >
                        <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-default
                          ${isDone ? 'bg-indigo-500/15 text-indigo-400' : isCurrent ? 'bg-indigo-500/20 text-white' : isFailed ? 'bg-rose-500/15 text-rose-400' : 'text-label'}`}
                            style={{ border: `1px solid ${isDone ? 'rgba(99,102,241,0.2)' : isCurrent ? 'rgba(99,102,241,0.4)' : isFailed ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.06)'}`, fontSize: 10 }}
                        >
                            {isDone && <CheckCircle2 size={10} />}
                            {isCurrent && (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <Loader2 size={10} />
                                </motion.div>
                            )}
                            {isFailed && <XCircle size={10} />}
                            {!isDone && !isCurrent && !isFailed && <Circle size={10} />}
                            {NODE_LABELS[node]?.slice(0, 10) ?? node}
                        </div>
                        {idx < NODE_ORDER.length - 1 && (
                            <div className="w-3 h-px shrink-0" style={{ background: isDone ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)' }} />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOL ICON MAP
   ═══════════════════════════════════════════════════════════════════════════ */
const TOOL_ICONS: Record<string, typeof RefreshCw> = {
    trigger_pipeline_rerun: RefreshCw,
    bump_dependency_version: Package,
    clear_cache: Trash2,
    increase_job_timeout: Timer,
    notify_slack: Bell,
};

const TOOL_LABELS: Record<string, string> = {
    trigger_pipeline_rerun: 'Trigger Pipeline Re-run',
    bump_dependency_version: 'Bump Dependency Version',
    clear_cache: 'Clear Build Cache',
    increase_job_timeout: 'Increase Job Timeout',
    notify_slack: 'Notify Slack',
};

/* ═══════════════════════════════════════════════════════════════════════════
   REMEDIATION PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function RemediationPanel({ actions }: { actions: RemediationAction[] }) {
    return (
        <Card className="p-5">
            <h3 className="label-text mb-4 flex items-center gap-2">
                <Sparkles size={12} style={{ color: '#8B5CF6' }} />
                Remediation Actions
            </h3>
            <div className="space-y-2.5">
                {actions.map((action, i) => {
                    const Icon = TOOL_ICONS[action.tool] ?? RefreshCw;
                    const statusColor = action.status === 'success' ? '#10B981' : action.status === 'failed' ? '#F43F5E' : '#6B6B80';
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${statusColor}15`, color: statusColor }}>
                                <Icon size={13} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-white">{TOOL_LABELS[action.tool] ?? action.tool}</span>
                                <span className="text-xs text-label ml-2 font-mono">
                                    {Object.entries(action.args).map(([k, v]) => `${k}=${String(v)}`).join(', ')}
                                </span>
                            </div>
                            <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ background: `${statusColor}15`, color: statusColor, fontSize: 10 }}>
                                {action.status === 'success' && <CheckCircle2 size={9} />}
                                {action.status === 'failed' && <XCircle size={9} />}
                                {action.status}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MEMORY CONTEXT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function MemoryPanel({ items }: { items: MemoryItem[] }) {
    const sourceIcon: Record<string, typeof Database> = { 'repo memory': Database, 'global memory': Brain, 'entity memory': FileText };
    const sourceColor: Record<string, string> = { 'repo memory': '#6366F1', 'global memory': '#10B981', 'entity memory': '#F59E0B' };
    return (
        <Card className="p-5">
            <h3 className="label-text mb-4 flex items-center gap-2">
                <Brain size={12} style={{ color: '#10B981' }} />
                Loaded from mem0
            </h3>
            <div className="space-y-3">
                {items.map((item, i) => {
                    const SrcIcon = sourceIcon[item.source] ?? Brain;
                    const color = sourceColor[item.source] ?? '#6366F1';
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${color}` }}
                        >
                            <p className="text-xs text-muted leading-relaxed mb-2">{item.text}</p>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs" style={{ color }}>
                                    <SrcIcon size={10} />
                                    {item.source}
                                </span>
                                <span className="font-mono text-xs text-label">{Math.round(item.confidence * 100)}%</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMILAR CASES TABLE
   ═══════════════════════════════════════════════════════════════════════════ */
function SimilarCasesTable({ cases }: { cases: SimilarCase[] }) {
    return (
        <Card className="p-5">
            <h3 className="label-text mb-4">Similar Past Failures</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-label border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <th className="text-left py-2 font-medium">Repo</th>
                            <th className="text-left py-2 font-medium">Error Type</th>
                            <th className="text-left py-2 font-medium">Root Cause</th>
                            <th className="text-left py-2 font-medium">Fix</th>
                            <th className="text-right py-2 font-medium">Match</th>
                            <th className="text-right py-2 font-medium">Resolved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map((c, i) => {
                            const matchColor = c.similarityScore >= 0.9 ? '#10B981' : c.similarityScore >= 0.7 ? '#F59E0B' : '#9CA3AF';
                            return (
                                <motion.tr
                                    key={i}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="border-b hover:bg-white/[0.02] transition-colors"
                                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                >
                                    <td className="py-2.5 text-white font-medium pr-3">{c.repo}</td>
                                    <td className="py-2.5 pr-3"><ErrorTypeBadge type={c.errorType} /></td>
                                    <td className="py-2.5 text-muted pr-3 max-w-40 truncate">{c.rootCause}</td>
                                    <td className="py-2.5 text-muted pr-3 max-w-40 truncate">{c.fixApplied}</td>
                                    <td className="py-2.5 text-right pr-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${c.similarityScore * 100}%`, background: matchColor }} />
                                            </div>
                                            <span className="font-mono" style={{ color: matchColor }}>{Math.round(c.similarityScore * 100)}%</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-right font-mono text-label">{(c.resolvedInMs / 1000).toFixed(0)}s</td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAW LOG VIEWER
   ═══════════════════════════════════════════════════════════════════════════ */
function RawLogViewer({ log }: { log: PipelineRun['rawLogCompressed'] }) {
    const [open, setOpen] = useState(false);
    if (!log) return null;

    function lineColor(line: string) {
        if (line.includes('[ERROR]')) return '#F43F5E';
        if (line.includes('[WARN]')) return '#F59E0B';
        return '#6B6B80';
    }

    return (
        <Card className="overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                aria-expanded={open}
                aria-label="Toggle raw log viewer"
            >
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-label" />
                    <span className="text-sm font-medium text-white">Raw Log</span>
                    <span className="text-xs text-label font-mono ml-2">
                        {log.originalLines.toLocaleString()} lines → {log.templates} templates ({log.reduction} reduction)
                    </span>
                </div>
                {open ? <ChevronUp size={14} className="text-label" /> : <ChevronDown size={14} className="text-label" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5">
                            <div className="code-block max-h-80 overflow-y-auto">
                                {log.lines.map((line, i) => (
                                    <div key={i} className="py-0.5" style={{ color: lineColor(line) }}>
                                        <span className="text-label mr-3 select-none" style={{ fontSize: 10 }}>{(i + 1).toString().padStart(3, ' ')}</span>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function ShareModal({ open, onClose, runId, plan }: { open: boolean, onClose: () => void, runId: string, plan: string }) {
    const [toggled, setToggled] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const isFree = plan === 'free';
    const link = `https://pipelineiq.app/ws_123/run/${runId}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><XCircle size={20} /></button>
                <h2 className="text-xl font-semibold text-white mb-1 tracking-tight">Share report</h2>
                <p className="text-sm text-slate-400 mb-6">Workspace members only by default</p>

                <div className="flex items-center gap-2 mb-6">
                    <input
                        readOnly
                        value={link}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(link);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-white text-slate-900 font-medium px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                </div>

                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-4">
                    <div className="mt-0.5">
                        <div
                            className={`w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${toggled && !isFree ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            onClick={() => !isFree && setToggled(!toggled)}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${toggled && !isFree ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-white select-none">Allow anyone with link</label>
                            {isFree && <span className="bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide border border-amber-500/20">PRO</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Useful for sharing with external contractors or appending to support tickets.</p>

                        {isFree && (
                            <div className="mt-3 py-2 px-3 bg-amber-500/5 border border-amber-500/10 rounded text-xs text-amber-500/90 font-medium flex items-center justify-between">
                                <span>Upgrade to Pro to enable external sharing.</span>
                                <a href="/settings" className="underline hover:text-amber-400 transition-colors">Upgrade now</a>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export function RunDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { workspaceId, workspaceName, plan } = MOCK_AUTH;
    const { data: runs } = useRuns(workspaceId);
    const runId = id === 'latest' ? runs?.[0]?.id : id;
    const { data: run, isLoading } = useRun(runId ?? '', workspaceId);
    const [showFullReasoning, setShowFullReasoning] = useState(false);
    const [copiedFix, setCopiedFix] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Loader2 size={24} className="text-indigo-400" />
                </motion.div>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="max-w-2xl mx-auto mt-20 text-center animate-fade-in py-16 px-8 bg-white/5 border border-dashed border-slate-700/60 rounded-3xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                    This run doesn't exist in your current workspace
                </h2>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                    Are you sure you're in the right workspace? Try switching to the workspace this run belongs to.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                        Back to feed
                    </button>
                    <button className="px-5 py-2.5 rounded-lg text-sm font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all flex items-center justify-center gap-2">
                        Switch Workspace <ChevronDown size={14} />
                    </button>
                </div>
            </div>
        );
    }

    const isActive = !['completed', 'failed'].includes(run.status);
    const elapsed = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : `${Math.round((Date.now() - run.startedAt.getTime()) / 1000)}s`;
    const errorColors = run.errorType ? ERROR_TYPE_COLORS[run.errorType] : null;

    const outcomeLabel = run.status === 'completed' ? 'Auto-fixed' : run.status === 'failed' ? 'Failed' : run.status === 'paused_review' ? 'Pending Review' : 'In Progress';
    const outcomeColor = run.status === 'completed' ? '#10B981' : run.status === 'failed' ? '#F43F5E' : run.status === 'paused_review' ? '#F59E0B' : '#6366F1';

    const copyFixSteps = async () => {
        if (run.fixSteps) {
            await navigator.clipboard.writeText(run.fixSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'));
            setCopiedFix(true);
            setTimeout(() => setCopiedFix(false), 2000);
        }
    };

    const reasoning = run.modelReasoning ?? '';
    const shortReasoning = reasoning.length > 250 ? reasoning.slice(0, 250) + '…' : reasoning;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6 rounded-2xl p-6 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.03) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="btn-secondary h-7 w-7 p-0 justify-center absolute top-4 left-4"
                    aria-label="Go back"
                >
                    <ChevronLeft size={14} />
                </button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pl-10 pr-2">
                    {/* Left: identity */}
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-semibold text-white tracking-tight mb-3 flex flex-wrap items-center gap-2">
                            <span className="text-slate-400 font-normal">{workspaceName}</span>
                            <span className="text-slate-600 font-light">/</span>
                            <span>{run.repo.split('/')[1] || run.repo}</span>
                            <span className="text-slate-600 font-light">/</span>
                            <span className="text-indigo-400 font-mono text-lg flex items-center gap-1"><Hash size={16} />{run.runId}</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <GitBranch size={10} />{run.branch}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ background: 'rgba(255,255,255,0.05)', color: '#A1A1B5', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {run.stage} stage
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-label">
                            <span className="flex items-center gap-1 font-mono"><Hash size={10} />{run.runId}</span>
                            <span className="flex items-center gap-1"><Clock size={10} />{formatDistanceToNow(run.startedAt, { addSuffix: true })} · {elapsed} total</span>
                        </div>
                    </div>

                    {/* Right: stat chips & Share */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="flex items-center gap-3 w-full justify-end">
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="h-8 flex items-center gap-1.5 px-3 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white mb-1"
                            >
                                <ExternalLink size={13} className="text-slate-400" /> Share report
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
                            {run.errorType && <ErrorTypeBadge type={run.errorType} />}
                            {run.severity && <Badge label={run.severity.toUpperCase()} severity={run.severity} />}
                            {run.confidenceScore !== undefined && <ArcGauge value={run.confidenceScore} />}
                            <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{ background: `${outcomeColor}15`, color: outcomeColor, border: `1px solid ${outcomeColor}30` }}>
                                {run.status === 'completed' && <CheckCircle2 size={10} />}
                                {run.status === 'failed' && <XCircle size={10} />}
                                {run.status === 'paused_review' && <AlertTriangle size={10} />}
                                {outcomeLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Share Modal */}
                <AnimatePresence>
                    {showShareModal && <ShareModal open={showShareModal} onClose={() => setShowShareModal(false)} runId={run.runId} plan={plan} />}
                </AnimatePresence>

                {/* Horizontal node timeline */}
                <div className="mt-4 -mx-2 overflow-hidden">
                    <HorizontalTimeline currentNode={run.currentNode} status={run.status} />
                </div>
            </motion.div>

            {/* ── PRIMARY GRID ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                {/* LEFT COLUMN (3/5) */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Classification panel */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="p-5">
                            <h3 className="label-text mb-3">Classification</h3>
                            {run.errorType && (
                                <p className="text-2xl font-semibold mb-3" style={{ color: errorColors?.text, letterSpacing: '-0.02em' }}>
                                    {run.errorType}
                                </p>
                            )}
                            {run.confidenceScore !== undefined && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-label">Confidence</span>
                                        <span className="text-xs font-mono font-medium" style={{ color: run.confidenceScore >= 0.85 ? '#10B981' : run.confidenceScore >= 0.7 ? '#F59E0B' : '#F43F5E' }}>
                                            {Math.round(run.confidenceScore * 100)}%
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={run.confidenceScore * 100}
                                        color={run.confidenceScore >= 0.85 ? '#10B981' : run.confidenceScore >= 0.7 ? '#F59E0B' : '#F43F5E'}
                                        height={6}
                                    />
                                </div>
                            )}
                            {reasoning && (
                                <div className="mb-3">
                                    <p className="text-xs text-label mb-1.5">Model Reasoning</p>
                                    <p className="text-xs text-muted leading-relaxed">
                                        {showFullReasoning ? reasoning : shortReasoning}
                                    </p>
                                    {reasoning.length > 250 && (
                                        <button
                                            onClick={() => setShowFullReasoning(!showFullReasoning)}
                                            className="text-xs font-medium mt-1 transition-colors hover:text-white"
                                            style={{ color: '#818CF8' }}
                                        >
                                            {showFullReasoning ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            )}
                            {run.humanReviewOverride && (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg mt-2"
                                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                                    <AlertTriangle size={12} style={{ color: '#A78BFA' }} />
                                    <span className="text-xs" style={{ color: '#A78BFA' }}>
                                        Overridden by {run.humanReviewOverride.reviewer} — {run.humanReviewOverride.note}
                                    </span>
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* Root cause panel */}
                    {run.rootCause && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <Card className="p-5">
                                <h3 className="label-text mb-3">Root Cause</h3>
                                <p className="text-sm text-muted leading-relaxed">
                                    {run.rootCause.split(/(`[^`]+`)/g).map((part, i) =>
                                        part.startsWith('`') ? (
                                            <code key={i} className="font-mono text-xs px-1.5 py-0.5 rounded"
                                                style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>
                                                {part.slice(1, -1)}
                                            </code>
                                        ) : <span key={i}>{part}</span>
                                    )}
                                </p>
                                {run.isCorrelated && run.incidentId && (
                                    <div className="flex items-center gap-2 mt-4 p-2.5 rounded-lg"
                                        style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                                        <Link2 size={12} style={{ color: '#67E8F9' }} />
                                        <span className="text-xs font-mono" style={{ color: '#67E8F9' }}>
                                            Part of {run.incidentId}
                                        </span>
                                        {run.affectedRepos && (
                                            <span className="text-xs text-label ml-1">· {run.affectedRepos.length} repos affected</span>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}

                    {/* Fix recommendation panel */}
                    {run.fixSteps && run.fixSteps.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="label-text">Recommended Fix</h3>
                                    <button onClick={copyFixSteps} className="btn-secondary h-7 text-xs gap-1 px-2.5">
                                        <Copy size={11} />
                                        {copiedFix ? 'Copied!' : 'Copy steps'}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {run.fixSteps.map((step, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.25 + i * 0.06 }}
                                            className="flex gap-3 items-start"
                                        >
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
                                                style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', fontSize: 10 }}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className={`text-sm leading-relaxed ${i === run.fixSteps!.length - 1 ? 'text-label' : 'text-muted'}`}>
                                                    {step}
                                                </p>
                                                {i === 0 && (
                                                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                                                        style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', fontSize: 10 }}>
                                                        <CheckCircle2 size={9} />
                                                        PR #482 opened automatically
                                                    </span>
                                                )}
                                            </div>
                                            {i === run.fixSteps!.length - 1 && (
                                                <Shield size={13} className="text-label mt-0.5 shrink-0" />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT COLUMN (2/5) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Remediation */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                        {run.remediationResult && <RemediationPanel actions={run.remediationResult.actionsTaken} />}
                    </motion.div>

                    {/* Memory context */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                        {run.memoryContext && run.memoryContext.length > 0 && <MemoryPanel items={run.memoryContext} />}
                    </motion.div>

                    {/* Token usage */}
                    {run.finalReport?.tokenUsage && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                            <Card className="p-5">
                                <h3 className="label-text mb-3">Token Usage</h3>
                                <div className="space-y-2">
                                    {Object.entries(run.finalReport.tokenUsage).map(([node, tokens]) => (
                                        <div key={node} className="flex justify-between items-center text-xs">
                                            <span className="text-label capitalize">{node.replace(/_/g, ' ')}</span>
                                            <span className="font-mono text-muted">{tokens.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-white">Total</span>
                                        <span className="font-mono text-white">
                                            {Object.values(run.finalReport.tokenUsage).reduce((a, b) => a + b, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* ── SUPPORTING PANELS ────────────────────────────────────────────── */}
            <div className="space-y-5">
                {/* Similar cases */}
                {run.similarCases && run.similarCases.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <SimilarCasesTable cases={run.similarCases} />
                    </motion.div>
                )}

                {/* Raw log viewer */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <RawLogViewer log={run.rawLogCompressed} />
                </motion.div>
            </div>
        </div>
    );
}
