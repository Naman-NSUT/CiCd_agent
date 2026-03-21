import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    onClick?: () => void;
}

export function Card({ children, className = '', hover = false, glow = false, onClick }: CardProps) {
    return (
        <motion.div
            onClick={onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`${hover ? 'glass-card-hover' : 'glass-card'} ${glow ? 'shadow-glow' : ''} ${className}`}
            style={onClick ? { cursor: 'pointer' } : undefined}
        >
            {children}
        </motion.div>
    );
}
