import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    Radar, ReferenceLine, Cell, Legend,
} from 'recharts';
import {
    Activity, TrendingDown, Wrench, Clock, DollarSign, TrendingUp,
    CheckCircle2, X, ChevronRight, Database, BarChart2, Download,
    Share2, AlertTriangle, Lock
} from 'lucide-react';
import { LineChart, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { useCurrentWorkspace } from '../components/shared/WorkspaceSwitcher';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { useCountUp } from '../hooks/useCountUp';
import { ERROR_TYPE_COLORS, NODE_LABELS } from '../lib/constants';
import {
    type TimeRange, getSeriesFor, getTopStats,
    ERROR_TYPE_STATS, CALIBRATION_ROWS, CALIBRATION_META,
    REPO_STATS, NODE_PERF, AUTO_FIX_RADAR, CORRELATION_EVENTS_7D,
} from '../lib/analytics_data';
import type { ErrorType } from '../types/pipeline';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const TOOLTIP_STYLE = {
    backgroundColor: '#1A1A24',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#A1A1B5',
    fontSize: 11,
};
const AXIS_STYLE = { fill: '#6B6B80', fontSize: 10 };
const AREA_KEYS: Array<{ key: string; color: string; name: string }> = [
    { key: 'buildFailures', color: '#818CF8', name: 'Build' },
    { key: 'testFailures', color: '#34D399', name: 'Test' },
    { key: 'deploymentFailures', color: '#FB7185', name: 'Deploy' },
    { key: 'networkErrors', color: '#67E8F9', name: 'Network' },
    { key: 'securityFailures', color: '#F43F5E', name: 'Security' },
    { key: 'other', color: '#A78BFA', name: 'Other' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TIME RANGE SELECTOR
   ═══════════════════════════════════════════════════════════════════════════ */
function TimeRangeSelector({ value, onChange, disabled }: { value: TimeRange; onChange: (r: TimeRange) => void; disabled?: boolean }) {
    const options: { val: TimeRange; label: string }[] = [
        { val: '7d', label: '7d' },
        { val: '30d', label: '30d' },
        { val: '90d', label: '90d' },
    ];
    return (
        <div className="flex flex-row lg:flex-col gap-1 shrink-0 relative">
            {options.map(o => {
                const isItemDisabled = disabled && o.val !== '7d';
                return (
                    <button
                        key={o.val}
                        onClick={() => !isItemDisabled && onChange(o.val)}
                        disabled={isItemDisabled}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${isItemDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{
                            background: value === o.val && !isItemDisabled ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: value === o.val && !isItemDisabled ? '#818CF8' : '#6B6B80',
                            border: `1px solid ${value === o.val && !isItemDisabled ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                        }}
                        aria-label={`Set time range to ${o.label}`}
                        aria-pressed={value === o.val}
                    >
                        {o.label}
                        {isItemDisabled && <Lock size={10} className="inline-block ml-1.5 opacity-50 mb-0.5" />}
                    </button>
                )
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD WITH SPARKLINE
   ═══════════════════════════════════════════════════════════════════════════ */
function AnalStat({ label, value, unit, prefix, color, trend, trendText, icon, delay, sparkData }:
    {
        label: string; value: number; unit?: string; prefix?: string; color: string;
        trend?: 'up' | 'down'; trendText?: string; icon: React.ReactNode; delay: number;
        sparkData: number[]
    }) {
    const animated = useCountUp(value, 700);
    const trendColor = trend === 'down' ? '#10B981' : '#F43F5E';
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-4 group hover:shadow-glow-hover transition-all duration-200"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="label-text text-xs" style={{ fontSize: 9.5 }}>{label}</span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${color}18`, color }}>
                    {icon}
                </span>
            </div>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <span className="text-2xl font-semibold tracking-tight" style={{ color, letterSpacing: '-0.02em' }}>
                        {prefix}{animated}{unit}
                    </span>
                    {trend && trendText && (
                        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: trendColor }}>
                            {trend === 'down' ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                            {trendText}
                        </div>
                    )}
                </div>
                <div className="w-16 h-7 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
                            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALIBRATION MODAL (per-row click)
   ═══════════════════════════════════════════════════════════════════════════ */
function CalibrationModal({ row, onClose }: { row: typeof CALIBRATION_ROWS[0]; onClose: () => void }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={e => e.stopPropagation()}
                    className="max-w-md w-full rounded-2xl p-6"
                    style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-white font-semibold text-base">{row.type}</h3>
                            <p className="text-xs text-label">Calibration history</p>
                        </div>
                        <button onClick={onClose} className="btn-secondary w-8 h-8 p-0 justify-center">
                            <X size={14} />
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={row.trend.map((v, i) => ({ day: `D${i + 1}`, threshold: v }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="day" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(0) + '%'} />
                            <Line type="monotone" dataKey="threshold" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 3 }} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, 'Threshold']} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <p className="text-label">Current</p>
                            <p className="font-mono text-white mt-1">{(row.threshold * 100).toFixed(0)}%</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <p className="text-label">Override rate</p>
                            <p className="font-mono mt-1" style={{ color: row.overrideRate > 25 ? '#F43F5E' : row.overrideRate > 10 ? '#F59E0B' : '#10B981' }}>
                                {row.overrideRate}%
                            </p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <p className="text-label">Samples</p>
                            <p className="font-mono text-white mt-1">{row.sampleSize}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPO CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function RepoCard({ repo, delay }: { repo: typeof REPO_STATS[0]; delay: number }) {
    const navigate = useNavigate();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.25 }}
            onClick={() => navigate('/')}
            className="glass-card p-4 cursor-pointer hover:bg-white/[0.04] transition-all duration-200"
            role="button"
            aria-label={`View runs for ${repo.repo}`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{repo.repo.replace('acme/', '')}</p>
                    <p className="text-xs text-label mt-0.5">{repo.failures} failures</p>
                </div>
                <ChevronRight size={13} className="text-label shrink-0 mt-0.5" />
            </div>
            <div className="mb-3">
                <ErrorTypeBadge type={repo.topErrorType} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                    <p className="text-label" style={{ fontSize: 10 }}>Auto-fix</p>
                    <p className="font-mono font-medium" style={{ color: repo.autoFixRate >= 75 ? '#10B981' : repo.autoFixRate >= 50 ? '#F59E0B' : '#F43F5E' }}>
                        {repo.autoFixRate}%
                    </p>
                </div>
                <div>
                    <p className="text-label" style={{ fontSize: 10 }}>Memories</p>
                    <p className="font-mono font-medium text-white flex items-center gap-1">
                        <Database size={10} style={{ color: '#818CF8' }} />{repo.memoryEntries}
                    </p>
                </div>
            </div>
            <div className="h-6 w-full opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={repo.dailyFailures.map((v, i) => ({ v, i }))}>
                        <Line type="monotone" dataKey="v" stroke="#6366F1" strokeWidth={1.5} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHART SKELETON LOADER
   ═══════════════════════════════════════════════════════════════════════════ */
function ChartSkeleton({ height = 200 }: { height?: number }) {
    return (
        <div className="shimmer rounded-xl" style={{ height }} />
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export function Analytics() {
    const workspace = useCurrentWorkspace();
    const isFree = workspace.plan === 'free';

    const [range, setRange] = useState<TimeRange>('7d');
    const [hiddenAreas, setHiddenAreas] = useState<Set<string>>(new Set());
    const [calibModal, setCalibModal] = useState<typeof CALIBRATION_ROWS[0] | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<string>('all');

    // Force 7d range on Free plan
    if (isFree && range !== '7d') setRange('7d');

    const series = useMemo(() => getSeriesFor(range), [range]);
    const stats = useMemo(() => getTopStats(range), [range]);
    const corrEvents = range === '7d' ? CORRELATION_EVENTS_7D : [];

    // Filter Repos
    const filteredRepos = useMemo(() => {
        if (selectedRepo === 'all') return REPO_STATS;
        return REPO_STATS.filter(r => r.repo === selectedRepo);
    }, [selectedRepo]);

    const totalInt = parseInt(stats.total.toString());
    const failRateFloat = parseFloat(stats.failRate);
    const autoFixInt = stats.autoFix;
    const mttrFloat = parseFloat(stats.mttr);
    const tokenCostFloat = parseFloat(stats.tokenCost);

    const toggleArea = (key: string) => {
        setHiddenAreas(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    };

    return (
        <>
            {calibModal && <CalibrationModal row={calibModal} onClose={() => setCalibModal(null)} />}

            <div className="max-w-6xl mx-auto animate-fade-in pb-20">
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
                            <BarChart2 className="text-indigo-400" />
                            {workspace.name} Analytics
                        </h1>
                        <p className="text-sm text-label mt-1">
                            Performance metrics and insights for your connected repositories.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            className="input-base text-sm py-1.5 h-9 min-w-[160px]"
                            value={selectedRepo}
                            onChange={(e) => setSelectedRepo(e.target.value)}
                        >
                            <option value="all">All repositories</option>
                            {REPO_STATS.map(r => (
                                <option key={r.repo} value={r.repo}>{r.repo}</option>
                            ))}
                        </select>

                        <div className="h-5 w-px bg-white/10" />

                        <button className="btn-secondary h-9 px-3 gap-1.5 text-sm" onClick={() => alert('Exporting CSV...')}>
                            <Download size={14} /> Export CSV
                        </button>
                        <button
                            className={`h-9 px-3 gap-1.5 text-sm font-medium flex items-center justify-center rounded-lg transition-colors border ${isFree ? 'bg-white/5 border-white/5 text-slate-400 cursor-not-allowed' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200'}`}
                            onClick={() => !isFree && alert('Share dashboard dialog...')}
                            title={isFree ? 'Pro feature' : ''}
                        >
                            <Share2 size={14} />
                            <span>Share dashboard</span>
                            {isFree && <Lock size={12} className="opacity-50 ml-1" />}
                        </button>
                    </div>
                </div>

                {isFree && (
                    <Card className="mb-6 p-4 border border-fuchsia-500/20 bg-fuchsia-500/5 flex items-center justify-between animate-slide-up">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-fuchsia-500/20">
                                <AlertTriangle size={16} className="text-fuchsia-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-fuchsia-100">You're viewing 7 days of data on the Free plan</p>
                                <p className="text-xs text-fuchsia-200/60 mt-0.5">Upgrade to Pro for 90-day history and external dashboard sharing.</p>
                            </div>
                        </div>
                        <button className="btn-primary bg-fuchsia-500 hover:bg-fuchsia-600 shadow-fuchsia-500/20 border-0 h-8 px-4 text-xs font-semibold">
                            Upgrade to Pro
                        </button>
                    </Card>
                )}

                {/* ── OUTER LAYOUT: time range left + content right ─────────────── */}
                <div className="flex gap-5 items-start">
                    {/* Time range selector (sidebar) */}
                    <div className="pt-1 sticky top-20">
                        <TimeRangeSelector value={range} onChange={r => setRange(r)} disabled={isFree} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* ── SECTION 1: Top stats row ─────────────────────────────── */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <AnalStat label="Total Analyzed" value={totalInt} color="#ffffff" delay={0}
                                icon={<Activity size={13} />} sparkData={series.slice(-7).map(d => d.total)} trend="down" trendText="-8%" />
                            <AnalStat label="Failure Rate" value={Math.round(failRateFloat)} unit="%" color="#F43F5E" delay={0.04}
                                icon={<TrendingDown size={13} />} sparkData={series.slice(-7).map(d => d.total > 0 ? Math.round(((d.buildFailures + d.deploymentFailures + d.securityFailures) / d.total) * 100) : 0)}
                                trend="down" trendText="-2.1%" />
                            <AnalStat label="Auto-fix Rate" value={autoFixInt} unit="%" color="#10B981" delay={0.08}
                                icon={<Wrench size={13} />} sparkData={[60, 63, 65, 67, 65, 68, autoFixInt]} trend="up" trendText="+3%" />
                            <AnalStat label="Avg MTTR" value={Math.round(mttrFloat)} unit="m" color="#8B5CF6" delay={0.12}
                                icon={<Clock size={13} />} sparkData={[14, 13, 12, 13, 11, 12, Math.round(mttrFloat)]} trend="down" trendText="-1.4m" />
                            <AnalStat label="Token Cost" value={Math.round(tokenCostFloat * 100)} prefix="$0." unit="" color="#F59E0B" delay={0.16}
                                icon={<DollarSign size={13} />} sparkData={[220, 260, 280, 260, 290, 270, Math.round(tokenCostFloat * 100)]} trend="up" trendText="+0.3$" />
                        </div>

                        {/* ── CHART 1: Error type distribution (horiz bar) ────────── */}
                        <Card className="p-5">
                            <h3 className="label-text mb-4">Error Type Distribution</h3>
                            <div className="space-y-2.5">
                                {ERROR_TYPE_STATS.map((stat, i) => {
                                    const colors = ERROR_TYPE_COLORS[stat.type];
                                    return (
                                        <motion.div
                                            key={stat.type}
                                            initial={{ opacity: 0, x: -16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="w-36 shrink-0 text-xs truncate" style={{ color: colors.text }}>
                                                {stat.type}
                                            </div>
                                            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${stat.percentage}%` }}
                                                    transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                                    className="h-full rounded-full flex items-center px-2"
                                                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                                                />
                                            </div>
                                            <div className="w-20 shrink-0 text-xs font-mono text-right" style={{ color: colors.text }}>
                                                {stat.count} · {stat.percentage}%
                                            </div>
                                            <div className="hidden lg:block w-24 text-xs text-label text-right shrink-0">
                                                MTTR {stat.avgMttrMin}m
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* ── CHARTS 2+3: Auto-fix radar + Failure area trend ─────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Chart 2: Auto-fix radar */}
                            <Card className="p-5">
                                <h3 className="label-text mb-3">Auto-fix Success Rate by Error Type</h3>
                                <ResponsiveContainer width="100%" height={230}>
                                    <RadarChart data={AUTO_FIX_RADAR}>
                                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                                        <PolarAngleAxis dataKey="type" tick={{ fill: '#6B6B80', fontSize: 9.5 }} />
                                        <Radar name="Attempted" dataKey="attempted" stroke="#6366F1" fill="rgba(99,102,241,0.08)" strokeWidth={1.5} />
                                        <Radar name="Success" dataKey="success" stroke="#10B981" fill="rgba(16,185,129,0.12)" strokeWidth={1.5} />
                                        <Legend wrapperStyle={{ fontSize: 11, color: '#6B6B80' }} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Chart 3: Stacked area trend */}
                            <Card className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="label-text">Failure Trend — {range}</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {AREA_KEYS.map(k => (
                                            <button key={k.key} onClick={() => toggleArea(k.key)}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-opacity"
                                                style={{ opacity: hiddenAreas.has(k.key) ? 0.3 : 1, color: k.color }}>
                                                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: k.color }} />
                                                {k.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                        <defs>
                                            {AREA_KEYS.map(k => (
                                                <linearGradient key={k.key} id={`agrad_${k.key}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={k.color} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={k.color} stopOpacity={0} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false}
                                            interval={range === '90d' ? 14 : range === '30d' ? 4 : 0} />
                                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                                        {corrEvents.map(ev => (
                                            <ReferenceLine key={ev.date} x={ev.date} stroke="rgba(244,63,94,0.4)"
                                                strokeDasharray="4 3" label={{ value: ev.label, fill: '#F43F5E', fontSize: 9, position: 'insideTopLeft' }} />
                                        ))}
                                        {AREA_KEYS.filter(k => !hiddenAreas.has(k.key)).map(k => (
                                            <Area key={k.key} type="monotone" dataKey={k.key} name={k.name}
                                                stroke={k.color} fill={`url(#agrad_${k.key})`} strokeWidth={1.5} dot={false} stackId="1" />
                                        ))}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        {/* ── CHART 4: Confidence calibration table ───────────────── */}
                        <Card className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="label-text">Confidence Calibration</h3>
                                <span className="text-xs text-label">
                                    Last calibration: <span className="font-mono text-white">Mar 18 00:00</span> ·
                                    Next: <span className="font-mono text-white">Mar 19 00:00</span>
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-label border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                            <th className="text-left py-2 pr-4 font-medium">Error Type</th>
                                            <th className="text-left py-2 pr-4 font-medium">Threshold</th>
                                            <th className="text-left py-2 pr-4 font-medium">Override Rate</th>
                                            <th className="text-left py-2 pr-4 font-medium">Samples</th>
                                            <th className="text-left py-2 font-medium">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {CALIBRATION_ROWS.map((row, i) => {
                                            const or = row.overrideRate;
                                            const orColor = or > 30 ? '#F43F5E' : or > 10 ? '#F59E0B' : '#10B981';
                                            return (
                                                <motion.tr
                                                    key={row.type}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.04 }}
                                                    onClick={() => setCalibModal(row)}
                                                    className="border-b hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                                >
                                                    <td className="py-2.5 pr-4 text-white">{row.type}</td>
                                                    <td className="py-2.5 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                                <div className="h-full rounded-full" style={{ width: `${row.threshold * 100}%`, background: '#6366F1' }} />
                                                            </div>
                                                            <span className="font-mono">{(row.threshold * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 pr-4">
                                                        <span className="font-mono font-medium" style={{ color: orColor }}>{or}%</span>
                                                    </td>
                                                    <td className="py-2.5 pr-4 font-mono text-label">{row.sampleSize}</td>
                                                    <td className="py-2.5">
                                                        <div className="w-16 h-6 opacity-60">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={row.trend.map((v, j) => ({ v, j }))}>
                                                                    <Line type="monotone" dataKey="v" stroke="#6366F1" strokeWidth={1.5} dot={false} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* ── CHART 5: Top failing repos (stacked bar + repo cards) ── */}
                        <Card className="p-5">
                            <h3 className="label-text mb-4">Top Failing Repos</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={filteredRepos.map(r => ({ ...r.breakdownByType, repo: r.repo.replace('acme/', '') }))}
                                    layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="repo" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    {(['Build Failure', 'Test Failure', 'Deployment Failure', 'Security Scan Failure', 'Dependency Error'] as ErrorType[]).map(type => (
                                        <Bar key={type} dataKey={type} name={type} stackId="a" fill={ERROR_TYPE_COLORS[type]?.text ?? '#aaa'}
                                            fillOpacity={0.7} radius={[0, 0, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
                                {filteredRepos.map((repo, i) => (
                                    <RepoCard key={repo.repo} repo={repo} delay={i * 0.05} />
                                ))}
                            </div>
                        </Card>


                        {/* ── CHART 6: Node latency + token usage ─────────────────── */}
                        <Card className="p-5">
                            <h3 className="label-text mb-4">LangGraph Node Performance</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Avg latency */}
                                <div>
                                    <p className="text-xs text-label mb-3">Avg Latency (ms)</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={NODE_PERF} margin={{ left: -10, right: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="node" tickFormatter={v => NODE_LABELS[v]?.slice(0, 7) ?? v}
                                                tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                                            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`, 'Avg']}
                                                labelFormatter={v => NODE_LABELS[v] ?? v} />
                                            <Bar dataKey="avgMs" name="Avg ms" radius={[3, 3, 0, 0]}>
                                                {NODE_PERF.map((n, i) => (
                                                    <Cell key={i}
                                                        fill={n.avgMs >= 5000 ? '#F43F5E' : n.avgMs >= 2000 ? '#F59E0B' : '#6366F1'}
                                                        fillOpacity={0.8} />
                                                ))}
                                            </Bar>
                                            <Bar dataKey="p95Ms" name="p95 ms" radius={[3, 3, 0, 0]} fill="rgba(255,255,255,0.06)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-label">
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#6366F1' }} />Normal</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#F59E0B' }} />&gt;2s slow</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#F43F5E' }} />&gt;5s bottleneck</span>
                                    </div>
                                </div>
                                {/* Token usage */}
                                <div>
                                    <p className="text-xs text-label mb-3">Token Usage per Node</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={NODE_PERF.filter(n => n.tokenUsage > 0)} margin={{ left: -10, right: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="node" tickFormatter={v => NODE_LABELS[v]?.slice(0, 7) ?? v}
                                                tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                                            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Tokens']}
                                                labelFormatter={v => NODE_LABELS[v] ?? v} />
                                            <Bar dataKey="tokenUsage" name="Tokens" radius={[3, 3, 0, 0]}>
                                                {NODE_PERF.filter(n => n.tokenUsage > 0).map((n, i) => (
                                                    <Cell key={i} fill="#8B5CF6" fillOpacity={0.5 + (n.tokenUsage / 6000) * 0.5} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="flex justify-end mt-2">
                                        <span className="text-xs text-label font-mono">
                                            Total: <span className="text-white">{NODE_PERF.reduce((a, n) => a + n.tokenUsage, 0).toLocaleString()}</span> tokens/run
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
