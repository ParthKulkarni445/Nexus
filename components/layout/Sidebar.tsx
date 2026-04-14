"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  PhoneCall,
  Mail,
  Users,
  BookOpen,
  Menu,
  X,
  ChevronDown,
  LogOut,
  OrbitIcon,
  Shield,
} from "lucide-react";
import { canAccessAppPath } from "@/lib/auth/rbac";
import NotificationWidget from "@/components/ui/NotificationWidget";

const navItems = [
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Outreach", href: "/outreach", icon: PhoneCall },
  { label: "Confirmed", href: "/confirmed", icon: CheckCircle2 },
  { label: "Stats", href: "/drives", icon: BarChart3 },
  { label: "Mailing", href: "/mailing", icon: Mail },
  { label: "Assignments", href: "/assignments", icon: Users },
  { label: "Blogs", href: "/blogs", icon: BookOpen },
  { label: "Admin", href: "/admin", icon: Shield },
];

type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  coordinatorType?: string;
};

function formatRoleLabel(role?: string, coordinatorType?: string) {
  if (!role) return "User";
  if (role === "coordinator" && coordinatorType) {
    return coordinatorType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TopNav({ currentUser }: { currentUser: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = currentUser.name || "User";
  const displayEmail = currentUser.email || "";
  const displayRole = formatRoleLabel(
    currentUser.role,
    currentUser.coordinatorType,
  );
  const displayHandle = displayEmail.includes("@")
    ? displayEmail.split("@")[0]
    : displayRole.toLowerCase().replace(/\s+/g, "_");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const visibleNavItems = navItems.filter((item) =>
    canAccessAppPath(item.href, currentUser),
  );

  const isActive = (href: string) => pathname.startsWith(href);

  async function handleSignOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleChangeUsername() {
    setUsernameError(null);

    if (!newUsername.trim()) {
      setUsernameError("Username cannot be empty");
      return;
    }

    if (newUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    setUsernameLoading(true);
    try {
      const res = await fetch("/api/v1/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUsername }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to update username");
      }

      setSuccessMessage("Username updated successfully!");
      setNewUsername("");
      setChangeUsernameOpen(false);
      setTimeout(() => {
        setSuccessMessage(null);
        router.refresh();
      }, 1500);
    } catch (error) {
      setUsernameError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setUsernameLoading(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to change password");
      }

      setSuccessMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOpen(false);
      setTimeout(() => {
        setSuccessMessage(null);
        router.refresh();
      }, 1500);
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* ── Main topnav ─────────────────────────────────────── */}
      <nav className="topnav sticky top-0 z-40 w-full">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
          <div className="flex items-center h-12 gap-4">
            {/* Mobile hamburger — left corner */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-[#93C5FD] hover:text-white hover:bg-white/8 transition-all -ml-1"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Brand */}
            <Link
              href="/companies"
              className="flex items-center gap-1.5 shrink-0 select-none"
            >
              <OrbitIcon size={24} className="text-black" />
              <span className="text-white font-black ">
                <span className="text-2xl  leading-none">N</span>
                <span className="text-lg leading-none">EXUS</span>
              </span>
            </Link>
            {/* Desktop nav links */}
            <div className="hidden lg:flex items-stretch gap-0 self-stretch ml-8">
              {visibleNavItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-1.5 px-3 text-sm font-medium transition-all relative
                      ${
                        active
                          ? "text-white"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }
                    `}
                    style={
                      active ? { boxShadow: "inset 0 -4px 0 #FFFFFF" } : {}
                    }
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="uppercase tracking-wide">{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right slot */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Notification widget */}
              <NotificationWidget />

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-white/8 transition-all group"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-blue-600
                    text-xs font-bold shrink-0"
                    style={{ background: "#FFFFFF" }}
                  >
                    {initials || "U"}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {displayName}
                    </p>
                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: "#93C5FD" }}
                    >
                      {displayHandle}
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-[#93C5FD] transition-transform duration-150 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden animate-slide-down"
                    style={{ boxShadow: "0 8px 32px rgba(15,23,42,0.12)" }}
                  >
                    <div className="px-3 py-2.5 border-b border-[#E2E8F0]">
                      <p className="text-xs font-semibold text-[#0F172A]">
                        {displayName}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {displayEmail || displayRole}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setChangeUsernameOpen(true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors"
                      >
                        Change username
                      </button>
                      <button
                        onClick={() => {
                          setChangePasswordOpen(true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors"
                      >
                        Change password
                      </button>
                    </div>
                    <div className="border-t border-[#E2E8F0] py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile side drawer ──────────────────────────────────── */}
      </nav>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: "rgba(15,23,42,0.55)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Side drawer panel */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full z-50 flex flex-col animate-slide-in-left transition-transform duration-220 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "240px",
          background: "var(--nav-bg)",
          borderRight: "1px solid var(--nav-border)",
          boxShadow: "4px 0 24px rgba(15,23,42,0.25)",
        }}
      >
        {/* Drawer header — brand + close */}
        <div
          className="flex items-center justify-between px-4 h-12 shrink-0"
          style={{ borderBottom: "1px solid var(--nav-border)" }}
        >
          <Link
            href="/companies"
            className="flex items-center gap-1.5 select-none"
            onClick={() => setMobileOpen(false)}
          >
            <OrbitIcon size={22} className="text-white" />
            <span className="text-white font-black">
              <span className="text-xl leading-none">N</span>
              <span className="text-base leading-none">EXUS</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-[#93C5FD] hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {visibleNavItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "text-white"
                    : "text-[#93C5FD] hover:text-white hover:bg-white/8"
                }`}
                style={
                  active
                    ? {
                        background: "rgba(255,255,255,0.12)",
                        boxShadow: "inset 3px 0 0 #FFFFFF",
                      }
                    : {}
                }
              >
                <Icon size={17} className="shrink-0" />
                <span className="uppercase tracking-wide text-xs font-semibold">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* User footer */}
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--nav-border)" }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#2563EB] text-xs font-bold shrink-0"
              style={{ background: "#FFFFFF" }}
            >
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {displayName}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#93C5FD" }}>
                {displayEmail || displayRole}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-[#93C5FD] hover:text-white hover:bg-white/8"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div
          className="fixed top-4 right-4 px-4 py-2 rounded-lg text-white text-sm font-medium z-50 animate-pulse"
          style={{ background: "#10B981" }}
        >
          {successMessage}
        </div>
      )}

      {/* Change Username Modal */}
      {changeUsernameOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setChangeUsernameOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-96 border border-[#E2E8F0] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Change username
              </h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="text"
                placeholder="New username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              {usernameError && (
                <p className="text-sm text-red-600">{usernameError}</p>
              )}
            </div>
            <div className="px-6 py-4 flex gap-2 border-t border-[#E2E8F0]">
              <button
                onClick={() => {
                  setChangeUsernameOpen(false);
                  setNewUsername("");
                  setUsernameError(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeUsername}
                disabled={usernameLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {usernameLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setChangePasswordOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-96 border border-[#E2E8F0] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Change password
              </h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <input
                type="password"
                placeholder="New password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div className="px-6 py-4 flex gap-2 border-t border-[#E2E8F0]">
              <button
                onClick={() => {
                  setChangePasswordOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {passwordLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
