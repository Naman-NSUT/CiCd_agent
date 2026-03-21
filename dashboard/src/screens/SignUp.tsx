import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const testimonials = [
    {
        quote: "PipelineIQ caught a silent test flake that would have taken down our authentication service. It paid for itself on day one.",
        author: "Sarah Chen",
        role: "DevOps Lead at Series B Startup",
    },
    {
        quote: "We reduced our MTTR for CI failures by 60% since switching to active pipeline intelligence.",
        author: "James Wilson",
        role: "Platform Engineer, FinTech Co",
    },
    {
        quote: "The ability to auto-remediate common build errors without human intervention is a game changer for our developer velocity.",
        author: "Elena Rodriguez",
        role: "VP of Engineering",
    }
];

const ParticleField = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="particles-container w-full h-full relative">
                {/* Creating 30 particles with random positions and animation delays */}
                {[...Array(30)].map((_, i) => {
                    const size = Math.random() * 4 + 1;
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    const animDuration = Math.random() * 10 + 10;
                    const animDelay = Math.random() * -20;

                    return (
                        <div
                            key={i}
                            className="absolute rounded-full bg-indigo-500/20"
                            style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                left: `${left}%`,
                                top: `${top}%`,
                                animation: `float-particle ${animDuration}s linear infinite`,
                                animationDelay: `${animDelay}s`,
                                boxShadow: '0 0 10px 2px rgba(99, 102, 241, 0.2)'
                            }}
                        />
                    );
                })}
            </div>
            <style>
                {`
          @keyframes float-particle {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(-100px) translateX(${Math.random() > 0.5 ? '20px' : '-20px'}) scale(0); opacity: 0; }
          }
        `}
            </style>
        </div>
    );
};

