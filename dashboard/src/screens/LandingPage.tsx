import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Play, Check, X, ChevronDown, ArrowRight, Zap, Target, Shield, Clock } from 'lucide-react';

export function LandingPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        {
            q: "How does the GitHub connection work?",
            a: "You install our GitHub App on your selected repositories. It automatically sets up webhooks to listen for workflow_run events. No YAML changes needed."
        },
        {
            q: "What data does PipelineIQ read from my repos?",
            a: "We only read CI/CD workflows, run logs, and metadata (status, conclusion, branch names). We do not read your source code."
        },
        {
            q: "Can it fix issues automatically without my approval?",
            a: "Yes, for classes of errors you designate as 'Safe' (like dependency cache misses or known flaky tests). Others pause for 1-click approval."
        },
        {
            q: "What CI/CD platforms are supported?",
            a: "Currently, we fully support GitHub Actions. GitLab CI and Bitbucket Pipelines are currently in beta."
        },
        {
            q: "How is my log data stored?",
            a: "Logs are processed in memory and compressed via Drain3. Only the abstract templates and analysis metadata are stored long-term in our secure vector database."
        },
        {
            q: "What happens when confidence is low?",
            a: "When Gemini 2.5 Pro cannot confidently determine the root cause, the failure is flagged as 'Escalated' and your team is paged via Slack or PagerDuty."
        },
        {
            q: "Can I use this with a self-hosted GitHub?",
            a: "Yes! The Enterprise tier supports GitHub Enterprise Server with dedicated VPN tunnels or on-premise deployments."
        },
        {
            q: "How is pricing calculated for large teams?",
            a: "Billing is per-workspace with unlimited seats. You pay based on the number of repositories monitored and total monthly analysis volume."
        }
    ];



    return (
        <div className="min-h-screen bg-[#0A0A0F] text-slate-200 font-sans selection:bg-indigo-500/30">

            {/* HERO SECTION */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-16">
                {/* Animated Mesh Background */}
                <div className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                    }}
                />

                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 mb-8"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-mono text-indigo-300 uppercase tracking-widest">
                            Powered by Gemini 2.5 Pro + LangGraph
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-[48px] md:text-[64px] font-bold leading-[1.1] text-white tracking-tight mb-6"
                    >
                        Your CI/CD failures, analyzed<br className="hidden md:block" /> and{' '}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                            fixed
                        </span> before you open Slack.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-[18px] md:text-[20px] text-[#A1A1B5] max-w-[600px] mb-10 leading-relaxed"
                    >
                        Connect GitHub in 60 seconds. PipelineIQ watches every pipeline, classifies failures into 10 error types, and auto-fixes the safe ones — instantly.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center gap-4 mb-8 w-full sm:w-auto"
                    >
                        <button className="w-full sm:w-auto h-12 px-8 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-2 group">
                            <Github className="w-5 h-5" />
                            <span>Start free — connect GitHub</span>
                        </button>
                        <button className="w-full sm:w-auto h-12 px-8 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center justify-center gap-2 group">
                            <Play className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span>See a live demo</span>
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="text-[13px] text-[#A1A1B5]/70 flex items-center gap-3"
                    >
                        <span>No credit card</span>
                        <span>·</span>
                        <span>Free for 3 repos</span>
                        <span>·</span>
                        <span>Setup in 60 seconds</span>
                    </motion.div>
                </div>

                {/* Social Proof Strip */}
                <div className="absolute bottom-10 w-full flex flex-col items-center">
                    <p className="text-xs uppercase tracking-widest text-[#A1A1B5]/50 font-semibold mb-6">
                        Trusted by engineers at
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale">
                        {/* Placeholders for logos that feel premium */}
                        <div className="flex items-center gap-2 text-xl font-bold font-serif"><Shield className="w-6 h-6" /> Vercel</div>
                        <div className="flex items-center gap-2 text-xl font-bold"><Zap className="w-6 h-6" /> Linear</div>
                        <div className="flex items-center gap-2 text-xl font-bold tracking-tighter"><Target className="w-6 h-6" /> Raycast</div>
                        <div className="flex items-center gap-2 text-xl font-black italic">SCALE</div>
                        <div className="flex items-center gap-2 text-xl font-medium tracking-widest">ACME Corp</div>
                    </div>
                </div>
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

            {/* HOW IT WORKS */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">From failure to fix in under 3 minutes</h2>
                    <p className="text-[#A1A1B5] text-lg max-w-2xl mx-auto">PipelineIQ integrates seamlessly with your tools, requiring zero configuration changes to your existing pipelines.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Card 1 */}
                    <div className="bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 transition-colors rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl mb-6 border border-indigo-500/30">1</div>
                        <h3 className="text-xl font-semibold text-white mb-3">Connect your repos</h3>
                        <p className="text-[#A1A1B5] leading-relaxed">Install the GitHub app, select your repos. Webhooks configured automatically. No YAML changes, no CI config edits.</p>
                        <div className="mt-8 flex items-center justify-between text-indigo-400/50 group-hover:text-indigo-400 transition-colors">
                            <Github className="w-8 h-8" />
                            <div className="flex-1 h-px bg-current mx-4 border-dashed border-b border-indigo-400/50" />
                            <Shield className="w-8 h-8" />
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 transition-colors rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute -top-10 left-10 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all" />
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl mb-6 border border-indigo-500/30">2</div>
                        <h3 className="text-xl font-semibold text-white mb-3">AI analyzes every failure</h3>
                        <p className="text-[#A1A1B5] leading-relaxed">Drain3 compresses 50,000-line logs to 200 templates. Gemini 2.5 Pro classifies into 10 error types with root cause reasoning.</p>
                        <div className="mt-8 grid grid-cols-3 gap-2">
                            <div className="h-2 rounded bg-white/10" />
                            <div className="h-2 rounded bg-indigo-500/50" />
                            <div className="h-2 rounded bg-white/10" />
                            <div className="h-2 rounded bg-white/10" />
                            <div className="h-2 rounded bg-white/10" />
                            <div className="h-2 rounded bg-indigo-500/50" />
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/30 transition-colors rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute bottom-0 right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl mb-6 border border-indigo-500/30">3</div>
                        <h3 className="text-xl font-semibold text-white mb-3">Auto-fix or escalate</h3>
                        <p className="text-[#A1A1B5] leading-relaxed">Safe fixes execute automatically. Ambiguous cases pause for your review. Critical failures page on-call immediately.</p>
                        <div className="mt-8 flex items-center gap-3">
                            <div className="px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium border border-emerald-500/20">FIX_APPLIED</div>
                            <ArrowRight className="w-4 h-4 text-[#A1A1B5]" />
                            <div className="px-3 py-1.5 rounded bg-amber-500/10 text-amber-400 text-xs font-mono font-medium border border-amber-500/20">PENDING_REVIEW</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE DEMO STRIP */}
            <section className="py-24 bg-white/[0.01] border-y border-white/[0.05]">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    <div className="order-2 lg:order-1 relative rounded-2xl border border-white/10 bg-[#0F0F16] shadow-2xl overflow-hidden aspect-video flex flex-col">
                        <div className="h-10 border-b border-white/10 bg-[#15151F] flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                            <div className="mx-auto text-xs text-[#A1A1B5] font-mono">dashboard · PipelineIQ</div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4 relative">
                            {/* Mock Run Card */}
                            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                        <span className="text-white font-medium">api-service-test</span>
                                        <span className="text-xs text-[#A1A1B5]">#8492</span>
                                    </div>
                                    <p className="text-sm font-mono text-rose-300 mt-2">Dependency Error: ModuleNotFoundError</p>
                                </div>
                                <div className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-bold rounded">FAILED</div>
                            </div>

                            {/* Mock Analysis Panel */}
                            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                    <Zap className="w-4 h-4" /> Analyzing root cause...
                                </div>
                                {/* Shimmer line */}
                                <div className="h-2 w-3/4 bg-white/5 rounded overflow-hidden relative">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                </div>
                                <div className="h-2 w-1/2 bg-white/5 rounded" />
                                <div className="h-2 w-5/6 bg-white/5 rounded" />

                                <div className="mt-auto flex justify-end gap-2">
                                    <div className="h-8 w-24 rounded bg-white/5" />
                                    <div className="h-8 w-24 rounded bg-indigo-600/50" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">See real intelligence at work</h2>
                        <p className="text-[#A1A1B5] text-lg mb-8">Stop grepping through logs. PipelineIQ highlights the exact stack trace, explains the context, and proposes a git patch instantly.</p>

                        <div className="pl-6 border-l-2 border-indigo-500/50 mb-10">
                            <p className="text-white text-lg italic mb-4">"It's like having a Staff Engineer on-call 24/7 who instantly reads the logs and hands you the fix. We cut our MTTR from 45 minutes to 2 minutes."</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                                <div>
                                    <div className="font-medium text-white">Alex Mercer</div>
                                    <div className="text-sm text-[#A1A1B5]">DevOps Lead at FinTech Inc</div>
                                </div>
                            </div>
                        </div>

                        <button className="text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-2 group transition-colors">
                            See it handling a real Build Failure <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                </div>
            </section>

            {/* GITHUB INTEGRATION SECTION */}
            <section className="py-32 px-6 max-w-7xl mx-auto">
                <div className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-3xl p-10 md:p-16 text-center max-w-4xl mx-auto flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 mb-8 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <Github className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Connect once, automate forever.</h2>
                    <p className="text-[#A1A1B5] text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
                        Authorize the PipelineIQ GitHub App to instantly enable webhooks. Every time a workflow fails, PipelineIQ instantly triggers, analyzes the logs, and opens a PR with the precise fix.
                    </p>
                    <button className="h-14 px-8 rounded-lg bg-white text-[#111118] font-bold text-lg hover:bg-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-2 group">
                        <Github className="w-5 h-5" />
                        <span>Connect GitHub Repository</span>
                    </button>
                    <p className="mt-6 text-sm text-indigo-300 flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4" /> Secure, scoped access. We never read your source code.
                    </p>
                </div>
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* FAQ SECTION */}
            <section className="py-32 px-6 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently asked questions</h2>
                <div className="flex flex-col gap-4">
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div
                                key={idx}
                                className="border border-white/10 bg-white/[0.02] rounded-xl overflow-hidden transition-colors hover:bg-white/[0.03]"
                            >
                                <button
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                                >
                                    <span className="font-medium text-white">{faq.q}</span>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-5 h-5 text-[#A1A1B5]" />
                                    </motion.div>
                                </button>
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="px-6 pb-5 text-[#A1A1B5] text-sm leading-relaxed"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/10 bg-[#050508] pt-16 pb-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                                    <span className="text-white text-[10px] font-black tracking-tighter">IQ</span>
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">PipelineIQ</span>
                            </div>
                            <p className="text-[#A1A1B5] text-sm">Automated CI/CD error analysis and remediation for fast-moving engineering teams.</p>
                        </div>

                        <div>
                            <h4 className="text-white font-medium mb-4">Product</h4>
                            <ul className="flex flex-col gap-3 text-sm text-[#A1A1B5]">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Integrations</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Changelog</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-medium mb-4">Company</h4>
                            <ul className="flex flex-col gap-3 text-sm text-[#A1A1B5]">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-medium mb-4">Legal</h4>
                            <ul className="flex flex-col gap-3 text-sm text-[#A1A1B5]">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Security Setup</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
                        <div className="text-[#A1A1B5] text-sm flex gap-4">
                            <span>© 2025 PipelineIQ</span>
                            <span className="hidden sm:inline">·</span>
                            <a href="#" className="hover:text-white">Privacy</a>
                            <span className="hidden sm:inline">·</span>
                            <a href="#" className="hover:text-white">Terms</a>
                        </div>

                        <a href="#" className="flex items-center gap-2 group">
                            <span className="text-sm text-[#A1A1B5] group-hover:text-white transition-colors">Status: All systems operational</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
