import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, ResponsiveContainer,
} from 'recharts';
import {
    Activity, TrendingDown, Wrench, Clock, ArrowUpRight,
    GitBranch, ExternalLink, AlertTriangle, Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRuns } from '../hooks/usePipelineData';
import { useCountUp } from '../hooks/useCountUp';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { Badge } from '../components/ui/Badge';
import { StatusDot } from '../components/ui/StatusDot';
import { ProgressBar } from '../components/ui/ProgressBar';
import { NODE_ORDER, NODE_LABELS, STATUS_LABELS, SEVERITY_COLORS } from '../lib/constants';
import { MOCK_ACTIVE_RUNS, MOCK_COMPLETED_RUNS, RESOLVE_SPARKLINE } from '../lib/api';
import type { PipelineRun, RunStatus } from '../types/pipeline';
import type { Outcome } from '../lib/api';
import { WorkspaceSwitcher, useCurrentWorkspace } from '../components/shared/WorkspaceSwitcher';

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS DOT COLOR MAP
   ═══════════════════════════════════════════════════════════════════════════ */
function statusDotColor(status: RunStatus): string {
    switch (status) {
        case 'ingesting': case 'extracting': return '#3B82F6';
        case 'classifying': case 'analyzing': return '#8B5CF6';
        case 'fixing': case 'remediating': return '#F59E0B';
        case 'paused_review': return '#F43F5E';
        case 'completed': return '#10B981';
        case 'failed': return '#F43F5E';
        default: return '#6366F1';
    }
}

