import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CheckCircle2, AlertTriangle, Clock, Hash,
    GitBranch, CheckSquare, Square
} from 'lucide-react';
import { useRuns } from '../hooks/usePipelineData';
import { formatDistanceToNow } from 'date-fns';
import { ErrorTypeBadge } from '../components/shared/ErrorTypeBadge';
import { Card } from '../components/ui/Card';

const MOCK_AUTH = {
    workspaceId: 'ws_123',
    workspaceName: 'Acme Corp',
    user: { name: 'Jane Doe', initials: 'JD', id: 'usr_1' },
    role: 'admin'
};

export function ReviewQueue() {
    const navigate = useNavigate();
    const { data: runs = [] } = useRuns(MOCK_AUTH.workspaceId);

    const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());

    // Filter runs needing human review
    const reviewRuns = useMemo(() => {
        const paused = runs.filter(r => r.needsHumanReview);
        // Sort by longest waiting
        paused.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
        // For demonstration purposes, assign pseudo state if it doesn't exist
        return paused.map(r => ({
            ...r,
            assigneeId: (r as any).assigneeId || null // Mocking assignment
        }));
    }, [runs]);

    const handleAssignToMe = () => {
        // Mock assigning
        alert(`Assigned ${selectedRuns.size} runs to me.`);
        setSelectedRuns(new Set());
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedRuns);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedRuns(next);
    };

    if (reviewRuns.length === 0) {
        return (
            <div className="max-w-4xl mx-auto pt-32 animate-fade-in flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <motion.div animate={{ scale: [0.9, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">All pipelines running smoothly</h2>
                <p className="text-slate-400">No runs waiting for review</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Review Queue</h1>
                    <p className="text-sm text-slate-400">Review and classify paused pipeline executions.</p>
                </div>

                {selectedRuns.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                        <span className="text-sm font-medium text-indigo-400">{selectedRuns.size} selected</span>
                        <button onClick={handleAssignToMe} className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded shadow-sm transition-colors">
                            Assign to me
                        </button>
                    </motion.div>
                )}
            </div>

            <Card className="overflow-hidden border border-slate-700/60 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <th className="px-5 py-4 w-12 text-center">
                                    <button onClick={() => setSelectedRuns(selectedRuns.size === reviewRuns.length ? new Set() : new Set(reviewRuns.map(r => r.id)))} className="hover:text-white transition-colors">
                                        {selectedRuns.size === reviewRuns.length && reviewRuns.length > 0 ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="px-5 py-4">Repository</th>
                                <th className="px-5 py-4">Error Type</th>
                                <th className="px-5 py-4 text-right">Confidence</th>
                                <th className="px-5 py-4">State</th>
                                <th className="px-5 py-4 text-right">Waiting</th>
                                <th className="px-5 py-4 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {reviewRuns.map(run => {
                                const isSelected = selectedRuns.has(run.id);
                                const waitTime = formatDistanceToNow(run.startedAt, { addSuffix: false });
                                const conf = run.confidenceScore ?? 0;
                                const confColor = conf >= 0.85 ? '#10B981' : conf >= 0.7 ? '#F59E0B' : '#F43F5E';

                                return (
                                    <tr key={run.id} className={`hover:bg-white/[0.04] transition-colors group ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                                        <td className="px-5 py-4 text-center">
                                            <button onClick={() => toggleSelect(run.id)} className="text-slate-500 group-hover:text-white transition-colors">
                                                {isSelected ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-white mb-1 tracking-tight">{run.repo}</div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1 text-slate-400"><GitBranch size={10} />{run.branch}</span>
                                                <span className="text-slate-600">·</span>
                                                <span className="font-mono text-indigo-400 flex items-center gap-0.5"><Hash size={10} />{run.runId}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {run.errorType ? <ErrorTypeBadge type={run.errorType} /> : <span className="text-slate-500 text-xs text-center">—</span>}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="font-mono font-bold" style={{ color: confColor }}>
                                                {Math.round(conf * 100)}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {run.assigneeId ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-indigo-400/20">
                                                        {run.assigneeId === MOCK_AUTH.user.id ? MOCK_AUTH.user.initials : 'U'}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-300">{run.assigneeId === MOCK_AUTH.user.id ? 'You' : 'Assigned'}</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                                                    <AlertTriangle size={12} /> Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 text-slate-300 font-medium">
                                                <Clock size={12} className="text-slate-500" />
                                                <span className="font-mono">{waitTime}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/review/${run.id}`)}
                                                className="btn-secondary h-9 px-4 text-xs font-bold border border-slate-700 bg-white/5 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 shadow-sm transition-all rounded-lg"
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
