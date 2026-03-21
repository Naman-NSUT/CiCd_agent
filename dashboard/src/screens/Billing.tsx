import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Download, AlertTriangle, Zap, Check, CheckCircle2,
    BarChart3, Settings, Shield, ChevronRight, Mail, Slack, Terminal
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const USAGE_DATA = [
    { date: 'Mar 12', analyses: 45 },
    { date: 'Mar 13', analyses: 68 },
    { date: 'Mar 14', analyses: 52 },
    { date: 'Mar 15', analyses: 91 },
    { date: 'Mar 16', analyses: 120 },
    { date: 'Mar 17', analyses: 84 },
    { date: 'Mar 18', analyses: 105 },
];

const REPO_USAGE = [
    { repo: 'acme/payments-api', analyses: 342, fixes: 45, tokens: '$12.40' },
    { repo: 'acme/frontend', analyses: 218, fixes: 12, tokens: '$8.20' },
    { repo: 'acme/user-service', analyses: 156, fixes: 28, tokens: '$5.80' },
    { repo: 'acme/infra', analyses: 89, fixes: 5, tokens: '$3.10' },
];

const INVOICES = [
    { id: 'inv_1MwL', date: 'Mar 1, 2026', amount: '$49.00', status: 'Paid' },
    { id: 'inv_1LwK', date: 'Feb 1, 2026', amount: '$49.00', status: 'Paid' },
    { id: 'inv_1KwJ', date: 'Jan 1, 2026', amount: '$49.00', status: 'Paid' },
];

const PLANS = [
    {
        name: 'Free', price: '$0', period: 'forever', tier: 'free',
        features: ['3 repositories', 'Unlimited analyses', 'Community support', 'Basic auto-fix']
    },
    {
        name: 'Pro', price: '$49', period: 'per user/month', tier: 'pro',
        features: ['Unlimited repositories', 'Priority analysis queue', 'Advanced auto-fix', 'Slack/PagerDuty integrations']
    },
    {
        name: 'Enterprise', price: 'Custom', period: 'annual billing', tier: 'enterprise',
        features: ['Custom AI models', 'Dedicated success manager', 'SSO & Advanced Security', 'On-premise deployment option']
    }
];