const OUTCOME_COLORS: Record<Outcome, { bg: string; text: string }> = {
    'Auto-fixed': { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
    'Re-run triggered': { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA' },
    'PR opened': { bg: 'rgba(99,102,241,0.15)', text: '#818CF8' },
    'Human reviewed': { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
    'Escalated': { bg: 'rgba(244,63,94,0.15)', text: '#FB7185' },
    'No action': { bg: 'rgba(107,107,128,0.12)', text: '#9CA3AF' },
};

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK AUTH DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const MOCK_USER = { name: 'Jane Doe', initials: 'JD' };
const MOCK_STATS = {
    reposConnected: 3, // Set to 0 to test empty state
    analysesUsed: 847,
    analysesLimit: 1000,
};

function UserAvatar({ initials }: { initials: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative z-50">
            <button
                onClick={() => setOpen(!open)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 hover:ring-2 ring-indigo-500/50 hover:shadow-glow-hover transition-all"
            >
                {initials}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full text-left right-0 mt-2 w-48 bg-slate-900 border border-slate-700/80 rounded-lg shadow-[0_4_20px_rgba(0,0,0,0.5)] overflow-hidden py-1"
                    >
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">Profile</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">Switch workspace</button>
                        <div className="h-[1px] bg-slate-800 my-1" />
                        <button className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors">Sign out</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COUNT UP STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, suffix, color, trend, trendText, icon, delay, sparkline }: {
    label: string; value: number; suffix?: string; color: string;
    trend?: 'up' | 'down'; trendText?: string; icon: React.ReactNode;
    delay: number; sparkline?: number[];
}) {
    const animatedValue = useCountUp(value);
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-5 group hover:shadow-glow-hover transition-all duration-200 ease-premium"
            style={{ cursor: 'default' }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="label-text">{label}</span>
                <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${color}18`, color }}
                >
                    {icon}
                </span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-3xl font-semibold tracking-tight" style={{ color, letterSpacing: '-0.02em' }}>
                        {animatedValue}{suffix}
                    </span>
                    {trend && trendText && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: trend === 'down' ? '#10B981' : '#F43F5E' }}>
                            <TrendingDown size={11} className={trend === 'up' ? 'rotate-180' : ''} />
                            <span>{trendText}</span>
                        </div>
                    )}
                </div>
                {sparkline && (
                    <div className="w-20 h-8 opacity-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkline.map((v, i) => ({ v, i }))}>
                                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NODE DOT PIPELINE
   ═══════════════════════════════════════════════════════════════════════════ */
function NodeDots({ currentNode }: { currentNode?: string }) {
    const currentIdx = currentNode ? NODE_ORDER.indexOf(currentNode) : -1;
    return (
        <div className="flex items-center gap-[5px]" aria-label="Node progress dots">
            {NODE_ORDER.map((node, idx) => {
                const isDone = currentIdx >= 0 && idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const dotColor = isDone ? '#6366F1' : isCurrent ? '#6366F1' : '#22222F';
                return (
                    <div key={node} className="relative group/dot">
                        <div
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${isCurrent ? 'animate-pulse' : ''}`}
                            style={{
                                background: dotColor,
                                boxShadow: isCurrent ? '0 0 6px rgba(99,102,241,0.6)' : 'none',
                            }}
                        />
                        {/* Tooltip */}
                        <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs whitespace-nowrap
                         opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity duration-150 z-10"
                            style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', color: '#A1A1B5' }}
                        >
                            {NODE_LABELS[node] ?? node}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE RUN CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function RunCard({ run, index }: { run: PipelineRun; index: number }) {
    const navigate = useNavigate();
    const isPaused = run.status === 'paused_review';
    const elapsed = Math.round((Date.now() - run.startedAt.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const dotColor = statusDotColor(run.status);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{
                opacity: 1, y: 0, scale: 1,
                borderColor: isPaused ? ['rgba(244,63,94,0.15)', 'rgba(244,63,94,0.4)', 'rgba(244,63,94,0.15)'] : 'rgba(255,255,255,0.08)',
            }}
            transition={{
                delay: index * 0.08,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
                borderColor: isPaused ? { repeat: Infinity, duration: 2.5 } : undefined,
            }}
            className="glass-card p-4 relative overflow-hidden"
            style={{ borderWidth: 1 }}
        >
            {/* Paused review banner */}
            {isPaused && (
                <div
                    className="absolute top-3 -right-8 px-8 py-0.5 text-xs font-semibold uppercase tracking-wider"
                    style={{
                        background: 'rgba(244,63,94,0.85)', color: 'white',
                        transform: 'rotate(45deg)', transformOrigin: 'center',
                        fontSize: 9, letterSpacing: '0.08em',
                    }}
                >
                    Needs Review
                </div>
            )}

            {/* Row 1: status dot, repo, error badge, branch · stage */}
            <div className="flex items-center gap-3 mb-3">
                <span
                    className={['completed', 'failed'].includes(run.status) ? '' : 'animate-pulse'}
                    style={{
                        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                        background: dotColor, boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0,
                    }}
                />
                <span className="font-medium text-white text-sm">{run.repo}</span>
                {run.errorType && <ErrorTypeBadge type={run.errorType} />}
                <span className="text-xs text-label flex items-center gap-1 ml-auto">
                    <GitBranch size={10} />{run.branch} · {run.stage}
                </span>
            </div>

            {/* Row 2: node pipeline progress */}
            <div className="flex items-center gap-3 mb-2.5">
                <div className="flex-1">
                    <ProgressBar value={run.nodeProgress ?? 0} color="#6366F1" height={3} shimmer className="mb-2" />
                    <div className="flex items-center justify-between">
                        <NodeDots currentNode={run.currentNode} />
                        <span className="text-xs text-label font-mono ml-2 shrink-0">
                            {NODE_LABELS[run.currentNode ?? ''] ?? run.currentNode ?? '…'} · {run.nodeProgress ?? 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Row 3: model info, elapsed, view button */}
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-label">
                    <Sparkles size={10} style={{ color: '#8B5CF6' }} />
                    <span>Gemini 2.5 Pro</span>
                    <span className="animate-pulse" style={{ color: '#8B5CF6' }}>· thinking…</span>
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-label font-mono">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </span>
                    <button
                        onClick={() => navigate(`/run/${run.id}`)}
                        className="flex items-center gap-1 text-xs font-medium transition-all duration-200
                       hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
                        style={{ color: '#818CF8' }}
                        aria-label={`View run detail for ${run.repo}`}
                    >
                        <ExternalLink size={11} />
                        view
                    </button>
                </div>
            </div>

            {/* Paused: review now button */}
            {isPaused && (
                <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate('/review')}
                    className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2
                     transition-all duration-200 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.8), rgba(244,63,94,0.6))' }}
                    aria-label="Review this run now"
                >
                    <AlertTriangle size={13} />
                    Review now
                    <ArrowUpRight size={13} />
                </motion.button>
            )}
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPLETED RUNS TABLE
   ═══════════════════════════════════════════════════════════════════════════ */
function CompletedTable({ runs }: { runs: (PipelineRun & { outcome?: Outcome })[] }) {
    const navigate = useNavigate();
    const [visibleCount, setVisibleCount] = useState(20);
    const visible = runs.slice(0, visibleCount);

    return (
        <div className="mt-8">
            <h3 className="label-text mb-4 px-1">Recent Completed</h3>

            {/* Header row */}
            <div className="grid grid-cols-[20px_1fr_auto_80px_auto_70px_50px] gap-3 items-center px-4 py-2 text-xs text-label mb-1">
                <span />
                <span>Repo</span>
                <span>Error Type</span>
                <span>Severity</span>
                <span>Outcome</span>
                <span>Time</span>
                <span />
            </div>

            {/* Rows */}
            <div role="table" aria-label="Completed pipeline runs">
                <AnimatePresence>
                    {visible.map((run, i) => {
                        const outcome = run.outcome ?? 'No action';
                        const oColors = OUTCOME_COLORS[outcome];
                        return (
                            <motion.div
                                key={run.id}
                                role="row"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 16 }}
                                transition={{ delay: i * 0.025, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                onClick={() => navigate(`/run/${run.id}`)}
                                className="grid grid-cols-[20px_1fr_auto_80px_auto_70px_50px] gap-3 items-center px-4 py-3 rounded-lg cursor-pointer
                           transition-all duration-200 hover:bg-[rgba(99,102,241,0.05)]"
                                style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}
                                aria-label={`${run.repo} — ${outcome}`}
                            >
                                {/* Status dot */}
                                <StatusDot severity={run.severity} />

                                {/* Repo */}
                                <span className="text-sm text-white font-medium truncate">{run.repo}</span>

                                {/* Error type badge */}
                                <span>{run.errorType && <ErrorTypeBadge type={run.errorType} />}</span>

                                {/* Severity */}
                                <span>
                                    {run.severity && (
                                        <Badge label={run.severity.toUpperCase()} severity={run.severity} />
                                    )}
                                </span>

                                {/* Outcome badge */}
                                <span
                                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                    style={{ background: oColors.bg, color: oColors.text, fontSize: 11, letterSpacing: '0.02em' }}
                                >
                                    {outcome}
                                </span>

                                {/* Time */}
                                <span className="text-xs text-label font-mono">
                                    {formatDistanceToNow(run.completedAt ?? run.startedAt, { addSuffix: false })}
                                </span>

                                {/* Action */}
                                <span className="flex justify-end">
                                    <ArrowUpRight size={12} className="text-label" />
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Load more */}
            {visibleCount < runs.length && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center mt-4"
                >
                    <button
                        onClick={() => setVisibleCount(c => c + 20)}
                        className="btn-secondary text-xs"
                    >
                        Load more ({runs.length - visibleCount} remaining)
                    </button>
                </motion.div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE FEED SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export function LiveFeed() {
    const navigate = useNavigate();
    const workspace = useCurrentWorkspace();
    const { reposConnected, analysesUsed, analysesLimit } = MOCK_STATS;
    const { data: allRuns = [] } = useRuns(workspace.id);

    // Separate active from completed
    const activeRuns = useMemo(
        () => allRuns.filter(r => !['completed', 'failed'].includes(r.status)),
        [allRuns],
    );
    const completedRuns = useMemo(
        () => (allRuns.filter(r => ['completed', 'failed'].includes(r.status)) as (PipelineRun & { outcome?: Outcome })[])
            .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
        [allRuns],
    );

    // Stats
    const totalToday = allRuns.length;
    const failures = allRuns.filter(r => r.status === 'failed').length;
    const autoFixed = (MOCK_COMPLETED_RUNS.filter(r => r.outcome === 'Auto-fixed').length);
    const autoFixedPct = completedRuns.length ? Math.round((autoFixed / completedRuns.length) * 100) : 0;
    const avgResolveMin = 11;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in relative z-0">
            {/* ── HEADER WITH MULTI-TENANT CONTEXT ───────────────────────────── */}
            <div className="flex items-center justify-between mb-8 z-50 relative">
                <WorkspaceSwitcher />
                <UserAvatar initials={MOCK_USER.initials} />
            </div>

            {/* ── EMPTY STATE (No Repos Connected) ────────────────────────────── */}
            {reposConnected === 0 ? (
                <div className="mt-16 flex flex-col items-center justify-center py-20 px-4 text-center bg-white/5 border border-dashed border-slate-700 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
                        <GitBranch className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        No repos connected
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-sm">
                        Connect your first GitHub repo to start monitoring pipelines and automatically fixing errors.
                    </p>
                    <button
                        onClick={() => navigate('/settings/repos')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2"
                    >
                        Connect GitHub <ArrowUpRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            ) : (
                <>
                    {/* ── SECTION 1: Stats bar ──────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 z-0">
                        <StatCard label="Runs Today" value={totalToday} color="#ffffff" delay={0}
                            icon={<Activity size={14} />} />
                        <StatCard label="Failures" value={failures} color="#F43F5E" delay={0.05}
                            icon={<TrendingDown size={14} />} trend="down" trendText="-2 vs yesterday" />
                        <StatCard label="Auto-fixed" value={autoFixed} suffix={` (${autoFixedPct}%)`}
                            color="#10B981" delay={0.1}
                            icon={<Wrench size={14} />} />
                        <StatCard label="Avg Resolve" value={avgResolveMin} suffix=" min"
                            color="#8B5CF6" delay={0.15}
                            icon={<Clock size={14} />} sparkline={RESOLVE_SPARKLINE} />
                    </div>

                    {/* ── PLAN LIMIT BANNERS ────────────────────────────────────────────── */}
                    <div className="space-y-3 mb-8 z-0">
                        {workspace.plan === 'free' && reposConnected >= 3 && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm font-medium text-amber-500">
                                        You've reached the 3-repo limit on the Free plan <span className="text-amber-500/70 ml-1 font-normal">· Upgrade to Pro for unlimited repos</span>
                                    </span>
                                </div>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded transition-colors"
                                >
                                    Upgrade
                                </button>
                            </div>
                        )}
                        {workspace.plan === 'free' && (analysesUsed / analysesLimit) >= 0.8 && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <span className="text-sm font-medium text-amber-500">
                                    {analysesUsed.toLocaleString()} of {analysesLimit.toLocaleString()} analyses used this month <span className="text-amber-500/70 font-normal ml-1">· Resets in 14 days · Upgrade for unlimited</span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── SECTION 2: Active runs ────────────────────────────────────────── */}
                    <div className="mb-2 z-0">
                        <div className="flex items-center gap-2.5 mb-4 px-1">
                            <span
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }}
                            />
                            <span className="text-sm font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>Live</span>
                            <span className="text-xs text-label">{activeRuns.length} running</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <AnimatePresence mode="popLayout">
                                {(activeRuns.length > 0 ? activeRuns : MOCK_ACTIVE_RUNS).map((run, i) => (
                                    <RunCard key={run.id} run={run} index={i} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── SECTION 3: Completed table ────────────────────────────────────── */}
                    <CompletedTable runs={completedRuns.length > 0 ? completedRuns : MOCK_COMPLETED_RUNS} />
                </>
            )}
        </div>
    );
}
