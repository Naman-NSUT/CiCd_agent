import { Bell, Moon, Sun, Search } from 'lucide-react';
import { useState } from 'react';
import { StatusDot } from '../ui/StatusDot';
import { WorkspaceSwitcher } from '../shared/WorkspaceSwitcher';

interface TopBarProps {
    title: string;
}

export function TopBar({ title }: TopBarProps) {
    const [dark, setDark] = useState(true);

    return (
        <header
            className="flex items-center justify-between px-6 h-14 shrink-0 border-b z-30 relative"
            style={{ background: 'rgba(17,17,24,0.95)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
            role="banner"
        >
            <div className="flex items-center gap-3 md:hidden">
                <WorkspaceSwitcher />
            </div>

            <div className="hidden md:flex items-center gap-3">
                <h1 className="text-sm font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>{title}</h1>
                <span className="flex items-center gap-1.5 text-xs text-label">
                    <StatusDot active size="sm" />
                    <span style={{ color: '#10B981' }}>Live</span>
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-label" />
                    <input
                        className="input-base pl-8 h-8 text-xs w-48"
                        placeholder="Search runs…"
                        aria-label="Search pipeline runs"
                    />
                </div>

                {/* Notifications */}
                <button
                    className="btn-secondary h-8 w-8 p-0 justify-center relative"
                    aria-label="Notifications"
                >
                    <Bell size={14} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                </button>

                {/* Theme toggle */}
                <button
                    onClick={() => setDark(!dark)}
                    className="btn-secondary h-8 w-8 p-0 justify-center"
                    aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {dark ? <Moon size={14} /> : <Sun size={14} />}
                </button>

                {/* Avatar */}
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                    aria-label="User avatar"
                >
                    AI
                </div>
            </div>
        </header>
    );
}
