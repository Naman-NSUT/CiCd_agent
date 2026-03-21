import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitBranch, Plus, MoreHorizontal, Check, Search, Github,
    AlertTriangle, ExternalLink, Copy, EyeOff, Eye,
    ChevronDown, ChevronRight, RefreshCw, X
} from 'lucide-react';

const CONNECTED_REPOS = [
    { id: '1', name: 'acme-corp/payments-service', status: 'healthy', analyses: 47, branches: 'all', autofix: true, notifications: 'Slack' },
    { id: '2', name: 'acme-corp/user-auth', status: 'issue', analyses: 12, branches: 'main', autofix: false, notifications: 'PagerDuty' },
    { id: '3', name: 'acme-corp/frontend-monorepo', status: 'disconnected', analyses: 0, branches: 'main, release/*', autofix: true, notifications: 'Email' },
];

const MOCK_REPOS_TO_ADD = [
    { id: '1', org: 'acme-corp', name: 'payments-service', lang: 'Go', stars: 124, lastPush: '2h ago', connected: true },
    { id: '2', org: 'acme-corp', name: 'user-auth', lang: 'TypeScript', stars: 89, lastPush: '5h ago', connected: true },
    { id: '3', org: 'acme-corp', name: 'frontend-monorepo', lang: 'TypeScript', stars: 42, lastPush: '1d ago', connected: true },
    { id: '4', org: 'acme-corp', name: 'infrastructure-as-code', lang: 'HCL', stars: 21, lastPush: '3d ago', connected: false },
    { id: '5', org: 'personal', name: 'dotfiles', lang: 'Shell', stars: 5, lastPush: '1w ago', connected: false },
    { id: '6', org: 'personal', name: 'nextjs-blog', lang: 'TypeScript', stars: 12, lastPush: '2w ago', connected: false },
];

const WEBHOOK_DELIVERIES = [
    { id: 'd1', ts: '2 mins ago', status: 200, ms: 84 },
    { id: 'd2', ts: '15 mins ago', status: 200, ms: 62 },
    { id: 'd3', ts: '1 hour ago', status: 500, ms: 12 },
    { id: 'd4', ts: '3 hours ago', status: 200, ms: 78 },
    { id: 'd5', ts: '1 day ago', status: 200, ms: 91 },
];