export function Billing() {
    const [isAnnual, setIsAnnual] = useState(false);
    const [alertThreshold, setAlertThreshold] = useState(80);
    const [alertChannel, setAlertChannel] = useState('email');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const TOOLTIP_STYLE = {
        backgroundColor: '#0f172a', border: '1px solid #1e293b',
        borderRadius: 8, color: '#94a3b8', fontSize: 12,
    };
    const AXIS_STYLE = { fill: '#64748b', fontSize: 11 };

    return (
        <div className="flex flex-col gap-8 w-full max-w-5xl animate-fade-in text-slate-300 pb-20">

            {/* ── CURRENT PLAN CARD ──────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <div className="p-6 sm:p-8 relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Pro Plan</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                    Active
                                </span>
                            </div>
                            <p className="text-sm text-slate-400">
                                Billed monthly • Next billing date: Apr 1, 2026
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Change plan
                            </button>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-0.5">Analyses</p>
                                    <p className="text-lg font-semibold text-white">
                                        847 <span className="text-sm text-slate-500 font-normal">/ unlimited this month</span>
                                    </p>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full w-[15%]" />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-sm font-medium text-slate-400 mb-0.5">Repositories</p>
                                    <p className="text-lg font-semibold text-white">
                                        3 <span className="text-sm text-slate-500 font-normal">/ unlimited</span>
                                    </p>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full w-[10%]" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800/80 flex justify-end">
                        {!showCancelConfirm ? (
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="text-sm text-slate-500 hover:text-rose-400 transition-colors"
                            >
                                Cancel plan
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-400">Are you sure? You'll lose access to Pro features immediately.</span>
                                <button onClick={() => setShowCancelConfirm(false)} className="text-slate-300 hover:text-white">Keep plan</button>
                                <button className="text-rose-400 hover:text-rose-300 font-medium">Yes, cancel</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── USAGE BREAKDOWN ────────────────────────────────────────────────── */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">This month's usage</h3>
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-medium text-slate-400 mb-6">Daily analyses</h4>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={USAGE_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={AXIS_STYLE} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={AXIS_STYLE} />
                                    <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={TOOLTIP_STYLE} />
                                    <Bar dataKey="analyses" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <h4 className="text-sm font-medium text-slate-400">Usage by repository</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-900/30 sticky top-0 z-10 text-xs text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Repository</th>
                                        <th className="px-4 py-3 font-medium text-right">Analyses</th>
                                        <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Auto-fixes</th>
                                        <th className="px-4 py-3 font-medium text-right">Est. Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {REPO_USAGE.map(row => (
                                        <tr key={row.repo} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{row.repo}</td>
                                            <td className="px-4 py-3 text-right">{row.analyses}</td>
                                            <td className="px-4 py-3 text-right hidden sm:table-cell">{row.fixes}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{row.tokens}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PLANS COMPARISON ───────────────────────────────────────────────── */}
            <div id="plans-section" className="pt-8">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-semibold text-white tracking-tight">Available plans</h3>

                    <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${!isAnnual ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${isAnnual ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Annual <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded-sm uppercase tracking-wider hidden sm:inline-block">Save 20%</span>
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 items-stretch">
                    {PLANS.map(plan => {
                        const isCurrent = plan.tier === 'pro';
                        const price = isAnnual && plan.tier === 'pro' ? '$39' : plan.price;

                        return (
                            <div key={plan.tier} className={`relative bg-slate-900 border rounded-2xl p-6 flex flex-col ${isCurrent ? 'border-indigo-500 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]' : 'border-slate-800'}`}>
                                {isCurrent && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm shadow-indigo-500/20">
                                        Current Plan
                                    </div>
                                )}

                                <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-3xl font-bold text-white">{price}</span>
                                    {price !== 'Custom' && (
                                        <span className="text-sm text-slate-400">/{isAnnual && plan.tier === 'pro' ? 'user/mo billing annually' : plan.period}</span>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3 mb-8">
                                    {plan.features.map(f => (
                                        <div key={f} className="flex gap-3 text-sm text-slate-300">
                                            <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    disabled={isCurrent}
                                    className={`w-full h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${isCurrent ? 'bg-slate-800 text-slate-400 cursor-default' :
                                            plan.tier === 'enterprise' ? 'bg-white hover:bg-slate-200 text-slate-900' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        }`}
                                >
                                    {isCurrent ? 'Current' : plan.tier === 'enterprise' ? 'Contact sales' : 'Upgrade to ' + plan.name}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-8">

                {/* ── PAYMENT METHOD & INVOICES ──────────────────────────────────────── */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white">Payment & Invoices</h3>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">Payment Method</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center shrink-0 border border-slate-700">
                                    <CreditCard className="w-5 h-5 text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Visa ending in 4242</p>
                                    <p className="text-xs text-slate-400">Expires 12/28</p>
                                </div>
                            </div>
                            <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                                Update
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <h4 className="text-sm font-medium text-slate-400">Billing History</h4>
                        </div>
                        <div className="w-full">
                            <table className="w-full text-left text-sm">
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {INVOICES.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">{inv.date}</td>
                                            <td className="px-4 py-3 font-medium text-white">{inv.amount}</td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors inline-block tooltip-trigger">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ── USAGE ALERTS ──────────────────────────────────────────────────── */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white">Usage Alerts</h3>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Alert me when I've used
                            </label>
                            <div className="flex items-center gap-4 mt-3">
                                <input
                                    type="range" min="10" max="100" step="5"
                                    value={alertThreshold}
                                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                                <span className="font-mono text-white text-sm font-medium min-w-[3rem] text-right">
                                    {alertThreshold}%
                                </span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <label className="text-sm font-medium text-slate-400 mb-3 block">
                                Notification Channel
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAlertChannel('email')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${alertChannel === 'email' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <Mail className="w-4 h-4" /> Email
                                </button>
                                <button
                                    onClick={() => setAlertChannel('slack')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${alertChannel === 'slack' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                >
                                    <Slack className="w-4 h-4" /> Slack
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3 text-sm">
                        <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                        <p className="text-slate-300">
                            Your <strong className="text-white font-medium">Pro Plan</strong> includes infinite analyses under Fair Use policies. Usage tracking helps you manage high-volume monorepos effectively.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
