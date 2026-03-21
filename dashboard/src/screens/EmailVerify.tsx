import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const ConfettiBurst = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {[...Array(40)].map((_, i) => {
                const angle = (i * 360) / 40;
                const velocity = 50 + Math.random() * 50;
                const tx = Math.cos((angle * Math.PI) / 180) * velocity;
                const ty = Math.sin((angle * Math.PI) / 180) * velocity;
                const colors = ['#818CF8', '#34D399', '#FBBF24', '#F472B6', '#60A5FA'];
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{
                            opacity: 0,
                            scale: Math.random() * 0.5 + 0.5,
                            x: tx * 2,
                            y: ty * 2 + 50 // add gravity
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{ backgroundColor: colors[i % colors.length] }}
                    />
                );
            })}
        </div>
    );
};

export function EmailVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL Params
    const urlEmail = searchParams.get('email') || '';
    const urlToken = searchParams.get('token');

    // States
    // If token exists, we are in State B (Verifying), else State A (Pending)
    const [status, setStatus] = useState<'PENDING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>(
        urlToken ? 'VERIFYING' : 'PENDING'
    );
    const [countdown, setCountdown] = useState(60);
    const [showToast, setShowToast] = useState(false);

    // State A: Countdown timer
    useEffect(() => {
        if (status === 'PENDING' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown, status]);

    // State A: Auto-polling mockup
    useEffect(() => {
        if (status === 'PENDING') {
            const interval = setInterval(() => {
                // Mock: randomly verify after some time or just keep polling
                // In a real app: fetch('/auth/verify-status')
                console.log('Polling /auth/verify-status...');
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // State B: Handle token verification
    useEffect(() => {
        if (status === 'VERIFYING') {
            // Mock API Call: /auth/verify?token=XXX
            const timer = setTimeout(() => {
                if (urlToken === 'invalid' || urlToken === 'expired') {
                    setStatus('ERROR');
                } else {
                    setStatus('SUCCESS');
                    // Auto-redirect to onboarding after 1.5s
                    setTimeout(() => {
                        navigate('/onboarding');
                    }, 1500);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [status, urlToken, navigate]);

    const handleResend = () => {
        // Mock Resend API
        setCountdown(60);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const drawCheck = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 text-slate-300 relative">

            {/* Logo Top Center */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 z-10 relative">
                <div className="flex justify-center items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                        PQ
                    </div>
                    <span className="font-semibold text-xl text-white tracking-tight">PipelineIQ</span>
                </div>
            </div>

            <div className="sm:mx-auto w-full max-w-[420px] z-10 relative">
                {/* Toast Notification */}
                <AnimatePresence>
                    {showToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute -top-14 left-0 right-0 mx-auto w-max px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Sent!
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Glass Card */}
                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] rounded-2xl p-8 overflow-hidden text-center">

                    {status === 'SUCCESS' && <ConfettiBurst />}

                    <AnimatePresence mode="wait">
                        {status === 'PENDING' && (
                            <motion.div
                                key="pending"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="w-full flex flex-col items-center"
                            >
                                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                    <Mail className="w-12 h-12 text-indigo-400" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-[24px] font-[600] text-white tracking-tight mb-3">
                                    Check your inbox
                                </h2>
                                <p className="text-sm text-slate-400 mb-8 max-w-[280px]">
                                    We sent a verification link to <span className="font-medium text-white">{urlEmail || 'your email'}</span>
                                </p>

                                <div className="w-full space-y-4">
                                    <button
                                        disabled={countdown > 0}
                                        onClick={handleResend}
                                        className="w-full h-[44px] bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                                    >
                                        {countdown > 0 ? `Resend in ${countdown}s` : "Resend email"}
                                    </button>

                                    <Link
                                        to="/signup"
                                        className="inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        Wrong email? Go back
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                        {status === 'VERIFYING' && (
                            <motion.div
                                key="verifying"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="w-full flex flex-col items-center py-6"
                            >
                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" strokeWidth={1.5} />
                                <h2 className="text-[20px] font-[600] text-white tracking-tight mb-2">
                                    Verifying your email...
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Please wait a moment.
                                </p>
                            </motion.div>
                        )}

                        {status === 'SUCCESS' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="w-full flex flex-col items-center py-6"
                            >
                                <div className="mb-6">
                                    <motion.svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 64 64"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-emerald-500"
                                    >
                                        <circle cx="32" cy="32" r="30" className="stroke-current opacity-20" strokeWidth="4" />
                                        <motion.path
                                            d="M18 32L28 42L46 22"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            variants={drawCheck}
                                            initial="hidden"
                                            animate="visible"
                                        />
                                    </motion.svg>
                                </div>
                                <h2 className="text-[24px] font-[600] text-white tracking-tight">
                                    Email verified!
                                </h2>
                                <p className="text-sm text-slate-400 mt-2">
                                    Redirecting to onboarding...
                                </p>
                            </motion.div>
                        )}

                        {status === 'ERROR' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="w-full flex flex-col items-center py-4"
                            >
                                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                                    <XCircle className="w-12 h-12 text-rose-500" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-[24px] font-[600] text-white tracking-tight mb-3">
                                    This link has expired
                                </h2>
                                <p className="text-sm text-slate-400 mb-8 max-w-[280px]">
                                    Your verification link is invalid or has expired. Please request a new one.
                                </p>

                                <button
                                    onClick={() => {
                                        navigate('/verify?email=' + encodeURIComponent(urlEmail));
                                        setStatus('PENDING');
                                        setCountdown(60);
                                    }}
                                    className="w-full h-[44px] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] focus:ring-indigo-500 transition-all flex justify-center items-center"
                                >
                                    Request a new link
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
