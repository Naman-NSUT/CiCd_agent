import type { Severity } from '../../types/pipeline';
import { SEVERITY_COLORS } from '../../lib/constants';

interface StatusDotProps {
    severity?: Severity;
    active?: boolean;
    size?: 'sm' | 'md';
}

export function StatusDot({ severity, active = false, size = 'md' }: StatusDotProps) {
    const color = severity ? SEVERITY_COLORS[severity].pulse : (active ? '#6366F1' : '#6B6B80');
    const sz = size === 'sm' ? 6 : 8;
    return (
        <span
            className={active || severity ? 'animate-pulse' : ''}
            style={{
                display: 'inline-block',
                width: sz, height: sz,
                borderRadius: '50%',
                backgroundColor: color,
                boxShadow: active || severity ? `0 0 6px ${color}` : 'none',
                flexShrink: 0,
            }}
        />
    );
}