export function RepoManager() {
    const [isGithubAppInstalled, setIsGithubAppInstalled] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
    const [expandedEndpoint, setExpandedEndpoint] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    // Add Repos State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

    const filteredRepos = useMemo(() => {
        return MOCK_REPOS_TO_ADD.filter(repo =>
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.org.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const orgs = useMemo(() => {
        const orgMap = new Map<string, typeof MOCK_REPOS_TO_ADD>();
        filteredRepos.forEach(repo => {
            if (!orgMap.has(repo.org)) orgMap.set(repo.org, []);
            orgMap.get(repo.org)!.push(repo);
        });
        return Array.from(orgMap.entries());
    }, [filteredRepos]);

    const toggleRepo = (id: string, connected: boolean) => {
        if (connected) return;
        const newSet = new Set(selectedRepos);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedRepos(newSet);
    };

    const handleInstallWebhooks = () => {
        // Mock save
        setShowAddModal(false);
        setSelectedRepos(new Set());
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl animate-fade-in relative text-slate-300">

            {/* ── GITHUB APP STATUS BANNER ──────────────────────────────────────── */}
            {isGithubAppInstalled ? (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                            <Github className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white mb-0.5">
                                PipelineIQ GitHub App installed on github.com/acme-corp
                            </p>
                            <p className="text-xs text-slate-400">
                                Installed by @janedoe on Jan 14 2025
                            </p>
                        </div>
                    </div>
                    <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors group">
                        Manage app permissions <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            ) : (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-rose-400 mb-0.5">
                                GitHub App access revoked or uninstalled
                            </p>
                            <p className="text-xs text-rose-500/70">
                                PipelineIQ cannot analyze new failures until reconnected.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsGithubAppInstalled(true)}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors shadow-none"
                    >
                        Reinstall app
                    </button>
                </div>
            )}

            {/* ── HEADER & REPOS LIST ──────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-[600] text-white tracking-tight">Connected repositories</h2>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-500/10"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add repos
                    </button>
                </div>

                <div className="space-y-3">
                    {CONNECTED_REPOS.map(repo => {
                        const statusColor =
                            repo.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                repo.status === 'issue' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                    'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';

                        const isExpanded = expandedWebhook === repo.id;

                        return (
                            <div key={repo.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all">
                                <div className="p-4 relative group">

                                    {/* Menu Button */}
                                    <div className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer p-1 rounded hover:bg-slate-800 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </div>

                                    <div className="flex items-center gap-2 mb-3 pr-8">
                                        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                                        <span className="font-semibold text-white font-mono text-sm">{repo.name}</span>
                                    </div>

                                    <div className="flex items-center text-xs text-slate-400 gap-2 mb-2">
                                        <span className="flex items-center gap-1">
                                            Webhook: <span className={
                                                repo.status === 'healthy' ? 'text-emerald-400' :
                                                    repo.status === 'issue' ? 'text-amber-400' : 'text-rose-400'
                                            }>{repo.status === 'healthy' ? 'active' : repo.status === 'issue' ? 'issues detected' : 'disconnected'}</span>
                                        </span>
                                        <span className="text-slate-600 text-[10px]">•</span>
                                        <span>Last triggered: 6 min ago</span>
                                    </div>

                                    <div className="text-xs text-slate-400 mb-2">
                                        Plan usage: <span className="text-white font-medium">{repo.analyses}</span> of unlimited analyses this month
                                    </div>

                                    <div className="text-xs text-slate-400 flex items-center gap-3">
                                        <span>Branches: <span className="text-white">{repo.branches}</span></span>
                                        <span className="text-slate-600 text-[10px]">•</span>
                                        <span>Auto-fix: <span className="text-white">{repo.autofix ? 'enabled' : 'disabled'}</span></span>
                                        <span className="text-slate-600 text-[10px]">•</span>
                                        <span>Notifications: <span className="text-white">{repo.notifications}</span></span>
                                    </div>

                                    <button
                                        onClick={() => setExpandedWebhook(isExpanded ? null : repo.id)}
                                        className="absolute bottom-4 right-4 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                    >
                                        Webhook health detail <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                </div>

                                {/* Expaned Webhook Health Detail */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-slate-950 border-t border-slate-800"
                                        >
                                            <div className="p-4 text-sm divide-y divide-slate-800/50">
                                                <div className="pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider pl-2">Last 5 Deliveries</div>
                                                {WEBHOOK_DELIVERIES.map(delivery => (
                                                    <div key={delivery.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/30 transition-colors rounded-lg group">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-slate-500 w-24">{delivery.ts}</span>
                                                            <span className={`text-xs font-mono font-medium ${delivery.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                HTTP {delivery.status}
                                                            </span>
                                                            <span className="text-xs text-slate-500">{delivery.ms}ms</span>
                                                        </div>
                                                        <button className="text-[11px] font-medium text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded border border-slate-700 hover:border-slate-500 bg-slate-900 flex items-center gap-1">
                                                            <RefreshCw className="w-3 h-3" /> Redeliver
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── WEBHOOK ENDPOINT INFO ────────────────────────────────────────── */}
            <div className="mt-8 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                <button
                    onClick={() => setExpandedEndpoint(!expandedEndpoint)}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Webhook endpoint & secret</h3>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expandedEndpoint ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                    {expandedEndpoint && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="p-5 border-t border-slate-800 space-y-4 text-sm">
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Your webhook URL</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white overflow-x-auto">
                                            https://app.pipelineiq.com/webhook/github/ws_a81b2c4
                                        </code>
                                        <button className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Webhook secret</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-500 flex items-center h-[34px]">
                                            {showSecret ? 'whsec_o9Xk2VpLqmR4zYnB...' : '••••••••••••••••••••••••••••••••'}
                                        </code>
                                        <button
                                            onClick={() => setShowSecret(!showSecret)}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                                        >
                                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                                        This is configured automatically — you don't need to touch this.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── ADD REPOS SLIDE-OVER ────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                                <h2 className="text-xl font-bold text-white tracking-tight">Add repositories</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 shrink-0 border-b border-slate-800 bg-slate-900/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search repositories..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-950/30">
                                {orgs.map(([orgName, orgRepos]) => (
                                    <div key={orgName} className="mb-2">
                                        <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur px-6 py-2 border-y border-slate-800/50 flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center">
                                                <Github className="w-2.5 h-2.5 text-slate-400" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-300">{orgName}</span>
                                        </div>

                                        <div className="divide-y divide-slate-800/30">
                                            {orgRepos.map(repo => {
                                                const isSelected = selectedRepos.has(repo.id);

                                                return (
                                                    <div
                                                        key={repo.id}
                                                        className={`flex items-center px-6 py-3 transition-colors ${repo.connected ? 'opacity-50 select-none bg-slate-900/50' : 'hover:bg-slate-800/30 cursor-pointer'}`}
                                                        onClick={() => toggleRepo(repo.id, repo.connected)}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex-shrink-0 mr-3 flex items-center justify-center transition-colors ${repo.connected ? 'bg-indigo-600/50 border-indigo-500/30' : isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-slate-900'}`}>
                                                            {(isSelected || repo.connected) && <Check className="w-3 h-3 text-white" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                                                                {repo.name} {repo.connected && <span className="text-[10px] font-medium bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">Connected</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5 max-w-[90%] truncate">
                                                                {repo.lang} • {repo.stars} stars
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
                                <button
                                    onClick={handleInstallWebhooks}
                                    disabled={selectedRepos.size === 0}
                                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Install webhooks for {selectedRepos.size} new repo{selectedRepos.size !== 1 ? 's' : ''} &rarr;
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Simple fallback
function CheckCircle2(props: any) {
    return <Check {...props} />;
}
