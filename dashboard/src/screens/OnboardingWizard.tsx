import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Github, CheckCircle2, ChevronRight, ChevronDown,
    Search, Lock, Database, Bell, Slack, Mail,
    MoreHorizontal, Check, Zap, ArrowRight, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// MOCK DATA
const MOCK_REPOS = [
    { id: '1', org: 'acme-corp', name: 'frontend-monorepo', lang: 'TypeScript', stars: 124, lastPush: '2h ago' },
    { id: '2', org: 'acme-corp', name: 'auth-service', lang: 'Go', stars: 89, lastPush: '5h ago' },
    { id: '3', org: 'acme-corp', name: 'payment-gateway', lang: 'Python', stars: 42, lastPush: '1d ago' },
    { id: '4', org: 'acme-corp', name: 'infrastructure-as-code', lang: 'HCL', stars: 21, lastPush: '3d ago' },
    { id: '5', org: 'personal', name: 'dotfiles', lang: 'Shell', stars: 5, lastPush: '1w ago' },
    { id: '6', org: 'personal', name: 'nextjs-blog', lang: 'TypeScript', stars: 12, lastPush: '2w ago' },
];

export function OnboardingWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isGithubConnected, setIsGithubConnected] = useState(false);
    const [githubConnectState, setGithubConnectState] = useState<'idle' | 'connecting' | 'success'>('idle');

    // Repo Selection State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
    const [installingWebhooks, setInstallingWebhooks] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState({
        slack: false,
        pagerduty: false,
        email: true
    });
    const [pagerDutyKey, setPagerDutyKey] = useState('');

    // Auto-advance Github success
    useEffect(() => {
        if (githubConnectState === 'success') {
            const timer = setTimeout(() => {
                setStep(3);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [githubConnectState]);

    // Handle Confetti on completion
    useEffect(() => {
        if (step === 5) {
            const timer = setTimeout(() => {
                navigate('/'); // Redirect to dashboard
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step, navigate]);

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleConnectGithub = () => {
        setGithubConnectState('connecting');
        // Simulate OAuth flow
        setTimeout(() => {
            setGithubConnectState('success');
            setIsGithubConnected(true);
        }, 1500);
    };

    const processWebhookInstallation = () => {
        setInstallingWebhooks(true);
        setTimeout(() => {
            setInstallingWebhooks(false);
            handleNext();
        }, 2000);
    };

    const filteredRepos = useMemo(() => {
        return MOCK_REPOS.filter(repo =>
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.org.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const orgs = useMemo(() => {
        const orgMap = new Map<string, typeof MOCK_REPOS>();
        filteredRepos.forEach(repo => {
            if (!orgMap.has(repo.org)) orgMap.set(repo.org, []);
            orgMap.get(repo.org)!.push(repo);
        });
        return Array.from(orgMap.entries());
    }, [filteredRepos]);

    const toggleRepo = (id: string) => {
        const newSet = new Set(selectedRepos);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedRepos(newSet);
    };

    const toggleOrg = (orgName: string, orgRepos: typeof MOCK_REPOS) => {
        const newSet = new Set(selectedRepos);
        const allSelected = orgRepos.every(r => selectedRepos.has(r.id));

        if (allSelected) {
            orgRepos.forEach(r => newSet.delete(r.id));
        } else {
            orgRepos.forEach(r => newSet.add(r.id));
        }
        setSelectedRepos(newSet);
    };

    const isFreePlanLimitReached = selectedRepos.size >= 3;

    const renderProgress = () => {
        if (step === 5) return null;
        return (
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
                <motion.div
                    className="h-full bg-indigo-600"
                    initial={{ width: `${((step - 1) / 4) * 100}%` }}
                    animate={{ width: `${(step / 4) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>
        );
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full"
                    >
                        <div className="text-center mb-10">
                            <h1 className="text-[32px] font-bold text-slate-900 dark:text-white mb-3">
                                Welcome to PipelineIQ, Jane
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400">
                                Let's get your first pipeline failure analyzed in the next 2 minutes.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-5 h-5 text-indigo-500" />
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Free Plan</h3>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        You're on the Free plan — 3 repos, unlimited analyses.
                                    </p>
                                </div>
                                <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full flex flex-col items-center"
                    >
                        {githubConnectState === 'idle' || githubConnectState === 'connecting' ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8 w-full max-w-md text-center">
                                <div className="w-16 h-16 bg-[#24292F] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Github className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                    Connect your GitHub account
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                                    PipelineIQ needs read access to your repos and the ability to install webhooks.
                                </p>

                                <div className="text-left space-y-3 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Read repository metadata</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Read Actions workflow runs and logs</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Install webhooks (for automatic detection)</span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Never: write code, read secrets, or modify resources</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConnectGithub}
                                    disabled={githubConnectState === 'connecting'}
                                    className="w-full h-[52px] bg-[#24292F] hover:bg-[#1b1f23] text-white rounded-xl flex items-center justify-center gap-3 font-medium transition-colors disabled:opacity-80"
                                >
                                    {githubConnectState === 'connecting' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Github className="w-5 h-5" />
                                            Connect GitHub
                                        </>
                                    )}
                                </button>

                                <details className="mt-6 text-sm text-slate-500 dark:text-slate-400 group cursor-pointer">
                                    <summary className="flex items-center justify-center gap-1 font-medium hover:text-slate-700 dark:hover:text-slate-300 list-none">
                                        Why do you need these permissions?
                                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <p className="mt-3 text-left">
                                        We strictly need read-only access to analyze CI failures and a single webhook to be notified when a run completes. We cannot read your source code or secrets.
                                    </p>
                                </details>
                            </div>
                        ) : (
                            <div className="text-center bg-white dark:bg-slate-900 border border-emerald-500/20 shadow-xl rounded-2xl p-10 w-full max-w-md">
                                <div className="mb-6 flex justify-center">
                                    <motion.svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 64 64"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-emerald-500"
                                    >
                                        <motion.path
                                            d="M16 32L28 44L48 20"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                        />
                                    </motion.svg>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    Successfully Connected
                                </h3>

                                <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full mt-4 border border-slate-200 dark:border-slate-700">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                        J
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Connected as @janedoe
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full flex flex-col h-[70vh] max-h-[700px]"
                    >
                        <div className="mb-6 flex-shrink-0">
                            <h2 className="text-[28px] font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                Which repos should PipelineIQ watch?
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                We'll automatically install webhooks. You can change this anytime.
                            </p>
                        </div>

                        <div className="relative mb-6 flex-shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-[52px] pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-sm"
                            />
                        </div>

                        {/* Selected Count Chip */}
                        <div className="mb-4 flex justify-between items-center flex-shrink-0">
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-200 dark:border-indigo-500/20">
                                {selectedRepos.size} repo{selectedRepos.size !== 1 ? 's' : ''} selected
                            </div>
                            {isFreePlanLimitReached && (
                                <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full">
                                    Free plan limit reached (3/3)
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm relative">
                            {orgs.map(([orgName, orgRepos]) => (
                                <div key={orgName} className="mb-4 last:mb-0">
                                    <div className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                <Github className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <span className="font-semibold text-slate-900 dark:text-white">{orgName}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleOrg(orgName, orgRepos)}
                                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                                        >
                                            Select all in org
                                        </button>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {orgRepos.map(repo => {
                                            const isSelected = selectedRepos.has(repo.id);
                                            const isDimmed = isFreePlanLimitReached && !isSelected;

                                            return (
                                                <div
                                                    key={repo.id}
                                                    className={`flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative ${isDimmed ? 'opacity-50' : ''}`}
                                                    onClick={() => !isDimmed && toggleRepo(repo.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border flex-shrink-0 mr-4 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-slate-900 dark:text-white truncate">
                                                            {repo.name}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            <span>{repo.lang}</span>
                                                            <span className="flex items-center gap-1"><span className="text-amber-400">★</span> {repo.stars}</span>
                                                            <span>Pushed {repo.lastPush}</span>
                                                        </div>
                                                    </div>

                                                    {isDimmed && (
                                                        <div className="absolute right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                            Pro only
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {installingWebhooks && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Installing webhooks...</h3>
                                <p className="text-slate-500 dark:text-slate-400">This will just take a second</p>
                            </div>
                        )}
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-[32px] font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                                Where should we alert you?
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400">
                                Optional — you can set this up later in Settings.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* SLACK */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <Slack className="w-6 h-6 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Slack</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Get alerted in specific channels</p>
                                    </div>
                                </div>
                                {notifications.slack ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Connected
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setNotifications({ ...notifications, slack: true })}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors text-sm"
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>

                            {/* PAGERDUTY */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <Bell className="w-6 h-6 text-[#06AC38]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">PagerDuty</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Trigger incidents for critical failures</p>
                                        </div>
                                    </div>
                                    {notifications.pagerduty ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Connected
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (pagerDutyKey) setNotifications({ ...notifications, pagerduty: true });
                                            }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                                {!notifications.pagerduty && (
                                    <input
                                        type="text"
                                        placeholder="Enter Integration Key"
                                        value={pagerDutyKey}
                                        onChange={(e) => setPagerDutyKey(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    />
                                )}
                            </div>

                            {/* EMAIL */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <Mail className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Email</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">jane@acme.com</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={notifications.email}
                                        onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={handleNext}
                                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium underline-offset-4 hover:underline"
                            >
                                Skip for now — set up later
                            </button>
                        </div>
                    </motion.div>
                );

            case 5:
                return (
                    <div className="text-center w-full relative z-10">
                        {/* Simple CSS Confetti using a few absolutely positioned elements animated. 
                In a real app, react-confetti is better, but doing CSS only here. */}
                        <div className="confetti-container overflow-hidden absolute inset-0 -z-10 pointer-events-none">
                            {[...Array(50)].map((_, i) => (
                                <div
                                    key={i}
                                    className="confetti"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `-10%`,
                                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 5)],
                                        animationDuration: `${Math.random() * 2 + 1}s`,
                                        animationDelay: `${Math.random() * 0.5}s`,
                                        opacity: 1
                                    }}
                                />
                            ))}
                        </div>

                        <style>{`
              .confetti {
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: #f00;
                animation: fall 3s ease-in forwards;
              }
              @keyframes fall {
                to {
                  transform: translateY(100vh) rotate(720deg);
                  opacity: 0;
                }
              }
            `}</style>

                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                        >
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                                <Check className="w-12 h-12 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                                You're all set!
                            </h1>
                            <p className="text-xl text-slate-600 dark:text-slate-400">
                                PipelineIQ is now watching your pipelines.
                            </p>
                            <p className="mt-4 text-sm text-slate-500 animate-pulse">
                                Redirecting to dashboard...
                            </p>
                        </motion.div>
                    </div>
                );
        }
    };

    if (step === 5) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center p-6 font-sans">
                {renderStepContent()}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex flex-col font-sans">
            {renderProgress()}

            {/* Container */}
            <div className="flex-1 flex flex-col max-w-[600px] w-full mx-auto px-6 py-12 pt-20">

                {/* Step Content */}
                <div className="flex-1 flex flex-col justify-center w-full">
                    <AnimatePresence mode="wait">
                        {renderStepContent()}
                    </AnimatePresence>
                </div>

                {/* Navigation Footer */}
                {(step === 1 || step === 3 || step === 4) && (
                    <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <div>
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="px-5 py-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium transition-colors"
                                >
                                    Back
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => step === 3 ? processWebhookInstallation() : handleNext()}
                            disabled={step === 3 && selectedRepos.size === 0 || installingWebhooks}
                            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {step === 1 && "Let's go"}
                            {step === 3 && `Install webhooks for ${selectedRepos.size} repo${selectedRepos.size !== 1 ? 's' : ''}`}
                            {step === 4 && "Go to dashboard"}

                            {!installingWebhooks && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
