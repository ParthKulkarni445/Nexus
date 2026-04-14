"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbitIcon, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const err = searchParams.get("error");
    if (err) setApiError(err);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      const nextPath = json?.data?.role === "student" ? "/student/blogs" : "/companies";
      router.push(nextPath);
      router.refresh();
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left branding panel ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-14 relative overflow-hidden shrink-0"
        style={{ background: "linear-gradient(145deg, #2563EB 0%, #1E3A8A 100%)" }}
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
              Training &amp; Placement
              <br />
              Office Portal
            </h2>
            <p className="mt-3 text-white/60 text-sm leading-relaxed max-w-xs">
              Manage companies, coordinate drives, track outreach, and streamline your entire campus placement process.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Company & Contact Management",
              "Placement Drive Tracking",
              "Team Assignments & Coordination",
              "Automated Mailing & Outreach",
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
              "linear-gradient(rgba(37,99,235,0.25) 2px, transparent 2px), linear-gradient(90deg, rgba(37,99,235,0.25) 2px, transparent 2px)",
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
            <h1 className="text-2xl font-bold text-[#0F172A]">Welcome back</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Sign in to your Nexus account
            </p>
          </div>

          {/* Error banner */}
          {apiError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] animate-fade-in">
              <AlertCircle size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
              <p className="text-sm text-[#2563EB]">{apiError}</p>
            </div>
          )}

          {/* Google sign-in */}
          <a
            href="/api/v1/auth/google"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#0F172A] mb-5"
          >
            <GoogleIcon />
            Sign in with Google
          </a>

          <div className="mb-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-xs text-[#64748B]">or sign in with email</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@iitrpr.ac.in"
                className="input-base"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[#0F172A]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#2563EB] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold mt-1"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#2563EB] hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
