"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbitIcon, Eye, EyeOff, Loader2, AlertCircle, Mail, CheckCircle2 } from "lucide-react";

const STEPS = ["email", "otp", "password"] as const;
type Step = (typeof STEPS)[number];

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleRequestOtp(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setApiError(null);

        try {
            const res = await fetch("/api/v1/auth/forgot-password/request-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const json = await res.json();
            if (!res.ok) {
                setApiError(json.error?.message ?? "Something went wrong.");
                return;
            }
            setStep("otp");
        } catch {
            setApiError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault();
        if (otp.length !== 6) {
            setApiError("Please enter the 6-digit OTP.");
            return;
        }
        setStep("password");
        setApiError(null);
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setApiError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setApiError(null);

        try {
            const res = await fetch("/api/v1/auth/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const json = await res.json();
            if (!res.ok) {
                setApiError(json.error?.message ?? "Something went wrong.");
                if (json.error?.code === "INVALID_OTP" || json.error?.code === "OTP_EXPIRED") {
                    setStep("otp");
                    setOtp("");
                }
                return;
            }
            setSuccess(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch {
            setApiError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const stepTitles: Record<Step, string> = {
        email: "Forgot password?",
        otp: "Check your email",
        password: "Set new password",
    };
    const stepSubtitles: Record<Step, string> = {
        email: "Enter your @iitrpr.ac.in email and we'll send you an OTP",
        otp: `We sent a 6-digit OTP to ${email}`,
        password: "Enter and confirm your new password",
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left branding panel */}
            <div
                className="hidden lg:flex lg:w-[46%] flex-col justify-between p-14 relative overflow-hidden shrink-0"
                style={{ background: "linear-gradient(145deg, #2563EB 0%, #1E3A8A 100%)" }}
            >
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute -bottom-28 -right-28 w-[30rem] h-[30rem] rounded-full border border-white/10 pointer-events-none" />
                <div className="relative flex items-center gap-2 select-none">
                    <OrbitIcon size={30} className="text-black" />
                    <span className="font-black text-white tracking-tight">
                        <span className="text-[2rem] leading-none">N</span>
                        <span className="text-[1.5rem] leading-none">EXUS</span>
                    </span>
                </div>
                <div className="relative space-y-4">
                    <h2 className="text-[1.85rem] font-bold text-white leading-snug">
                        Recover your<br />account securely
                    </h2>
                    <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                        We use OTP-based verification to ensure only you can reset your password.
                    </p>
                </div>
                <p className="relative text-white/30 text-xs">
                    © {new Date().getFullYear()} Nexus TPO. All rights reserved.
                </p>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-14">
                <div className="lg:hidden flex items-center gap-2 mb-10 select-none">
                    <OrbitIcon size={26} className="text-black" />
                    <span className="font-black text-[#2563EB]">
                        <span className="text-2xl leading-none">N</span>
                        <span className="text-lg leading-none">EXUS</span>
                    </span>
                </div>

                <div className="card w-full max-w-sm p-8">
                    {success ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-[#059669]" />
                            </div>
                            <h1 className="text-xl font-bold text-[#0F172A]">Password reset!</h1>
                            <p className="text-sm text-[#64748B] text-center">
                                Your password has been updated. Redirecting you to sign in…
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-[#0F172A]">{stepTitles[step]}</h1>
                                <p className="text-sm text-[#64748B] mt-1">{stepSubtitles[step]}</p>
                            </div>

                            {apiError && (
                                <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] animate-fade-in">
                                    <AlertCircle size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
                                    <p className="text-sm text-[#2563EB]">{apiError}</p>
                                </div>
                            )}

                            {step === "email" && (
                                <form onSubmit={handleRequestOtp} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                            Email address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            autoFocus
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@iitrpr.ac.in"
                                            className="input-base"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold"
                                    >
                                        {loading && <Loader2 size={15} className="animate-spin" />}
                                        {loading ? "Sending OTP…" : "Send OTP"}
                                    </button>
                                </form>
                            )}

                            {step === "otp" && (
                                <form onSubmit={handleVerifyOtp} className="space-y-5">
                                    <div className="flex justify-center mb-2">
                                        <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                                            <Mail size={26} className="text-[#2563EB]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                            Enter the 6-digit OTP
                                        </label>
                                        <input
                                            id="otp"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            required
                                            autoFocus
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            placeholder="000000"
                                            className="input-base text-center text-2xl tracking-[0.4em] font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={otp.length !== 6}
                                        className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold"
                                    >
                                        Continue →
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep("email"); setApiError(null); setOtp(""); }}
                                        className="w-full text-center text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
                                    >
                                        ← Change email or resend OTP
                                    </button>
                                </form>
                            )}

                            {step === "password" && (
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div>
                                        <label htmlFor="newpwd" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                            New password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="newpwd"
                                                type={showPwd ? "text" : "password"}
                                                required
                                                minLength={8}
                                                autoFocus
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Min. 8 characters"
                                                className="input-base pr-10"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPwd((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5"
                                            >
                                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="confirmpwd" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                                            Confirm new password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="confirmpwd"
                                                type={showConfirm ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="input-base pr-10"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5"
                                            >
                                                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {confirmPassword && newPassword !== confirmPassword && (
                                            <p className="mt-1.5 text-xs text-[#DC2626]">Passwords do not match</p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold"
                                    >
                                        {loading && <Loader2 size={15} className="animate-spin" />}
                                        {loading ? "Resetting…" : "Reset Password"}
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    <div className="mt-6">
                        <p className="text-center text-sm text-[#64748B]">
                            Remember your password?{" "}
                            <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
