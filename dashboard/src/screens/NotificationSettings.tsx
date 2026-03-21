import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Slack, Mail, Grip, Plus, X, Check, Bell, Hash, Search, Save, AlertTriangle, Key, Clock, CalendarDays, Webhook, Briefcase
} from 'lucide-react';
import { Card } from '../components/ui/Card';

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA & PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL_RULES = [
    { id: 'ru1', severity: 'critical', errorType: 'any', branch: 'main', channels: ['pagerduty', 'slack:#incidents'] },
    { id: 'ru2', severity: 'high', errorType: 'Security Scan Failure', branch: 'any', channels: ['slack:#security', 'email'] },
    { id: 'ru3', severity: 'any', errorType: 'Deployment Failure', branch: 'any', channels: ['slack:#deploys'] },
];

const CHANNEL_STYLES: Record<string, { label: string; color: string }> = {
    'pagerduty': { label: 'PagerDuty', color: '#10B981' },
    'slack:#incidents': { label: '#incidents', color: '#6366F1' },
    'slack:#security': { label: '#security', color: '#8B5CF6' },
    'slack:#deploys': { label: '#deploys', color: '#818CF8' },
    'email': { label: 'Email', color: '#F59E0B' },
    'jira': { label: 'Jira', color: '#06B6D4' },
};

