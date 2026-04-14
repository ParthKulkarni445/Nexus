"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  OrbitIcon,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
} from "lucide-react";

const ALLOWED_DOMAIN = "iitrpr.ac.in";

function passwordStrength(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const strengthMeta: Record<
  0 | 1 | 2 | 3 | 4,
  { label: string; color: string }
> = {
  0: { label: "", color: "#E2E8F0" },
  1: { label: "Weak", color: "#DC2626" },
  2: { label: "Fair", color: "#D97706" },
  3: { label: "Good", color: "#059669" },
  4: { label: "Strong", color: "#059669" },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const strength = passwordStrength(form.password);
  const meta = strengthMeta[strength];

  function setField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setApiError("Passwords do not match.");
      return;
    }
    if (!form.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setApiError(`Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/v1/auth/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(
          json.error?.message ?? "Something went wrong. Please try again.",
        );
        return;
      }
      setStep("otp");
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          otp,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(
          json.error?.message ?? "Something went wrong. Please try again.",
        );
        return;
      }
      router.push("/student/blogs");
      router.refresh();
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const brandingPanel = (
    <div
      className="hidden lg:flex lg:w-[46%] flex-col justify-between p-14 relative overflow-hidden shrink-0"
      style={{
        background: "linear-gradient(145deg, #2563EB 0%, #1E3A8A 100%)",
      }}
    >
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute -top-14 -left-14 w-72 h-72 rounded-full border border-white/8 pointer-events-none" />
      <div className="absolute -bottom-28 -right-28 w-[30rem] h-[30rem] rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute bottom-28 right-14 w-52 h-52 rounded-full border border-white/6 pointer-events-none" />
      <div className="relative flex items-center gap-2 select-none">
        <OrbitIcon size={30} className="text-black" />
        <span className="font-black text-white tracking-tight">
          <span className="text-[2rem] leading-none">N</span>
          <span className="text-[1.5rem] leading-none">EXUS</span>
        </span>
      </div>
      <div className="relative space-y-8">
        <div>
          <h2 className="text-[1.85rem] font-bold text-white leading-snug">
            Join the Nexus
            <br />
            TPO Platform
          </h2>
          <p className="mt-3 text-white/60 text-sm leading-relaxed max-w-xs">
            Create your account and get access to placement drives, company
            listings, and all TPO resources in one place.
          </p>
        </div>
        <div className="space-y-3">
          {[
            "Track your placement journey",
            "Access company & drive listings",
            "Stay updated with notifications",
            "Connect with your TPO team",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
              <span className="text-white/70 text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="relative text-white/30 text-xs">
        © {new Date().getFullYear()} Nexus TPO. All rights reserved.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {brandingPanel}

      {/* ── Right form panel ────────────────────────────────────── */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-14"
        style={{
          background:
            "linear-gradient(135deg, #F8FBFF 0%, #EEF5FF 48%, #F8FBFF 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 40%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,235,0.2) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(37,99,235,0.2) 1.5px, transparent 1.5px)",
            backgroundSize: "72px 72px",
            backgroundPosition: "-72px -72px",
            animation: "gridPanelDrift 7s linear infinite",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-0 hidden w-2/3 lg:block"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.18), rgba(255,255,255,0) 68%)",
          }}
        />
        {/* Mobile logo */}
        <div className="relative z-10 lg:hidden flex items-center gap-2 mb-10 select-none">
          <OrbitIcon size={26} className="text-black" />
          <span className="font-black text-[#2563EB]">
            <span className="text-2xl leading-none">N</span>
            <span className="text-lg leading-none">EXUS</span>
          </span>
        </div>

        <div className="relative z-10 card w-full max-w-sm p-8 backdrop-blur-[2px]">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0F172A]">
              {step === "form" ? "Create your account" : "Verify your email"}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              {step === "form"
                ? "Only @iitrpr.ac.in email addresses are accepted"
                : `We sent a 6-digit OTP to ${form.email}`}
            </p>
          </div>

          {/* Error banner */}
          {apiError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] animate-fade-in">
              <AlertCircle
                size={15}
                className="text-[#2563EB] shrink-0 mt-0.5"
              />
              <p className="text-sm text-[#2563EB]">{apiError}</p>
            </div>
          )}

          {step === "form" ? (
            <>
              {/* Google signup button */}
              <a
                href="/api/v1/auth/google"
                className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#0F172A] mb-5"
              >
                <GoogleIcon />
                Sign up with Google
              </a>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                <span className="text-xs text-[#64748B]">
                  or sign up with email
                </span>
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Full name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[#0F172A] mb-1.5"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Arjun Sharma"
                    className="input-base"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#0F172A] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="you@iitrpr.ac.in"
                    className="input-base"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#0F172A] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      placeholder="Min. 8 characters"
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 space-y-1.5 animate-fade-in">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{
                              background:
                                strength >= i ? meta.color : "#E2E8F0",
                            }}
                          />
                        ))}
                      </div>
                      {meta.label && (
                        <p
                          className="text-xs font-medium"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-sm font-medium text-[#0F172A] mb-1.5"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm"
                      name="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setField("confirmPassword", e.target.value)
                      }
                      placeholder="••••••••"
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.confirmPassword &&
                    form.password !== form.confirmPassword && (
                      <p className="mt-1.5 text-xs text-[#DC2626] animate-fade-in">
                        Passwords do not match
                      </p>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold mt-1"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
            </>
          ) : (
            /* ── OTP step ── */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                  <Mail size={26} className="text-[#2563EB]" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-[#0F172A] mb-1.5"
                >
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
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="input-base text-center text-2xl tracking-[0.4em] font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Verifying…" : "Verify & Create Account"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setApiError(null);
                  setOtp("");
                }}
                className="w-full text-center text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                ← Change email or resend OTP
              </button>
            </form>
          )}

          {/* Login link */}
          {step === "form" && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
              <p className="text-center text-sm text-[#64748B]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#2563EB] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
