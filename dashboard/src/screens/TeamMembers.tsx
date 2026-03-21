import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Shield, KeyRound, Mail, Check, X,
    ExternalLink, ChevronRight, MoreHorizontal, AlertCircle, Search, Trash2
} from 'lucide-react';

type Role = 'Owner' | 'Admin' | 'Member' | 'Viewer';
type Status = 'Active' | 'Invited' | 'Suspended';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: Status;
    joined: string;
    avatar: string;
}

const MOCK_MEMBERS: TeamMember[] = [
    { id: '1', name: 'Jane Doe', email: 'jane@acme.com', role: 'Owner', status: 'Active', joined: 'Jan 14, 2025', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'John Smith', email: 'john@acme.com', role: 'Admin', status: 'Active', joined: 'Feb 2, 2025', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: 'Alice Chen', email: 'alice@acme.com', role: 'Member', status: 'Active', joined: 'Feb 15, 2025', avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: '4', name: 'Bob Wilson', email: 'bob@acme.com', role: 'Viewer', status: 'Suspended', joined: 'Mar 1, 2025', avatar: 'https://i.pravatar.cc/150?u=4' },
    { id: '5', name: '', email: 'sarah@acme.com', role: 'Member', status: 'Invited', joined: 'Sent 2h ago', avatar: '' },
];

const PERMISSIONS = [
    { feature: 'View pipelines & analyses', owner: true, admin: true, member: true, viewer: true },
    { feature: 'Trigger manual reviews', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Configure notification rules', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Add/remove repositories', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Configure auto-fix gates', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Manage billing & plan', owner: true, admin: false, member: false, viewer: false },
    { feature: 'Delete workspace', owner: true, admin: false, member: false, viewer: false },
];

