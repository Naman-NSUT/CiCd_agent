import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Key, Plus, Copy, CheckCheck, Trash2, AlertTriangle,
    Terminal, FileCode2, ChevronRight, Check, X
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════ */
type Scope = 'analyze:read' | 'analyze:write' | 'repos:read' | 'webhook:write';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    scopes: Scope[];
    revoked: boolean;
    revokedAt?: string;
}

const MOCK_KEYS: ApiKey[] = [
    {
        id: 'k1', name: 'CI Script Data Fetcher', prefix: 'sk-live-a7b9...',
        createdAt: '2026-02-15T10:00:00Z', lastUsedAt: '2026-03-21T00:15:00Z',
        scopes: ['analyze:read', 'repos:read'], revoked: false
    },
    {
        id: 'k2', name: 'Grafana Integration', prefix: 'sk-live-x2m4...',
        createdAt: '2026-01-10T09:30:00Z', lastUsedAt: '2026-03-20T14:45:00Z',
        scopes: ['analyze:read'], revoked: false
    },
    {
        id: 'k3', name: 'Legacy Webhook Sync', prefix: 'sk-live-m9v1...',
        createdAt: '2025-11-05T11:20:00Z', lastUsedAt: '2026-02-28T08:10:00Z',
        scopes: ['webhook:write', 'repos:read'], revoked: true, revokedAt: '2026-03-20T10:00:00Z'
    }
];

