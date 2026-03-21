import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle2, XCircle, Loader2, Clock, Hash,
    GitBranch, Siren, BookOpen, ChevronDown, Shield, Keyboard, Trash2,
} from 'lucide-react';
import { useRuns } from '../hooks/usePipelineData';
import { useCountUp } from '../hooks/useCountUp';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { Card } from '../components/ui/Card';
import { ERROR_TYPE_COLORS, ERROR_TYPES } from '../lib/constants';
import { submitHumanReview } from '../lib/api';
import type { PipelineRun, ErrorType, Severity } from '../types/pipeline';

const MOCK_AUTH = {
    workspaceId: 'ws_123',
    workspaceName: 'Acme Corp',
    user: { name: 'Jane Doe', initials: 'JD' },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ARC GAUGE (60px review-size)
   ═══════════════════════════════════════════════════════════════════════════ */
function ReviewArcGauge({ value, size = 60 }: { value: number; size?: number }) {
    const animated = useCountUp(Math.round(value * 100), 800);
    const r = (size - 5) / 2;
    const circ = 2 * Math.PI * r;
    const dash = circ * value;
    const color = value >= 0.85 ? '#10B981' : value >= 0.7 ? '#F59E0B' : '#F43F5E';
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={4} strokeLinecap="round"
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    strokeDasharray={circ}
                />
            </svg>
            <span className="absolute text-sm font-bold font-mono" style={{ color }}>{animated}%</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ELAPSED TIMER
   ═══════════════════════════════════════════════════════════════════════════ */
function ElapsedTimer({ since }: { since: Date }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const secs = Math.floor((now - since.getTime()) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return (
        <span className="flex items-center gap-1.5 font-mono text-sm font-medium" style={{ color: '#F59E0B' }}>
            <Clock size={13} />
            Paused {m}m {s.toString().padStart(2, '0')}s
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════════════ */
function Toast({ message, visible }: { message: string; visible: boolean }) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, x: 80, y: -10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white"
                    style={{
                        background: 'rgba(16,185,129,0.9)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                    }}
                >
                    <CheckCircle2 size={14} />
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEVERITY PILLS
   ═══════════════════════════════════════════════════════════════════════════ */
const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
    { value: 'critical', label: 'Critical', color: '#F43F5E' },
    { value: 'high', label: 'High', color: '#FB923C' },
    { value: 'medium', label: 'Medium', color: '#FBBF24' },
    { value: 'low', label: 'Low', color: '#34D399' },
];

function SeverityPills({ selected, onChange }: { selected: Severity; onChange: (s: Severity) => void }) {
    return (
        <div className="grid grid-cols-4 gap-2">
            {SEVERITY_OPTIONS.map(opt => {
                const active = selected === opt.value;
                return (
                    <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange(opt.value)}
                        className="relative py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 overflow-hidden"
                        style={{
                            background: active ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? `${opt.color}50` : 'rgba(255,255,255,0.06)'}`,
                            color: active ? opt.color : '#6B6B80',
                            letterSpacing: '0.06em',
                        }}
                        aria-label={`Set severity to ${opt.label}`}
                        aria-pressed={active}
                    >
                        {active && (
                            <motion.div
                                layoutId="severity-fill"
                                className="absolute inset-0 rounded-lg"
                                style={{ background: `${opt.color}10` }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{opt.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOG LINE COLORING
   ═══════════════════════════════════════════════════════════════════════════ */
function logLineColor(line: string) {
    if (/\[ERROR\]|CRITICAL|FATAL/i.test(line)) return '#F43F5E';
    if (/\[WARN\]|WARNING|HIGH/i.test(line)) return '#F59E0B';
    return '#6B6B80';
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export function HumanReview() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: runs = [] } = useRuns();
    const reviewRun = id ? runs.find((r: PipelineRun) => r.id === id) : runs.find((r: PipelineRun) => r.needsHumanReview);

    // form state
    const [overrideClass, setOverrideClass] = useState<ErrorType | ''>('');
    const [severity, setSeverity] = useState<Severity>(reviewRun?.severity ?? 'high');
    const [note, setNote] = useState('');
    const [savePattern, setSavePattern] = useState(false);
    const [pagerDuty, setPagerDuty] = useState(true);

    // action state
    const [phase, setPhase] = useState<'idle' | 'resuming' | 'done' | 'discarding' | 'discarded'>('idle');
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    // update severity when run changes
    useEffect(() => {
        if (reviewRun?.severity) setSeverity(reviewRun.severity);
    }, [reviewRun?.severity]);

    const toast = useCallback((msg: string) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────
    const handleOverrideResume = async () => {
        if (!reviewRun || phase !== 'idle') return;
        setPhase('resuming');
        await submitHumanReview(reviewRun.runId, {
            classification: (overrideClass || reviewRun.errorType) ?? '',
            approved: true,
        });
        setPhase('done');
        toast('Graph resumed — pipeline continuing');
        setTimeout(() => navigate(`/run/${reviewRun.id}`), 1500);
    };

    const handleAcceptModel = async () => {
        if (!reviewRun || phase !== 'idle') return;
        setPhase('resuming');
        await submitHumanReview(reviewRun.runId, {
            classification: reviewRun.errorType ?? '',
            approved: true,
        });
        setPhase('done');
        toast('Model classification accepted');
        setTimeout(() => navigate(`/run/${reviewRun.id}`), 1500);
    };

    const handleDiscard = async () => {
        if (!confirmDiscard) {
            setConfirmDiscard(true);
            return;
        }
        if (!reviewRun) return;
        setPhase('discarding');
        await submitHumanReview(reviewRun.runId, {
            classification: reviewRun.errorType ?? '',
            approved: false,
        });
        setPhase('discarded');
        toast('Run discarded');
        setTimeout(() => navigate('/'), 1500);
    };

    // ── Keyboard shortcuts ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (phase !== 'idle') return;
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleAcceptModel(); }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleOverrideResume(); }
            if (e.key === 'Escape') { e.preventDefault(); handleDiscard(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, reviewRun]);

    // ── Empty state ────────────────────────────────────────────────────────
    if (!reviewRun) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                <CheckCircle2 size={48} style={{ color: '#10B981' }} className="mb-4" />
                <p className="text-white text-lg font-medium">All caught up</p>
                <p className="text-label text-sm mt-1">No runs awaiting review</p>
            </div>
        );
    }

    const conf = reviewRun.confidenceScore ?? 0;
    const threshold = 0.75;
    const delta = Math.abs(conf - threshold).toFixed(2);
    const errorColors = reviewRun.errorType ? ERROR_TYPE_COLORS[reviewRun.errorType] : null;
    const isCritMainBranch = reviewRun.severity === 'critical' && reviewRun.branch === 'main';
    const isIncidentLeader = reviewRun.isCorrelated && reviewRun.incidentId;
    const logLines = reviewRun.rawLogCompressed?.lines ?? [];
    const totalTemplates = reviewRun.rawLogCompressed?.templates ?? logLines.length;
    const visibleLogCount = Math.min(logLines.length, 5);
    const overrideRate = 34; // mock — from calibration DB

    const panelClassName = phase === 'done' ? 'resume-pulse' : phase === 'idle' ? 'review-pulse' : '';

    return (
        <>
            <Toast message={toastMsg} visible={showToast} />

            {/* Dim overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-30"
                style={{ background: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}
            />

            <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`relative w-full max-w-[900px] rounded-2xl border ${panelClassName} mt-12`}
                    style={{
                        background: '#0D0D14',
                        borderColor: phase === 'done' ? 'rgba(99,102,241,0.3)' : 'rgba(244,63,94,0.2)',
                    }}
                >
                    {/* ── REVIEWER IDENTITY ────────────────────────────────────────── */}
                    <div className="absolute -top-12 left-0 right-0 flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm text-sm text-slate-300">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                {MOCK_AUTH.user.initials}
                            </div>
                            Reviewing as <span className="text-white font-medium">{MOCK_AUTH.user.name}</span> <span className="text-slate-500">·</span> {MOCK_AUTH.workspaceName}
                        </div>
                    </div>

                    {/* ── CRITICAL BANNER ──────────────────────────────────────────── */}
                    {isCritMainBranch && (
                        <div className="px-6 py-3 rounded-t-2xl flex items-center justify-between"
                            style={{ background: 'rgba(244,63,94,0.1)', borderBottom: '1px solid rgba(244,63,94,0.15)' }}>
                            <div className="flex items-center gap-2">
                                <Siren size={14} style={{ color: '#F43F5E' }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#F43F5E' }}>
                                    Critical · main branch · This will page the on-call team
                                </span>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={pagerDuty} onChange={e => setPagerDuty(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded accent-rose-500" />
                                <span style={{ color: '#FB7185' }}>Trigger PagerDuty now</span>
                            </label>
                        </div>
                    )}

                    {/* ── INCIDENT LEADER BANNER ───────────────────────────────────── */}
                    {isIncidentLeader && (
                        <div className="px-6 py-3 flex items-center gap-2"
                            style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                            <AlertTriangle size={13} style={{ color: '#F59E0B' }} />
                            <span className="text-xs font-medium" style={{ color: '#FBBF24' }}>
                                Incident {reviewRun.incidentId} · Your analysis will be shared with{' '}
                                {reviewRun.affectedRepos?.length ?? 3} other repos currently paused on the same failure
                            </span>
                        </div>
                    )}

                    {/* ── HEADER ───────────────────────────────────────────────────── */}
                    <div className="p-6 pb-0">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>
                                    Review required
                                </h1>
                                <p className="text-xs text-label flex flex-wrap items-center gap-1.5 mt-1">
                                    <span>Graph execution paused</span>
                                    <span className="text-white/30">·</span>
                                    <span className="text-white font-medium">{reviewRun.repo}</span>
                                    <span className="text-white/30">·</span>
                                    <span className="flex items-center gap-0.5 font-mono"><Hash size={9} />{reviewRun.runId}</span>
                                    <span className="text-white/30">·</span>
                                    <span className="flex items-center gap-0.5"><GitBranch size={9} />{reviewRun.branch}</span>
                                    <span className="text-white/30">·</span>
                                    <span>{reviewRun.stage}</span>
                                </p>
                            </div>
                            <ElapsedTimer since={reviewRun.startedAt} />
                        </div>
                        {/* Urgency bar */}
                        <div className="h-0.5 rounded-full shimmer-rose mt-4" />
                    </div>

                    {/* ── THREE-COLUMN LAYOUT ──────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
                        {/* Column 1: Model's case */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="rounded-xl p-4 space-y-4"
                            style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(139,92,246,0.4)' }}>
                            <p className="label-text flex items-center gap-1.5"><BookOpen size={10} />Model says</p>

                            {reviewRun.errorType && (
                                <div className="flex justify-center">
                                    <ErrorTypeBadge type={reviewRun.errorType} />
                                </div>
                            )}

                            <div className="flex justify-center">
                                <ReviewArcGauge value={conf} />
                            </div>

                            {reviewRun.modelReasoning && (
                                <p className="text-xs text-muted leading-relaxed">
                                    {reviewRun.modelReasoning.slice(0, 200)}…
                                </p>
                            )}

                            <div className="p-2.5 rounded-lg text-xs font-mono space-y-0.5"
                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="flex justify-between text-label">
                                    <span>Threshold ({reviewRun.errorType?.split(' ')[0]})</span>
                                    <span>{(threshold * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-label">
                                    <span>Score</span>
                                    <span style={{ color: conf < threshold ? '#F43F5E' : '#10B981' }}>{(conf * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between" style={{ color: '#F43F5E' }}>
                                    <span>Δ</span>
                                    <span>{delta} {conf < threshold ? 'below' : 'above'}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Column 2: Evidence */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="rounded-xl p-4 space-y-4"
                            style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(99,102,241,0.4)' }}>
                            <p className="label-text flex items-center gap-1.5"><Shield size={10} />Key evidence</p>

                            {/* Compressed log lines */}
                            <div className="code-block text-xs space-y-0.5 max-h-48 overflow-y-auto">
                                {logLines.slice(0, visibleLogCount).map((line: string, i: number) => (
                                    <div key={i} style={{ color: logLineColor(line) }}>{line}</div>
                                ))}
                            </div>

                            <p className="text-xs text-label">
                                Showing {visibleLogCount} of {totalTemplates} templates ·{' '}
                                <button className="underline hover:text-white transition-colors" style={{ color: '#818CF8' }}
                                    onClick={() => navigate(`/run/${reviewRun.id}`)}>
                                    View all
                                </button>
                            </p>

                            {/* Similar cases chips */}
                            {reviewRun.similarCases && reviewRun.similarCases.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs text-label">Similar past cases</p>
                                    {reviewRun.similarCases.slice(0, 3).map((c, i) => {
                                        const matchColor = c.similarityScore >= 0.9 ? '#10B981' : c.similarityScore >= 0.7 ? '#F59E0B' : '#9CA3AF';
                                        return (
                                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                <span className="text-white font-medium truncate">{c.repo}</span>
                                                <span className="ml-auto font-mono shrink-0" style={{ color: matchColor }}>
                                                    {Math.round(c.similarityScore * 100)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>

                        {/* Column 3: Your decision */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-xl p-4 space-y-4"
                            style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(255,255,255,0.2)' }}>
                            <p className="label-text flex items-center gap-1.5">Your call</p>

                            {/* Classification dropdown */}
                            <div>
                                <label className="text-xs text-label mb-1.5 block">Classification</label>
                                <div className="relative">
                                    <select
                                        className="input-base text-sm appearance-none pr-8 w-full"
                                        value={overrideClass}
                                        onChange={e => setOverrideClass(e.target.value as ErrorType | '')}
                                        aria-label="Override error classification"
                                    >
                                        <option value="">Keep: {reviewRun.errorType ?? 'Unknown'}</option>
                                        {ERROR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-label pointer-events-none" />
                                </div>
                                {/* Badge preview */}
                                {overrideClass && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2"
                                    >
                                        <ErrorTypeBadge type={overrideClass} />
                                    </motion.div>
                                )}
                            </div>

                            {/* Severity selector */}
                            <div>
                                <label className="text-xs text-label mb-1.5 block">Severity</label>
                                <SeverityPills selected={severity} onChange={setSeverity} />
                            </div>

                            {/* Correction note */}
                            <div>
                                <label className="text-xs text-label mb-1.5 block">Correction note</label>
                                <textarea
                                    className="input-base text-xs resize-none"
                                    style={{ minHeight: 72 }}
                                    placeholder="Tell the model why — saved to memory and calibration DB"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    aria-label="Correction note for the model"
                                />
                            </div>

                            {/* Save pattern toggle */}
                            <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                                <div
                                    className="relative w-9 h-5 rounded-full transition-colors duration-200"
                                    style={{ background: savePattern ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)' }}
                                    onClick={() => setSavePattern(!savePattern)}
                                >
                                    <motion.div
                                        className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                                        animate={{ left: savePattern ? 18 : 2 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    />
                                </div>
                                <span className="text-xs text-label">Mark as known pattern for this repo</span>
                            </label>
                        </motion.div>
                    </div>

                    {/* ── BOTTOM ACTION BAR ────────────────────────────────────────── */}
                    <div className="sticky bottom-0 px-6 py-4 rounded-b-2xl flex flex-col md:flex-row items-center justify-between gap-3"
                        style={{ background: 'rgba(13,13,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                        {/* Left: context */}
                        <p className="text-xs text-label text-center md:text-left">
                            This correction trains the model. Override rate for{' '}
                            <span className="text-white font-medium">{reviewRun.errorType ?? 'Unknown'}</span>:{' '}
                            <span className="font-mono" style={{ color: overrideRate > 25 ? '#F59E0B' : '#10B981' }}>{overrideRate}%</span>
                        </p>

                        {/* Right: action buttons */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={handleDiscard}
                                disabled={phase !== 'idle'}
                                className="btn-secondary h-10 text-xs gap-1.5"
                                style={confirmDiscard ? { borderColor: 'rgba(244,63,94,0.4)', color: '#F43F5E' } : {}}
                                aria-label="Discard run"
                            >
                                <Trash2 size={12} />
                                {confirmDiscard ? 'Confirm discard?' : 'Discard run'}
                            </button>

                            <button
                                onClick={handleOverrideResume}
                                disabled={phase !== 'idle'}
                                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                    boxShadow: '0 0 24px rgba(99,102,241,0.3)',
                                    opacity: phase !== 'idle' ? 0.7 : 1,
                                }}
                                aria-label="Override and resume graph"
                            >
                                {phase === 'resuming' ? (
                                    <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                                            <Loader2 size={14} />
                                        </motion.div>
                                        Resuming…
                                    </>
                                ) : phase === 'done' ? (
                                    <>
                                        <CheckCircle2 size={14} />
                                        Resumed ✓
                                    </>
                                ) : (
                                    'Override & resume'
                                )}
                            </button>

                            <button
                                onClick={handleAcceptModel}
                                disabled={phase !== 'idle'}
                                className="btn-secondary h-10 text-xs"
                                aria-label="Accept model classification"
                            >
                                Accept model
                            </button>
                        </div>
                    </div>

                    {/* ── KEYBOARD SHORTCUTS HINT ──────────────────────────────────── */}
                    <div
                        className="absolute bottom-16 left-6 flex items-center gap-4 text-xs text-label"
                        style={{ opacity: 0.5 }}
                    >
                        <Keyboard size={11} className="mr-0.5" />
                        <span><kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>Enter</kbd> Accept</span>
                        <span><kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>⌘+Enter</kbd> Override</span>
                        <span><kbd className="font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>Esc</kbd> Discard</span>
                    </div>
                </motion.div>
            </div>
        </>
    );
}