export function TeamMembers() {
    const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('Member');
    const [showPermissions, setShowPermissions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Action menus & confirmations
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        const newMember: TeamMember = {
            id: Math.random().toString(),
            name: '',
            email: inviteEmail,
            role: inviteRole,
            status: 'Invited',
            joined: 'Sent just now',
            avatar: ''
        };
        setMembers([newMember, ...members]);
        setInviteEmail('');
    };

    const removeMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id));
        setConfirmRemove(null);
        setActiveMenu(null);
    };

    const updateRole = (id: string, newRole: Role) => {
        setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
        setActiveMenu(null);
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-5xl animate-fade-in text-slate-300 pb-20">

            {/* ── INVITE MODULE ──────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white mb-1 tracking-tight">Invite team members</h2>
                <p className="text-sm text-slate-400 mb-5">Invited users receive an email link that expires in 72 hours.</p>

                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="email"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-500"
                            required
                        />
                    </div>
                    <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as Role)}
                        className="w-full sm:w-40 h-10 px-3 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-white appearance-none cursor-pointer"
                    >
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Viewer">Viewer</option>
                    </select>
                    <button
                        type="submit"
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20"
                    >
                        <UserPlus className="w-4 h-4" /> Send invite
                    </button>
                </form>
            </div>

            {/* ── ROLE PERMISSIONS TABLE ────────────────────────────────────────── */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                <button
                    onClick={() => setShowPermissions(!showPermissions)}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/80 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold text-white">Role permissions</h3>
                            <p className="text-xs text-slate-400 mt-0.5">See what each role can access and configure</p>
                        </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${showPermissions ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                    {showPermissions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="overflow-x-auto border-t border-slate-800">
                                <table className="w-full text-sm text-left whitespace-nowrap bg-slate-900/50">
                                    <thead className="bg-slate-900 text-xs uppercase text-slate-500 border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 font-medium w-full">Feature</th>
                                            <th className="px-6 py-4 font-medium text-center">Owner</th>
                                            <th className="px-6 py-4 font-medium text-center">Admin</th>
                                            <th className="px-6 py-4 font-medium text-center">Member</th>
                                            <th className="px-6 py-4 font-medium text-center">Viewer</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                        {PERMISSIONS.map(row => (
                                            <tr key={row.feature} className="hover:bg-slate-800/30">
                                                <td className="px-6 py-3">{row.feature}</td>
                                                <td className="px-6 py-3 text-center">{row.owner ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-600">-</span>}</td>
                                                <td className="px-6 py-3 text-center">{row.admin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-600">-</span>}</td>
                                                <td className="px-6 py-3 text-center">{row.member ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-600">-</span>}</td>
                                                <td className="px-6 py-3 text-center">{row.viewer ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-600">-</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── MEMBERS LIST ──────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        Workspace members <span className="text-slate-500 font-normal">({members.length})</span>
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-900 text-xs text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Member</th>
                                <th className="px-6 py-3 font-medium">Role</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Joined</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredMembers.map(member => (
                                <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-medium text-xs">
                                                    {member.email.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{member.name || 'Pending Invite'}</span>
                                                <span className="text-xs text-slate-400">{member.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-300">{member.role}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                    member.status === 'Invited' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                        'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                }`} />
                                            <span className={`text-xs font-medium ${member.status === 'Active' ? 'text-emerald-400' :
                                                    member.status === 'Invited' ? 'text-amber-400' :
                                                        'text-rose-400'
                                                }`}>{member.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                        {member.joined}
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        {member.role !== 'Owner' && (
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                                <AnimatePresence>
                                                    {activeMenu === member.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute right-8 top-8 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1 overflow-hidden"
                                                            >
                                                                {member.status === 'Invited' ? (
                                                                    <>
                                                                        <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                                                                            Resend invite
                                                                        </button>
                                                                        <button
                                                                            onClick={() => removeMember(member.id)}
                                                                            className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                                        >
                                                                            Revoke invite
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Role</div>
                                                                        <button onClick={() => updateRole(member.id, 'Admin')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-between">
                                                                            Admin {member.role === 'Admin' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                                                        </button>
                                                                        <button onClick={() => updateRole(member.id, 'Member')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-between">
                                                                            Member {member.role === 'Member' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                                                        </button>
                                                                        <button onClick={() => updateRole(member.id, 'Viewer')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-between">
                                                                            Viewer {member.role === 'Viewer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                                                        </button>
                                                                        <div className="border-t border-slate-700 my-1" />
                                                                        <button
                                                                            onClick={() => setConfirmRemove(member.id)}
                                                                            className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                                        >
                                                                            Remove from workspace
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>

                                                {/* Remove Confirmation */}
                                                <AnimatePresence>
                                                    {confirmRemove === member.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="absolute right-8 top-2 bg-slate-900 border border-rose-500/30 shadow-xl rounded-lg p-3 z-30 w-64 flex flex-col gap-3"
                                                        >
                                                            <p className="text-xs text-slate-300 text-left whitespace-normal">
                                                                Are you sure you want to remove <strong>{member.name || member.email}</strong>? They will immediately lose access to all metrics and pipelines.
                                                            </p>
                                                            <div className="flex gap-2 justify-end">
                                                                <button onClick={() => setConfirmRemove(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                                                                <button onClick={() => removeMember(member.id)} className="px-3 py-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white rounded font-medium transition-colors">Remove User</button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                                        No members found matching "{searchQuery}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── SINGLE SIGN-ON (SSO) ──────────────────────────────────────────── */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-slate-800/80 rounded-full flex items-center justify-center mb-3 border border-slate-700/50">
                        <KeyRound className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Single Sign-On (SSO)</h3>
                    <p className="text-sm text-slate-400 max-w-md mb-5">
                        SAML 2.0 Single Sign-On is available exclusively on the Enterprise plan. Enforce enterprise security policies and streamline access.
                    </p>
                    <button className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-900 text-sm font-semibold rounded-lg transition-colors shadow-sm">
                        Upgrade to Enterprise
                    </button>
                </div>

                <div className="p-6 opacity-40 pointer-events-none select-none">
                    <div className="flex items-center gap-3 mb-6">
                        <KeyRound className="w-5 h-5 text-slate-400" />
                        <div>
                            <h3 className="text-base font-semibold text-white">SAML Configuration</h3>
                            <p className="text-xs text-slate-500">Connect your Identity Provider (Okta, Azure AD, etc.)</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">IdP Metadata URL</label>
                            <input type="text" disabled className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Entity ID / Issuer</label>
                                <input type="text" disabled className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">SSO URL</label>
                                <input type="text" disabled className="w-full h-9 bg-slate-950 border border-slate-800 rounded-md" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">X.509 Certificate</label>
                            <textarea disabled className="w-full h-24 bg-slate-950 border border-slate-800 rounded-md resize-none" />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