const SCOPE_DEFS: { id: Scope; label: string; desc: string }[] = [
    { id: 'analyze:read', label: 'analyze:read', desc: 'Fetch analysis results and pipeline status' },
    { id: 'analyze:write', label: 'analyze:write', desc: 'Trigger new analyses programmatically' },
    { id: 'repos:read', label: 'repos:read', desc: 'List connected repositories and settings' },
    { id: 'webhook:write', label: 'webhook:write', desc: 'Register or modify webhook configurations' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */
function CopyBtn({ value, className = '' }: { value: string, className?: string }) {
    const [done, setDone] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setDone(true); setTimeout(() => setDone(false), 2000);
    };
    return (
        <button onClick={copy} className={`btn-secondary h-7 px-2 gap-1 text-xs ${className}`} aria-label="Copy to clipboard">
            {done ? <CheckCheck size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
        </button>
    );
}

function SectionTitle({ children, desc }: { children: React.ReactNode, desc?: string }) {
    return (
        <div className="mb-5">
            <h2 className="text-base font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>{children}</h2>
            {desc && <p className="text-xs text-label mt-1">{desc}</p>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function ApiKeys() {
    const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
    const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

    // Create Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newScopes, setNewScopes] = useState<Scope[]>(['analyze:read']);
    const [expiry, setExpiry] = useState('30');

    // Post-Creation State
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedCheckbox, setCopiedCheckbox] = useState(false);

    // Usage Snippets tab
    const [snippetTab, setSnippetTab] = useState<'curl' | 'python'>('curl');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newScopes.length === 0) return;

        // Mock generation
        const fakeFullKey = `sk-live-${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        const keyObj: ApiKey = {
            id: `k${Date.now()}`,
            name: newName,
            prefix: fakeFullKey.substring(0, 12) + '...',
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            scopes: newScopes,
            revoked: false
        };

        setKeys([keyObj, ...keys]);
        setNewlyCreatedKey(fakeFullKey);
        setIsCreating(false);
        setNewName('');
        setNewScopes(['analyze:read']);
        setCopiedCheckbox(false);
    };

    const handleRevoke = (id: string) => {
        setKeys(keys.map(k => k.id === id ? { ...k, revoked: true, revokedAt: new Date().toISOString() } : k));
        setRevokeConfirm(null);
    };

    return (
        <div className="space-y-10 animate-fade-in pb-10">

            {/* ── SECTION 1: API KEYS LIST ───────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <SectionTitle desc="Manage API keys for programmatic access to PipelineIQ.">API Keys</SectionTitle>
                    <button onClick={() => setIsCreating(true)} className="btn-primary h-9 gap-1.5 px-4 text-sm font-medium">
                        <Plus size={14} />Create new key
                    </button>
                </div>

                <Card className="overflow-hidden border border-white/5 bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-label">
                                    <th className="font-medium p-4 py-3">Name</th>
                                    <th className="font-medium p-4 py-3">Prefix</th>
                                    <th className="font-medium p-4 py-3">Created</th>
                                    <th className="font-medium p-4 py-3">Last used</th>
                                    <th className="font-medium p-4 py-3">Scopes</th>
                                    <th className="font-medium p-4 py-3 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-white/5">
                                {keys.map(k => (
                                    <tr key={k.id} className={`group transition-colors hover:bg-white/[0.02] ${k.revoked ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="p-4 py-3 text-white font-medium">
                                            <div className="flex items-center gap-2">
                                                <Key size={13} className={k.revoked ? 'text-slate-500' : 'text-indigo-400'} />
                                                <span className={k.revoked ? 'line-through text-slate-400' : ''}>{k.name}</span>
                                                {k.revoked && <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 ml-2">Revoked</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 py-3 font-mono text-xs text-muted">
                                            {k.prefix}
                                        </td>
                                        <td className="p-4 py-3 text-xs text-label whitespace-nowrap">
                                            {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}
                                        </td>
                                        <td className="p-4 py-3 text-xs text-label whitespace-nowrap">
                                            {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true }) : 'Never'}
                                        </td>
                                        <td className="p-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {k.scopes.map(s => (
                                                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 py-3 text-right relative">
                                            {!k.revoked && (
                                                <div className="flex justify-end">
                                                    {revokeConfirm === k.id ? (
                                                        <div className="flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2 bg-[#1A1A24] pl-4 py-1 z-10 shadow-[-12px_0_12px_#1A1A24]">
                                                            <span className="text-xs text-rose-400">Revoke?</span>
                                                            <button onClick={() => handleRevoke(k.id)} className="text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded">Yes</button>
                                                            <button onClick={() => setRevokeConfirm(null)} className="text-xs text-slate-400 hover:text-white px-2 py-1">No</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setRevokeConfirm(k.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-500/10"
                                                        >
                                                            <Trash2 size={13} />
                                                            <span>Revoke</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {keys.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-sm text-label">
                                            No API keys found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>

            {/* ── SECTION 2: USAGE SNIPPETS ──────────────────────────────────── */}
            <section className="max-w-3xl">
                <SectionTitle desc="Examples of how to authenticate requests using your API key.">Usage & Integration</SectionTitle>
                <Card className="overflow-hidden border border-indigo-500/20 bg-indigo-500/[0.02]">
                    <div className="flex items-center gap-1 border-b border-white/5 px-2 py-2 bg-white/[0.01]">
                        <button
                            onClick={() => setSnippetTab('curl')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${snippetTab === 'curl' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Terminal size={14} /> cURL
                        </button>
                        <button
                            onClick={() => setSnippetTab('python')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${snippetTab === 'python' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <FileCode2 size={14} /> Python SDK
                        </button>
                        <div className="flex-1" />
                        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 flex items-center gap-1">
                            API Docs <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="p-4 bg-[#0d0d12]">
                        <div className="relative group">
                            <pre className="text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                                {snippetTab === 'curl' ? (
                                    `curl -X POST https://api.pipelineiq.com/v1/analyze \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repository": "acme/gateway",
    "run_id": "849201"
  }'`
                                ) : (
                                    `import os
from pipelineiq import PipelineIQ

client = PipelineIQ(
    api_key=os.environ.get("PIPELINE_IQ_KEY")
)

analysis = client.analyze.create(
    repository="acme/gateway",
    run_id="849201"
)
print(analysis.root_cause)`
                                )}
                            </pre>
                            <CopyBtn
                                value={snippetTab === 'curl' ? `curl -X POST https://api.pipelineiq.com/v1/analyze -H "Authorization: Bearer <YOUR_API_KEY>" -H "Content-Type: application/json" -d '{"repository": "acme/gateway", "run_id": "849201"}'` : `import os\nfrom pipelineiq import PipelineIQ\n\nclient = PipelineIQ(api_key=os.environ.get("PIPELINE_IQ_KEY"))\n\nanalysis = client.analyze.create(repository="acme/gateway", run_id="849201")\nprint(analysis.root_cause)`}
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 border-0"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* ── MODALS ─────────────────────────────────────────────────────── */}

            {/* Create Key Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreating(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
                                <h3 className="text-sm font-semibold text-white">Create new API key</h3>
                                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white transition-colors p-1"><X size={16} /></button>
                            </div>
                            <form onSubmit={handleCreate} className="p-5 space-y-5">
                                <div>
                                    <label className="text-xs font-medium text-white mb-2 block">Key Name</label>
                                    <input
                                        autoFocus
                                        required
                                        type="text"
                                        className="input-base text-sm w-full h-10"
                                        placeholder="e.g. CI Script, Grafana Integration"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-white mb-2 block">Permissions (Scopes)</label>
                                    <div className="space-y-2.5">
                                        {SCOPE_DEFS.map(s => (
                                            <label key={s.id} className="flex items-start gap-3 cursor-pointer group">
                                                <div className="relative mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={newScopes.includes(s.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setNewScopes([...newScopes, s.id]);
                                                            else setNewScopes(newScopes.filter(scope => scope !== s.id));
                                                        }}
                                                    />
                                                    <div className="w-4 h-4 rounded border border-white/20 bg-white/5 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors flex items-center justify-center">
                                                        <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-none font-mono">{s.label}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-white mb-2 block">Expiration</label>
                                    <select
                                        className="input-base text-sm w-full h-10 py-0"
                                        value={expiry}
                                        onChange={e => setExpiry(e.target.value)}
                                    >
                                        <option value="never">Never expire (Not recommended)</option>
                                        <option value="30">30 days</option>
                                        <option value="90">90 days</option>
                                        <option value="365">1 year</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary h-9 px-4 text-sm font-medium hover:bg-white/5">Cancel</button>
                                    <button type="submit" disabled={!newName.trim() || newScopes.length === 0} className="btn-primary h-9 px-5 text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none">Generate key</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Post-Creation State Modal */}
            <AnimatePresence>
                {newlyCreatedKey && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-lg bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden p-6"
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse-slow">
                                    <Key size={20} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">API Key Generated</h3>
                                    <p className="text-sm text-label">Your new key has been created successfully.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 mb-6">
                                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-sm text-rose-300 block mb-1">Copy this key now</strong>
                                    <p className="text-xs text-rose-200/80 leading-relaxed">
                                        For your security, we will never show this full key again. If you lose it, you will need to generate a new one.
                                    </p>
                                </div>
                            </div>

                            <div className="relative mb-6">
                                <label className="text-xs font-medium text-slate-300 mb-2 block">Your new API key</label>
                                <div className="flex items-center gap-2 p-1.5 pl-4 rounded-lg bg-[#0d0d12] border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                                    <code className="flex-1 text-sm font-mono text-emerald-400 break-all select-all pt-0.5">
                                        {newlyCreatedKey}
                                    </code>
                                    <CopyBtn value={newlyCreatedKey} className="h-9 px-4 shrink-0 bg-white/10 hover:bg-white/20 border-0" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group mb-6">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={copiedCheckbox}
                                            onChange={(e) => setCopiedCheckbox(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-slate-600 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                                            <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors select-none">
                                        I have safely stored this API key
                                    </span>
                                </label>

                                <button
                                    disabled={!copiedCheckbox}
                                    onClick={() => setNewlyCreatedKey(null)}
                                    className="w-full btn-primary h-11 text-sm font-medium shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all disabled:bg-slate-700 disabled:text-slate-400"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
