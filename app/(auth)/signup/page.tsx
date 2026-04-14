"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbitIcon, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const strength = passwordStrength(form.password);
  const meta = strengthMeta[strength];

  function setField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setApiError("Passwords do not match.");
      return;
    }

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
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(
          json.error?.message ?? "Something went wrong. Please try again."
        );
        return;
      }
      router.push("/companies");
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
              Create your account
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Join Nexus and start your placement journey
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
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
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

              {/* Strength indicator */}
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
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Mismatch hint */}
              {form.confirmPassword &&
                form.password !== form.confirmPassword && (
                  <p className="mt-1.5 text-xs text-[#DC2626] animate-fade-in">
                    Passwords do not match
                  </p>
                )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 rounded-xl text-sm font-semibold mt-1"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-xs text-[#64748B]">or</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
