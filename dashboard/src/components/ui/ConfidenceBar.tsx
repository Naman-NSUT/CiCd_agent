import { motion } from 'framer-motion';

interface ConfidenceBarProps {
    value: number; // 0–1
    className?: string;
}

function getColor(v: number) {
    if (v >= 0.85) return '#10B981';
    if (v >= 0.70) return '#F59E0B';
    return '#F43F5E';
}

export function ConfidenceBar({ value, className = '' }: ConfidenceBarProps) {
    const pct = Math.round(value * 100);
    const color = getColor(value);
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div
                className="flex-1 overflow-hidden rounded-full"
                style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
            >
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: '100%', background: color, borderRadius: 'inherit' }}
                />
            </div>
            <span className="font-mono text-xs font-medium tabular-nums" style={{ color, minWidth: 34 }}>
                {pct}%
            </span>
        </div>
    );
}