export function SignUp() {
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [success, setSuccess] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [workspace, setWorkspace] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Rotating testimonial
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Auto-suggest workspace name based on email domain
    useEffect(() => {
        if (email && email.includes('@')) {
            const domain = email.split('@')[1];
            if (domain) {
                const parts = domain.split('.');
                if (parts.length >= 2 && !['gmail', 'yahoo', 'hotmail', 'outlook'].includes(parts[0].toLowerCase())) {
                    setWorkspace(parts[0].toLowerCase());
                }
            }
        }
    }, [email]);

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, label: '', color: 'bg-gray-200 dark:bg-gray-700' };
        let score = 0;
        if (pass.length > 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        if (score < 2) return { score, label: 'Weak', color: 'bg-rose-500', barWidth: '33%' };
        if (score < 4) return { score, label: 'Fair', color: 'bg-amber-500', barWidth: '66%' };
        return { score, label: 'Strong', color: 'bg-emerald-500', barWidth: '100%' };
    };

    const strength = getPasswordStrength(password);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && email && password && workspace) {
            setSuccess(true);
            setCountdown(60);
        }
    };

    const drawContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.5 }
        }
    };

    const drawCheck = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.8, ease: "easeOut", delay: 0.2 }
        }
    };

    return (
        <div className="flex min-h-screen bg-white dark:bg-slate-950 font-sans">

            {/* LEFT SIDE - Testimonial & Particles */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 overflow-hidden flex-col justify-between p-12">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900/80 to-slate-950 z-0"></div>

                <ParticleField />

                <div className="z-10 relative">
                    <div className="flex items-center gap-2 text-white/90">
                        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
                            PQ
                        </div>
                        <span className="font-semibold text-xl tracking-tight">PipelineIQ</span>
                    </div>
                </div>

                <div className="z-10 relative mt-auto mb-20 max-w-lg">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTestimonial}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                            <div className="mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="text-amber-400 text-lg mr-1">★</span>
                                ))}
                            </div>
                            <p className="text-3xl font-light leading-snug text-white mb-6">
                                "{testimonials[activeTestimonial].quote}"
                            </p>
                            <div>
                                <div className="font-semibold text-white/90">{testimonials[activeTestimonial].author}</div>
                                <div className="text-indigo-300/80 text-sm mt-1">{testimonials[activeTestimonial].role}</div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT SIDE - Form Panel */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white dark:bg-slate-900 relative">
                <div className="mx-auto w-full max-w-md">

                    <div className="lg:hidden mb-8 flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white">
                            PQ
                        </div>
                        <span className="font-semibold text-xl dark:text-white">PipelineIQ</span>
                    </div>

                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mb-8">
                                    <h1 className="text-[28px] font-[600] text-slate-900 dark:text-white tracking-tight mb-2">
                                        Create your workspace
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        Free forever for 3 repos. No credit card required.
                                    </p>
                                </div>

                                {/* GitHub Button */}
                                <button className="w-full h-[52px] bg-[#24292F] hover:bg-[#1b1f23] text-white rounded-lg flex items-center justify-center gap-3 font-medium transition-colors mb-3">
                                    <Github className="w-5 h-5" />
                                    Continue with GitHub
                                </button>
                                <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-8">
                                    We'll use your GitHub identity and set up repos automatically
                                </p>

                                <div className="relative mb-8">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 dark:text-slate-400">
                                            or sign up with email
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Full name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow sm:text-sm"
                                            placeholder="e.g. Jane Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Work email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow sm:text-sm"
                                            placeholder="name@company.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-3 py-2.5 pl-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {/* Password Strength Indicator */}
                                        <div className="mt-2 text-xs">
                                            <div className="flex h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${strength.color}`}
                                                    style={{ width: password ? strength.barWidth : '0%' }}
                                                />
                                            </div>
                                            <div className="mt-1 flex justify-between items-center text-slate-500 dark:text-slate-400">
                                                {password ? (
                                                    <span className={strength.score < 2 ? 'text-rose-500' : strength.score < 4 ? 'text-amber-500' : 'text-emerald-500'}>
                                                        {strength.label}
                                                    </span>
                                                ) : (
                                                    <span>Must be at least 8 characters</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            Workspace name
                                        </label>
                                        <div className="flex shadow-sm rounded-lg overflow-hidden">
                                            <input
                                                type="text"
                                                required
                                                value={workspace}
                                                onChange={(e) => setWorkspace(e.target.value)}
                                                className="flex-1 w-full px-3 py-2.5 border border-r-0 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:z-10 transition-shadow sm:text-sm rounded-l-lg"
                                                placeholder="acme"
                                            />
                                            <span className="inline-flex items-center px-3 border border-l-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sm:text-sm whitespace-nowrap rounded-r-lg">
                                                .pipelineiq.com
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-6 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-md shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all flex justify-center items-center gap-2 group"
                                    >
                                        Create workspace
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </form>

                                <p className="mt-6 text-center text-[12px] text-slate-500 dark:text-slate-400 px-4">
                                    By continuing you agree to our{' '}
                                    <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-300" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="underline hover:text-slate-700 dark:hover:text-slate-300" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                                </p>

                                <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
                                    Already have an account?{' '}
                                    <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Sign in &rarr;
                                    </Link>
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                variants={drawContainer}
                                initial="hidden"
                                animate="visible"
                                className="text-center py-12"
                            >
                                <div className="flex justify-center mb-6">
                                    <motion.svg
                                        width="80"
                                        height="80"
                                        viewBox="0 0 80 80"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-indigo-600 dark:text-indigo-400"
                                    >
                                        <circle cx="40" cy="40" r="36" className="stroke-current opacity-20" strokeWidth="6" />
                                        <motion.path
                                            d="M24 40L36 52L58 28"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            variants={drawCheck}
                                        />
                                    </motion.svg>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                    Check your email
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                                    We sent a verification link to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                                </p>

                                <div className="space-y-4">
                                    <button
                                        disabled={countdown > 0}
                                        onClick={() => setCountdown(60)}
                                        className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {countdown > 0 ? `Resend link in ${countdown}s` : "Resend link"}
                                    </button>

                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                                    >
                                        Wrong email? Go back
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
