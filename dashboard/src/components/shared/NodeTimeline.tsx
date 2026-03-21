import { motion } from 'framer-motion';
import { CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react';
import { NODE_ORDER, NODE_LABELS } from '../../lib/constants';

interface NodeTimelineProps {
    currentNode?: string;
    status?: string;
    nodeProgress?: number;
}

function nodeStatus(node: string, current: string | undefined, runStatus: string | undefined, idx: number, currentIdx: number) {
    if (runStatus === 'failed' && idx === currentIdx) return 'failed';
    if (runStatus === 'completed') return 'done';
    if (!current) return 'pending';
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'active';
    return 'pending';
}

export function NodeTimeline({ currentNode, status, nodeProgress }: NodeTimelineProps) {
    const currentIdx = currentNode ? NODE_ORDER.indexOf(currentNode) : -1;
    return (
        <div className="flex flex-col gap-0" role="list" aria-label="Pipeline node progress">
            {NODE_ORDER.map((node, idx) => {
                const ns = nodeStatus(node, currentNode, status, idx, currentIdx);
                return (
                    <motion.div
                        key={node}
                        role="listitem"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                        style={{ background: ns === 'active' ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                    >
                        <div className="flex flex-col items-center" style={{ width: 16 }}>
                            {ns === 'done' && <CheckCircle2 size={14} color="#10B981" />}
                            {ns === 'active' && (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                                    <Loader2 size={14} color="#6366F1" />
                                </motion.div>
                            )}
                            {ns === 'failed' && <XCircle size={14} color="#F43F5E" />}
                            {ns === 'pending' && <Circle size={14} color="#22222F" />}
                            {idx < NODE_ORDER.length - 1 && (
                                <div style={{ width: 1, height: 8, background: ns === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                            )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                            <span
                                className="text-xs font-medium"
                                style={{
                                    color: ns === 'active' ? '#818CF8' : ns === 'done' ? '#34D399' : ns === 'failed' ? '#F43F5E' : '#6B6B80',
                                }}
                            >
                                {NODE_LABELS[node] ?? node}
                            </span>
                            {ns === 'active' && nodeProgress !== undefined && (
                                <span className="text-xs font-mono text-label">{nodeProgress}%</span>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
