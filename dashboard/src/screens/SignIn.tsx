import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Eye, EyeOff, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type FormState = 'LOGIN' | 'MFA' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_SUCCESS';

export function SignIn() {
    const [formState, setFormState] = useState<FormState>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Simulation of login
    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            // Let's simulate that if email is 'test@test.com', it goes to MFA, 
            // otherwise it shows an error to demonstrate the error state.
            if (email === 'test@test.com' && password === 'password') {
                setFormState('MFA');
            } else {
                setError(true);
            }
        }, 1500);
    };

    const handleForgotPasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
            setFormState('FORGOT_PASSWORD_SUCCESS');
            setCountdown(60);
        }, 1500);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple chars

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Simulate OTP submit on last digit
        if (index === 5 && value) {
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                // Successful login
                window.location.href = '/'; // Simple redirect for now
            }, 1000);
        }
    };

    const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return; // Only allow numbers

        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            if (i < 6) newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);

        // Focus next available input or last
        const focusIndex = Math.min(pastedData.length, 5);
        otpRefs.current[focusIndex]?.focus();

        // Auto submit if 6 digits
        if (pastedData.length === 6) {
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                window.location.href = '/';
            }, 1000);
        }
    };

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            position: 'absolute' as const,
        }),
        center: {
            x: 0,
            opacity: 1,
            position: 'relative' as const,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            position: 'absolute' as const,
        })
    };

    // Determine animation direction based on state transitions
    const direction = formState === 'LOGIN' ? -1 : 1;

    return (
        <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 text-slate-300">

            {/* Logo Top Center */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
                <div className="flex justify-center items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                        PQ
                    </div>
                    <span className="font-semibold text-xl text-white tracking-tight">PipelineIQ</span>
                </div>
            </div>

            <div className="sm:mx-auto w-full max-w-[420px]">
                {/* Glass Card */}
                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] rounded-2xl p-8 overflow-hidden">

                    <AnimatePresence mode="popLayout" initial={false} custom={direction}>

                        {/* LOGIN STATE */}
                        {formState === 'LOGIN' && (
                            <motion.div
                                key="LOGIN"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full"
                            >
                                <div className="mb-6 text-center">
                                    <h2 className="text-[24px] font-[600] text-white tracking-tight">
                                        Welcome back
                                    </h2>
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-rose-400 font-medium">
                                            Invalid credentials. Please verify your email and password.
                                        </p>
                                    </div>
                                )}

                                <button className="w-full h-[44px] bg-[#24292F] hover:bg-[#1b1f23] text-white rounded-lg flex items-center justify-center gap-3 font-medium transition-colors mb-6 border border-slate-700">
                                    <Github className="w-5 h-5" />
                                    Continue with GitHub
                                </button>

                                <div className="relative mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-800"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="bg-slate-900/50 px-4 text-slate-500 backdrop-blur-sm">
                                            or
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleLoginSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5 hidden">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(false); }}
                                            className={`w-full h-[44px] px-3 bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm rounded-lg border ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'}`}
                                            placeholder="you@company.com"
                                            disabled={loading}
                                        />
                                        {error && <p className="mt-1.5 text-xs text-rose-400">Email addresses must be valid.</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5 hidden">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                                                className={`w-full h-[44px] px-3 pl-3 pr-10 bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm rounded-lg border ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'}`}
                                                placeholder="••••••••"
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {error && <p className="mt-1.5 text-xs text-rose-400">Password is required.</p>}

                                        <div className="mt-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setFormState('FORGOT_PASSWORD')}
                                                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                                                tabIndex={-1}
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-[44px] mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] focus:ring-indigo-500 transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
                                    </button>
                                </form>

                                <p className="mt-8 text-center text-sm text-slate-400">
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
                                        Start free &rarr;
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {/* MFA STATE */}
                        {formState === 'MFA' && (
                            <motion.div
                                key="MFA"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full"
                            >
                                <button
                                    onClick={() => setFormState('LOGIN')}
                                    className="mb-6 text-slate-400 hover:text-white transition-colors p-1 -ml-1"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                <h2 className="text-[24px] font-[600] text-white tracking-tight mb-2">
                                    Two-step verification
                                </h2>
                                <p className="text-sm text-slate-400 mb-8">
                                    Enter the 6-digit verification code generated by your authenticator app.
                                </p>

                                <div className="flex gap-2 mb-8 justify-between">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => otpRefs.current[index] = el}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            onPaste={handleOtpPaste}
                                            disabled={loading}
                                            className="w-12 h-14 text-center text-2xl font-semibold bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                                        />
                                    ))}
                                </div>

                                {loading && (
                                    <div className="flex justify-center mb-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    </div>
                                )}

                                <div className="text-center mt-6">
                                    <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline-offset-4 hover:underline">
                                        Use backup code instead
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* FORGOT PASSWORD STATE */}
                        {formState === 'FORGOT_PASSWORD' && (
                            <motion.div
                                key="FORGOT"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full"
                            >
                                <button
                                    onClick={() => setFormState('LOGIN')}
                                    className="mb-6 text-slate-400 hover:text-white transition-colors p-1 -ml-1"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                <h2 className="text-[24px] font-[600] text-white tracking-tight mb-2">
                                    Reset password
                                </h2>
                                <p className="text-sm text-slate-400 mb-8">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>

                                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                                    <div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-[44px] px-3 bg-slate-950/50 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm rounded-lg"
                                            placeholder="you@company.com"
                                            disabled={loading}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="w-full h-[44px] bg-white text-slate-900 hover:bg-slate-100 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] focus:ring-white transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* FORGOT PASSWORD SUCCESS STATE */}
                        {formState === 'FORGOT_PASSWORD_SUCCESS' && (
                            <motion.div
                                key="FORGOT_SUCCESS"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full text-center py-6"
                            >
                                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <motion.svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-indigo-400"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    >
                                        <path
                                            d="M20 6L9 17L4 12"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                </div>

                                <h2 className="text-[24px] font-[600] text-white tracking-tight mb-3">
                                    Check your email
                                </h2>
                                <p className="text-sm text-slate-400 mb-8">
                                    We've sent a password reset link to <span className="font-medium text-white">{email}</span>.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        disabled={countdown > 0}
                                        onClick={() => setCountdown(60)}
                                        className="w-full h-[44px] bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {countdown > 0 ? `Resend link in ${countdown}s` : "Resend link"}
                                    </button>

                                    <button
                                        onClick={() => setFormState('LOGIN')}
                                        className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        Return to login
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
