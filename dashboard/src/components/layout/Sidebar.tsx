import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, FileSearch, UserCheck, BarChart3, GitBranch,
    CreditCard, Users, Bell, Key, MoreHorizontal, Settings2,
    LogOut, Cpu, X
} from 'lucide-react';
import { useRuns } from '../../hooks/usePipelineData';
import { WorkspaceSwitcher } from '../shared/WorkspaceSwitcher';

/* ═══════════════════════════════════════════════════════════════════════════
   NAV CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */
const MAIN_NAV = [
    { to: '/', icon: Activity, label: 'Live feed' },
    { to: '/runs', icon: FileSearch, label: 'Runs' },
    { to: '/review', icon: UserCheck, label: 'Review queue', hasBadge: true },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings/repos', icon: GitBranch, label: 'Repositories' },
];

const SETTINGS_NAV = [
    { to: '/settings/team', icon: Users, label: 'Team' },
    { to: '/settings/notifications', icon: Bell, label: 'Notifications' },
    { to: '/settings/api-keys', icon: Key, label: 'API keys' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

export function Sidebar() {
    const { data: runs } = useRuns();
    const location = useLocation();
    const pendingReview = runs?.filter(r => r.needsHumanReview).length ?? 0;

    // Mock WebSocket connection state
    const [wsState, setWsState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    // Active link styles
    const getLinkClass = (isActive: boolean) => {
        return `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden ${isActive
            ? 'bg-indigo-500/10 text-white'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
            }`;
    };

    const getIconClass = (isActive: boolean) => {
        return `shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`;
    };

    // Auto-close mobile sheet on route change
    useEffect(() => {
        setMobileSheetOpen(false);
    }, [location.pathname]);

    return (
        <>
            {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col h-screen w-[220px] fixed left-0 top-0 z-40 bg-[#111118] border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">

                {/* 1. Header (Logo & Workspace) */}
                <div className="pt-4 px-4 pb-2">
                    <div className="flex items-center gap-2.5 h-10 mb-2">
                        <div className="w-7 h-7 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Cpu size={14} className="text-indigo-400" />
                        </div>
                        <span className="text-base font-bold tracking-tight text-white drop-shadow-sm">PipelineIQ</span>
                    </div>

                    <WorkspaceSwitcher triggerClassName="w-full justify-between bg-white/[0.02] hover:bg-white/[0.06] border-white/5 py-1.5 px-3 h-9 text-sm rounded-lg" />
                </div>

                {/* 2. Main Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden px-3 py-3 space-y-6">

                    {/* Core Routes */}
                    <nav className="space-y-0.5" aria-label="Main Navigation">
                        {MAIN_NAV.map(({ to, icon: Icon, label, hasBadge }) => (
                            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => getLinkClass(isActive)}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                        <Icon size={16} className={getIconClass(isActive)} />
                                        <span className="flex-1 truncate leading-none pt-px">{label}</span>
                                        {hasBadge && pendingReview > 0 && (
                                            <span className="relative flex items-center justify-center h-5 px-1.5 min-w-[20px] rounded-full bg-rose-500/20 border border-rose-500/20 text-[10px] font-mono font-bold text-rose-400">
                                                <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping opacity-50" />
                                                {pendingReview}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Settings Divider */}
                    <div className="px-3">
                        <div className="h-px bg-white/5" />
                    </div>

                    {/* Settings Routes */}
                    <nav className="space-y-0.5" aria-label="Settings Navigation">
                        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Settings</p>
                        {SETTINGS_NAV.map(({ to, icon: Icon, label }) => (
                            <NavLink key={to} to={to} className={({ isActive }) => getLinkClass(isActive)}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                        <Icon size={16} className={getIconClass(isActive)} />
                                        <span className="flex-1 truncate leading-none pt-px">{label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* 3. Bottom Profile Area */}
                <div className="p-3">
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-col gap-3">
                        {/* Status */}
                        <div className="flex items-center gap-2 group relative cursor-default w-max">
                            <span className="relative flex h-2 w-2">
                                {wsState === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${wsState === 'connected' ? 'bg-emerald-500' :
                                    wsState === 'reconnecting' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}></span>
                            </span>
                            <span className="text-xs text-slate-400 font-medium capitalize truncate">
                                {wsState}
                            </span>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-slate-200 text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                Live updates: {wsState}
                            </div>
                        </div>

                        {/* User */}
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-1 -m-1 rounded-lg transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                    AL
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-medium text-white truncate leading-tight">Alex L.</p>
                                </div>
                            </div>
                            <button className="text-slate-500 group-hover:text-rose-400 transition-colors p-1" title="Sign out">
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── MOBILE BOTTOM TAB BAR ───────────────────────────────────────────── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111118]/90 backdrop-blur-lg border-t border-white/10 pb-safe">
                <div className="flex items-center justify-around h-16 px-2">
                    {MAIN_NAV.slice(0, 4).map(({ to, icon: Icon, label, hasBadge }) => (
                        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 relative transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <motion.div layoutId="mobile-indicator" className="absolute top-0 w-8 h-0.5 bg-indigo-500 rounded-b-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                    <Icon size={20} />
                                    <span className="text-[10px] font-medium leading-none">{label}</span>
                                    {hasBadge && pendingReview > 0 && (
                                        <span className="absolute top-2 right-[20%] w-2 h-2 rounded-full bg-rose-500 animate-pulse border-2 border-[#111118]" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Mobile Menu Trigger */}
                    <button
                        onClick={() => setMobileSheetOpen(true)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${mobileSheetOpen ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Settings2 size={20} />
                        <span className="text-[10px] font-medium leading-none">Settings</span>
                    </button>
                </div>
            </div>

            {/* Mobile Sheet Overlay */}
            <AnimatePresence>
                {mobileSheetOpen && (
                    <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center pointer-events-none pb-16">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setMobileSheetOpen(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full bg-[#1A1A24] border-t border-white/10 rounded-t-2xl shadow-2xl pointer-events-auto overflow-hidden pb-safe"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <h3 className="text-sm font-semibold text-white">More Options</h3>
                                <button onClick={() => setMobileSheetOpen(false)} className="text-slate-400 hover:text-white bg-white/5 rounded-full p-1"><X size={16} /></button>
                            </div>

                            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                <div className="mb-4">
                                    <WorkspaceSwitcher triggerClassName="w-full justify-between bg-white/[0.04] border-white/10 py-2 px-3 h-10 text-sm rounded-lg" />
                                </div>

                                <nav className="space-y-1">
                                    <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Projects</p>
                                    <NavLink to="/settings/repos" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300 active:bg-white/5'}`}>
                                        <GitBranch size={16} /> Repositories
                                    </NavLink>
                                </nav>

                                <div className="h-px bg-white/5 mx-2" />

                                <nav className="space-y-1">
                                    <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Workspace Settings</p>
                                    {SETTINGS_NAV.map(({ to, icon: Icon, label }) => (
                                        <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300 active:bg-white/5'}`}>
                                            <Icon size={16} />
                                            <span className="flex-1">{label}</span>
                                        </NavLink>
                                    ))}
                                </nav>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