function SectionTitle({ children, desc }: { children: React.ReactNode, desc?: string }) {
    return (
        <div className="mb-5">
            <h2 className="text-base font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>{children}</h2>
            {desc && <p className="text-xs text-label mt-1">{desc}</p>}
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch" aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
            style={{ background: checked ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)' }}
        >
            <motion.div
                className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                animate={{ left: checked ? 18 : 2 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            />
        </button>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function NotificationSettings() {
    // Channel States
    const [slackConnected, setSlackConnected] = useState(true);
    const [pagerDutyKey, setPagerDutyKey] = useState('********************');
    const [pdServiceKey, setPdServiceKey] = useState('P5XXXXXXXXX');

    // Email States
    const [emails, setEmails] = useState(['jane@acmecorp.com']);
    const [newEmail, setNewEmail] = useState('');
    const [emailAll, setEmailAll] = useState(false);

    // Jira States
    const [jiraSite, setJiraSite] = useState('');
    const [jiraToken, setJiraToken] = useState('');
    const [jiraEmail, setJiraEmail] = useState('');

    // Rules
    const [rules, setRules] = useState(INITIAL_RULES);
    const [confirmDel, setConfirmDel] = useState<string | null>(null);
    let dragIdx = useRef(-1);

    // Digest & Quiet Hours
    const [dailyDigest, setDailyDigest] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);
    const [timezone, setTimezone] = useState('UTC');

    const [quietHours, setQuietHours] = useState(false);
    const [quietDays, setQuietDays] = useState({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: true, sun: true });

    const addRule = () => {
        setRules(r => [...r, { id: `ru${Date.now()}`, severity: 'any', errorType: 'any', branch: 'any', channels: [] }]);
    };

    const deleteRule = (id: string) => {
        if (confirmDel === id) { setRules(r => r.filter(x => x.id !== id)); setConfirmDel(null); }
        else setConfirmDel(id);
    };

    const addEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEmail && !emails.includes(newEmail)) {
            setEmails([...emails, newEmail]);
            setNewEmail('');
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-10">
            {/* ── SECTION 1: CHANNELS ────────────────────────────────────────── */}
            <section>
                <SectionTitle desc="Connect integrations and set up delivery channels.">Delivery Channels</SectionTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Slack Card */}
                    <Card className="p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center">
                                <Slack size={16} className="text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">Slack</h3>
                                <p className="text-xs text-label">Send alerts to channels or people</p>
                            </div>
                            {slackConnected ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Connected</span>
                            ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">Disconnected</span>
                            )}
                        </div>

                        {slackConnected ? (
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-xs p-2 rounded bg-white/5">
                                        <span className="text-slate-400">Workspace</span>
                                        <span className="font-medium text-white">Acme Engineering</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-label mb-1.5 block">Default Channel</label>
                                        <div className="relative">
                                            <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <select className="input-base text-xs h-8 pl-7 py-0 w-full" defaultValue="ci-alerts">
                                                <option value="ci-alerts">ci-alerts</option>
                                                <option value="incidents">incidents</option>
                                                <option value="general">general</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 btn-secondary text-xs h-8">Test alert</button>
                                    <button onClick={() => setSlackConnected(false)} className="flex-1 btn-secondary text-xs h-8 text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40">Disconnect</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-end justify-center pt-4">
                                <button onClick={() => setSlackConnected(true)} className="w-full btn-secondary bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 text-xs h-9 justify-center font-medium">
                                    Connect Slack Workspace
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* PagerDuty Card */}
                    <Card className="p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center">
                                <Bell size={16} className="text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">PagerDuty</h3>
                                <p className="text-xs text-label">Trigger incidents for critical failures</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-4 flex-1">
                            <div>
                                <label className="text-[11px] font-medium text-label mb-1 block">Routing API Key (masked)</label>
                                <div className="relative">
                                    <Key size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="password" value={pagerDutyKey} onChange={e => setPagerDutyKey(e.target.value)} className="input-base text-xs h-8 pl-7 py-0 w-full font-mono text-muted" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-label mb-1 block">Service Key</label>
                                <div className="relative">
                                    <Webhook size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" value={pdServiceKey} onChange={e => setPdServiceKey(e.target.value)} className="input-base text-xs h-8 pl-7 py-0 w-full font-mono text-muted" placeholder="e.g. P5XXXXX" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-label mb-1 block">Escalation Policy</label>
                                <select className="input-base text-xs h-8 py-0 w-full">
                                    <option>Platform Engineering Team</option>
                                    <option>Backend On-Call</option>
                                    <option>Security Incident Response</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="btn-secondary text-xs h-8 px-4">Test alert</button>
                            <button className="btn-secondary bg-white/5 text-white text-xs h-8 px-4 font-medium">Save</button>
                        </div>
                    </Card>

                    {/* Email Card */}
                    <Card className="p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center">
                                    <Mail size={16} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Email</h3>
                                    <p className="text-xs text-label">Direct inbox delivery</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Always Active</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between p-2.5 rounded border border-white/5 bg-white/[0.02]">
                                <div className="text-xs">
                                    <div className="font-medium text-white mb-0.5">Send alerts to team broadcast</div>
                                    <div className="text-label">Notify all workspace members</div>
                                </div>
                                <Toggle checked={emailAll} onChange={setEmailAll} />
                            </div>

                            <div>
                                <label className="text-[11px] font-medium text-label mb-2 block">Additional Email Recipients</label>
                                <div className="space-y-1.5 mb-2">
                                    {emails.map(email => (
                                        <div key={email} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-white/5">
                                            <span className="text-slate-300 font-medium">{email}</span>
                                            <button onClick={() => setEmails(emails.filter(e => e !== email))} className="text-slate-500 hover:text-rose-400 transition-colors">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addEmail} className="flex gap-2">
                                    <input
                                        type="email" required placeholder="Add email..."
                                        value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                        className="input-base text-xs h-8 flex-1"
                                    />
                                    <button type="submit" className="btn-secondary h-8 px-3 text-xs w-auto">Add</button>
                                </form>
                            </div>
                        </div>
                    </Card>

                    {/* Jira Card */}
                    <Card className="p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center">
                                <Briefcase size={16} className="text-cyan-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">Jira Software</h3>
                                <p className="text-xs text-label">Auto-create tickets for failures</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <input type="text" value={jiraSite} onChange={e => setJiraSite(e.target.value)} className="input-base text-xs h-8 w-full" placeholder="Site URL (e.g. acme.atlassian.net)" />
                            <div className="flex gap-2">
                                <input type="email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)} className="input-base text-xs h-8 flex-1" placeholder="Admin email" />
                                <input type="password" value={jiraToken} onChange={e => setJiraToken(e.target.value)} className="input-base text-xs h-8 flex-1" placeholder="API Token" />
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-white/5 mt-1">
                                <div className="flex-1">
                                    <label className="text-[10px] text-label mb-1 block">Project Key</label>
                                    <select className="input-base text-xs h-8 py-0 w-full"><option>ENG</option><option>DEVOPS</option></select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-label mb-1 block">Issue Type</label>
                                    <select className="input-base text-xs h-8 py-0 w-full"><option>Bug</option><option>Task</option><option>Incident</option></select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-label mb-1 block">Min Severity</label>
                                    <select className="input-base text-[11px] h-8 py-0 w-full text-rose-400 font-medium border-rose-500/20 bg-rose-500/5">
                                        <option value="high">High +</option>
                                        <option value="critical">Critical</option>
                                        <option value="medium">Medium +</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className="btn-secondary bg-white/5 text-white text-xs h-8 px-4 font-medium">Save Settings</button>
                        </div>
                    </Card>

                </div>
            </section>

            {/* ── SECTION 2: ROUTING RULES ───────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <SectionTitle desc="Define custom logic for alert routing.">Routing Rules</SectionTitle>
                    <button className="btn-secondary h-8 text-xs gap-1 px-3" onClick={addRule}>
                        <Plus size={12} />Add rule
                    </button>
                </div>
                <AnimatePresence>
                    {rules.map((rule, i) => (
                        <motion.div key={rule.id} initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="mb-3">
                            <Card className="p-4 group">
                                <div className="flex items-start gap-3">
                                    <Grip size={14} className="text-label mt-1 shrink-0 cursor-grab" />
                                    <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
                                        <span className="text-label">When</span>
                                        <select className="input-base h-7 py-0 px-2 text-xs w-auto" defaultValue={rule.severity}>
                                            {['any', 'low', 'medium', 'high', 'critical'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                        <span className="text-label">+</span>
                                        <select className="input-base h-7 py-0 px-2 text-xs w-auto" defaultValue={rule.errorType}>
                                            {['any', 'Build Failure', 'Test Failure', 'Security Scan Failure', 'Deployment Failure'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                        <span className="text-label">on</span>
                                        <select className="input-base h-7 py-0 px-2 text-xs w-auto" defaultValue={rule.branch}>
                                            {['any', 'main', 'main, release/*', 'custom'].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={() => deleteRule(rule.id)}
                                        className="opacity-0 group-hover:opacity-100 btn-secondary h-7 w-7 p-0 justify-center text-xs transition-opacity"
                                        style={confirmDel === rule.id ? { borderColor: 'rgba(244,63,94,0.4)', color: '#F43F5E', opacity: 1 } : {}}>
                                        {confirmDel === rule.id ? <Check size={12} /> : <X size={12} />}
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3 ml-5">
                                    <span className="text-xs text-label">→</span>
                                    {rule.channels.map(ch => {
                                        const s = CHANNEL_STYLES[ch] ?? { label: ch, color: '#6366F1' };
                                        return (
                                            <span key={ch} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                                                {s.label}
                                            </span>
                                        );
                                    })}
                                    <button className="text-xs text-label hover:text-white transition-colors px-2 py-0.5 rounded-full border"
                                        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>+ Add channel</button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-label">First match wins · drag to reorder</p>
                    <button className="btn-secondary h-8 text-xs gap-1.5 px-3">
                        <Bell size={12} />Test routing
                    </button>
                </div>
            </section>

            {/* ── SECTION 3 & 4: DIGEST & QUIET HOURS ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Digests */}
                <section>
                    <SectionTitle desc="Scheduled performance summaries.">Digest Settings</SectionTitle>
                    <Card className="p-5 space-y-5">
                        <div className="flex justify-between items-center group">
                            <div>
                                <h4 className="text-sm text-white font-medium mb-1 flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> Daily Digest</h4>
                                <p className="text-xs text-slate-400">Sent to your email at 09:00</p>
                            </div>
                            <Toggle checked={dailyDigest} onChange={setDailyDigest} />
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center group">
                            <div>
                                <h4 className="text-sm text-white font-medium mb-1 flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> Weekly Digest</h4>
                                <p className="text-xs text-slate-400">Sent every Monday morning</p>
                            </div>
                            <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
                        </div>
                        <div className="h-px bg-white/5" />
                        <div>
                            <label className="text-xs text-label block mb-2 font-medium">Workspace Timezone</label>
                            <select className="input-base text-sm w-full py-1.5 h-auto bg-white/5" value={timezone} onChange={e => setTimezone(e.target.value)}>
                                <option value="UTC">UTC (Universal Coordinated Time)</option>
                                <option value="PST">PST (Pacific Standard Time)</option>
                                <option value="EST">EST (Eastern Standard Time)</option>
                                <option value="GMT">GMT (Greenwich Mean Time)</option>
                            </select>
                        </div>
                    </Card>
                </section>

                {/* Quiet Hours */}
                <section>
                    <SectionTitle desc="Suppress non-critical alerts during down time.">Quiet Hours</SectionTitle>
                    <Card className={`p-5 transition-colors ${quietHours ? 'border-indigo-500/30 bg-indigo-500/[0.02]' : ''}`}>
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h4 className="text-sm text-white font-medium mb-1 flex items-center gap-1.5"><Clock size={14} className={quietHours ? 'text-indigo-400' : 'text-slate-400'} /> Enable Quiet Hours</h4>
                                <p className="text-xs text-slate-400">Queue alerts invisibly while enabled</p>
                            </div>
                            <Toggle checked={quietHours} onChange={setQuietHours} />
                        </div>

                        <div className={`space-y-4 transition-opacity ${quietHours ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[11px] text-label mb-1.5 block">From</label>
                                    <input type="time" defaultValue="20:00" className="input-base text-sm w-full h-9 bg-slate-900 border-white/10" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[11px] text-label mb-1.5 block">To</label>
                                    <input type="time" defaultValue="08:00" className="input-base text-sm w-full h-9 bg-slate-900 border-white/10" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] text-label mb-2 block">Active Days</label>
                                <div className="flex justify-between gap-1">
                                    {Object.entries(quietDays).map(([day, active]) => (
                                        <button
                                            key={day}
                                            onClick={() => setQuietDays(s => ({ ...s, [day]: !active }))}
                                            className={`flex-1 py-1.5 rounded textxs font-bold uppercase tracking-wider text-[10px] transition-colors border ${active ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700/50 hover:bg-slate-700'}`}
                                        >
                                            {day.slice(0, 1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed text-rose-200/80">
                                    <strong>Critical alerts always break quiet hours.</strong> You can adjust this behavior in Remediation Gates.
                                </p>
                            </div>
                        </div>
                    </Card>
                </section>
            </div>

        </div>
    );
}
