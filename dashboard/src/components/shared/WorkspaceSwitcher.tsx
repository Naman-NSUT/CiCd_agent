import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, UserPlus, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export interface Workspace {
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
}

const MOCK_WORKSPACES: Workspace[] = [
    { id: 'ws_123', name: 'Acme Corp', plan: 'free' },
    { id: 'ws_456', name: 'Stark Industries', plan: 'pro' },
    { id: 'ws_789', name: 'Wayne Enterprises', plan: 'enterprise' }
];

export function useCurrentWorkspace() {
    const [id, setId] = useState(() => localStorage.getItem('workspace_id') || 'ws_123');

    useEffect(() => {
        const handleStorage = () => {
            const newId = localStorage.getItem('workspace_id') || 'ws_123';
            if (newId !== id) setId(newId);
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('workspaceChange', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('workspaceChange', handleStorage);
        };
    }, [id]);

    const workspace = MOCK_WORKSPACES.find(w => w.id === id) || MOCK_WORKSPACES[0];
    return workspace;
}

export function WorkspaceSwitcher({ triggerClassName }: { triggerClassName?: string }) {
    const currentWorkspace = useCurrentWorkspace();
    const [open, setOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loadingWs, setLoadingWs] = useState<Workspace | null>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleSwitch = (ws: Workspace) => {
        if (ws.id === currentWorkspace.id) {
            setOpen(false);
            return;
        }
        setOpen(false);
        setLoadingWs(ws);

        localStorage.setItem('workspace_id', ws.id);

        // Mock 300ms transition
        setTimeout(async () => {
            await queryClient.invalidateQueries();
            window.dispatchEvent(new Event('workspaceChange'));
            setLoadingWs(null);
            navigate('/');
        }, 300);
    };

    return (
        <div className="relative z-50">
            {/* Loading Overlay */}
            <AnimatePresence>
                {loadingWs && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                <Loader2 size={32} className="text-indigo-400" />
                            </motion.div>
                            <p className="text-white font-medium">Switching to {loadingWs.name}...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trigger Button */}
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm font-medium text-white shadow-sm ${triggerClassName || ''}`}
            >
                <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {currentWorkspace.name.charAt(0)}
                </div>
                {currentWorkspace.name}
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40" onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full text-left left-0 mt-2 w-[240px] bg-slate-900/95 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.15)] overflow-hidden z-50 border border-indigo-500/30"
                        >
                            <div className="px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-900 border-b border-white/5">
                                Your workspaces
                            </div>

                            <div className="py-1">
                                {MOCK_WORKSPACES.map(ws => {
                                    const isCurrent = ws.id === currentWorkspace.id;
                                    return (
                                        <button
                                            key={ws.id}
                                            onClick={() => handleSwitch(ws)}
                                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors group relative"
                                        >
                                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-sm" style={{
                                                background: ws.plan === 'enterprise' ? '#8B5CF620' : ws.plan === 'pro' ? '#10B98120' : '#6366F120',
                                                color: ws.plan === 'enterprise' ? '#A78BFA' : ws.plan === 'pro' ? '#34D399' : '#818CF8'
                                            }}>
                                                {ws.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-white">{ws.name}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{ws.plan}</div>
                                            </div>
                                            {isCurrent && <Check size={14} className="text-indigo-400 mr-1" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-white/10 my-1 mx-2" />

                            <div className="py-1">
                                <button
                                    onClick={() => { setOpen(false); setShowCreateModal(true); }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                >
                                    <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-slate-400">
                                        <Plus size={14} />
                                    </div>
                                    <span className="font-medium">Create new workspace</span>
                                </button>
                                <button
                                    onClick={() => { setOpen(false); navigate('/settings'); }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                >
                                    <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-slate-400">
                                        <UserPlus size={14} />
                                    </div>
                                    <span className="font-medium">Invite to workspace</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create Workspace Modal */}
            <CreateWorkspaceModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={(ws) => {
                    handleSwitch(ws);
                    navigate('/onboarding');
                }}
            />
        </div>
    );
}

function CreateWorkspaceModal({ open, onClose, onCreated }: { open: boolean, onClose: () => void, onCreated: (ws: Workspace) => void }) {
    const [name, setName] = useState('');
    const [plan, setPlan] = useState<'free' | 'pro' | 'enterprise'>('free');

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const newWs: Workspace = { id: `ws_${Date.now()}`, name, plan };
        MOCK_WORKSPACES.push(newWs);
        onCreated(newWs);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full p-6 shadow-2xl relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><XCircle size={20} /></button>
                <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">Create new workspace</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Workspace Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Acme Engineering"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Plan</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['free', 'pro', 'enterprise'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPlan(p as any)}
                                    className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${plan === p ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">
                            Create Workspace
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
