import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { GitBranch, AlertCircle, Link2 } from 'lucide-react';
import type { PipelineRun } from '../../types/pipeline';
import { ErrorTypeBadge } from './ErrorTypeBadge';
import { Badge } from '../ui/Badge';
import { StatusDot } from '../ui/StatusDot';
import { ConfidenceBar } from '../ui/ConfidenceBar';
import { STATUS_LABELS } from '../../lib/constants';
import { useNavigate } from 'react-router-dom';

interface RunRowProps {
    run: PipelineRun;
    index?: number;
}

export function RunRow({ run, index = 0 }: RunRowProps) {
    const navigate = useNavigate();
    const timeAgo = formatDistanceToNow(run.startedAt, { addSuffix: true });
    const isActive = !['completed', 'failed'].includes(run.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate(`/run/${run.id}`)}
            className="glass-card-hover p-4 cursor-pointer"
            role="row"
            aria-label={`Pipeline run for ${run.repo}`}
        >
            <div className="flex items-start gap-4">
                {/* Status indicator */}
                <div className="flex flex-col items-center gap-1 pt-1">
                    <StatusDot severity={run.severity} active={isActive} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-white text-sm truncate">{run.repo}</span>
                            <span className="flex items-center gap-1 text-xs text-label shrink-0">
                                <GitBranch size={10} />
                                {run.branch}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {run.needsHumanReview && (
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                    <AlertCircle size={11} />
                                    Review
                                </span>
                            )}
                            {run.isCorrelated && run.incidentId && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: '#67E8F9' }}>
                                    <Link2 size={11} />
                                    {run.incidentId.slice(0, 16)}
                                </span>
                            )}
                            <span className="text-xs text-label font-mono">{timeAgo}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {run.errorType && <ErrorTypeBadge type={run.errorType} />}
                        {run.severity && <Badge label={run.severity.toUpperCase()} severity={run.severity} />}
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                                background: run.status === 'completed' ? 'rgba(16,185,129,0.12)' :
                                    run.status === 'failed' ? 'rgba(244,63,94,0.12)' :
                                        run.status === 'paused_review' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                                color: run.status === 'completed' ? '#34D399' :
                                    run.status === 'failed' ? '#F43F5E' :
                                        run.status === 'paused_review' ? '#FBBF24' : '#818CF8',
                            }}
                        >
                            {STATUS_LABELS[run.status] ?? run.status}
                        </span>
                        <span className="text-xs text-label">{run.stage} stage</span>
                    </div>

                    {run.confidenceScore !== undefined && (
                        <ConfidenceBar value={run.confidenceScore} className="max-w-48" />
                    )}
                </div>

                {/* Duration */}
                {run.durationMs && (
                    <div className="text-right shrink-0">
                        <span className="font-mono text-xs text-label">
                            {(run.durationMs / 1000).toFixed(1)}s
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
