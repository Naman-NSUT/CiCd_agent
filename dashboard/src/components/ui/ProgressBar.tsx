import { motion } from 'framer-motion';

interface ProgressBarProps {
    value: number; // 0–100
    color?: string;
    height?: number;
    shimmer?: boolean;
    className?: string;
}

export function ProgressBar({ value, color = '#6366F1', height = 4, shimmer = false, className = '' }: ProgressBarProps) {
    return (
        <div
            className={`overflow-hidden rounded-full ${className}`}
            style={{ height, background: 'rgba(255,255,255,0.06)' }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: color, borderRadius: 'inherit', position: 'relative' }}
            >
                {shimmer && (
                    <div
                        className="shimmer absolute inset-0"
                        style={{ borderRadius: 'inherit' }}
                    />
                )}
            </motion.div>
        </div>
    );
}
