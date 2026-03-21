/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bg0: '#0A0A0F',
                bg1: '#111118',
                bg2: '#1A1A24',
                bg3: '#22222F',
                indigo: { 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5' },
                violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
                emerald: { 400: '#34D399', 500: '#10B981' },
                amber: { 400: '#FBBF24', 500: '#F59E0B' },
                rose: { 400: '#FB7185', 500: '#F43F5E' },
                muted: '#A1A1B5',
                label: '#6B6B80',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            borderRadius: { card: '12px' },
            transitionTimingFunction: { premium: 'cubic-bezier(0.16, 1, 0.3, 1)' },
            transitionDuration: { DEFAULT: '200ms' },
            backdropBlur: { card: '12px' },
            boxShadow: {
                glow: '0 0 20px rgba(99,102,241,0.15)',
                'glow-hover': '0 0 30px rgba(99,102,241,0.25)',
                'glow-rose': '0 0 20px rgba(244,63,94,0.2)',
                'glow-emerald': '0 0 20px rgba(16,185,129,0.15)',
                'glow-amber': '0 0 20px rgba(245,158,11,0.15)',
            },
            animation: {
                pulse: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                shimmer: 'shimmer 2s linear infinite',
                'fade-in': 'fadeIn 0.15s ease-out',
                'slide-up': 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                fadeIn: {
                    from: { opacity: '0' }, to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
