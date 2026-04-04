"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbitIcon, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
        setApiError(
          json.error?.message ?? "Something went wrong. Please try again."
        );
        return;
      }
      const nextPath =
        json?.data?.role === "student" ? "/student/blogs" : "/companies";
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
        style={{
          background: "linear-gradient(145deg, #2563EB 0%, #1E3A8A 100%)",
        }}
      >
        {/* Decorative rings */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -top-14 -left-14 w-72 h-72 rounded-full border border-white/8 pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-[30rem] h-[30rem] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute bottom-28 right-14 w-52 h-52 rounded-full border border-white/6 pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2 select-none">
          <OrbitIcon size={30} className="text-black" />
          <span className="font-black text-white tracking-tight">
            <span className="text-[2rem] leading-none">N</span>
            <span className="text-[1.5rem] leading-none">EXUS</span>
          </span>
        </div>

        {/* Content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-[1.85rem] font-bold text-white leading-snug">
              Training & Placement
              <br />
              Office Portal
            </h2>
            <p className="mt-3 text-white/60 text-sm leading-relaxed max-w-xs">
              Manage companies, coordinate drives, track outreach, and
              streamline your entire campus placement process.
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10 select-none">
          <OrbitIcon size={26} className="text-black" />
          <span className="font-black text-[#2563EB]">
            <span className="text-2xl leading-none">N</span>
            <span className="text-lg leading-none">EXUS</span>
          </span>
        </div>

        <div className="card w-full max-w-sm p-8">
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
              <AlertCircle
                size={15}
                className="text-[#2563EB] shrink-0 mt-0.5"
              />
              <p className="text-sm text-[#2563EB]">{apiError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
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
            <span className="text-xs text-[#64748B]">or</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
