import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    label: string;
    value: string | number;
    sub?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: ReactNode;
    accentColor?: string;
    delay?: number;
}

export function MetricCard({ label, value, sub, trend, trendValue, icon, accentColor = '#6366F1', delay = 0 }: MetricCardProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#F43F5E' : '#6B6B80';
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-5 flex flex-col gap-3"
        >
            <div className="flex items-center justify-between">
                <span className="label-text">{label}</span>
                {icon && (
                    <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${accentColor}20`, color: accentColor }}
                    >
                        {icon}
                    </span>
                )}
            </div>
            <div>
                <div className="text-3xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                    {value}
                </div>
                {sub && <p className="text-xs text-label mt-1">{sub}</p>}
            </div>
            {trend && trendValue && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: trendColor }}>
                    <TrendIcon size={12} />
                    <span>{trendValue}</span>
                </div>
            )}
            <div className="h-0.5 rounded-full" style={{ background: `${accentColor}30` }} />
        </motion.div>
    );
}
