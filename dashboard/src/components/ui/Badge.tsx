import type { Severity } from '../../types/pipeline';
import { SEVERITY_COLORS } from '../../lib/constants';

interface BadgeProps {
    label: string;
    severity?: Severity;
    variant?: 'default' | 'outline';
    className?: string;
}

export function Badge({ label, severity, variant = 'default', className = '' }: BadgeProps) {
    const colors = severity ? SEVERITY_COLORS[severity] : null;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${className}`}
            style={{
                background: colors ? colors.bg : 'rgba(255,255,255,0.08)',
                color: colors ? colors.text : '#A1A1B5',
                border: variant === 'outline' ? `1px solid ${colors ? colors.text : 'rgba(255,255,255,0.2)'}` : 'none',
                letterSpacing: '0.04em',
                fontSize: '11px',
            }}
        >
            {label}
        </span>
    );
}
