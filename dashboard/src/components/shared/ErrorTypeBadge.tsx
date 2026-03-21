import type { ErrorType } from '../../types/pipeline';
import { ERROR_TYPE_COLORS } from '../../lib/constants';

interface ErrorTypeBadgeProps {
    type: ErrorType;
    className?: string;
}

export function ErrorTypeBadge({ type, className = '' }: ErrorTypeBadgeProps) {
    const c = ERROR_TYPE_COLORS[type];
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${className}`}
            style={{
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.border}`,
                fontSize: '11px',
                letterSpacing: '0.02em',
                boxShadow: `0 0 8px ${c.glow}`,
                whiteSpace: 'nowrap',
            }}
        >
            {type}
        </span>
    );
}
