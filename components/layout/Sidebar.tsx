"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Mail,
  Menu,
  OrbitIcon,
  PhoneCall,
  Shield,
  Users,
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

type AccountMenuProps = {
  currentUser: NavUser;
  compact?: boolean;
  mobileLabel?: boolean;
  flat?: boolean;
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

function AccountMenu({
  currentUser,
  compact = false,
  mobileLabel = false,
  flat = false,
}: AccountMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        error instanceof Error ? error.message : "An error occurred",
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
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((value) => !value)}
          className={`flex items-center gap-2 rounded-lg transition-all ${
            flat
              ? "px-0 py-1 hover:opacity-90"
              : compact
                ? "px-0 py-1 hover:opacity-90"
                : "bg-white px-2.5 py-1.5 shadow-sm hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              flat ? "bg-white text-[#2563EB]" : "bg-[#DBEAFE] text-[#2563EB]"
            }`}
          >
            {initials || "U"}
          </div>
          {!compact && (
            <div className="hidden text-left md:block">
              <p
                className={`text-xs font-semibold leading-tight ${
                  flat ? "text-white" : "text-slate-900"
                }`}
              >
                {displayName}
              </p>
              <p
                className={`text-[10px] leading-tight ${
                  flat ? "text-white/75" : "text-slate-500"
                }`}
              >
                {mobileLabel ? displayHandle : displayRole}
              </p>
            </div>
          )}
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${
              flat ? "text-white/80" : "text-slate-500"
            } ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl animate-slide-down"
            style={{ boxShadow: "0 8px 32px rgba(15,23,42,0.12)" }}
          >
            <div className="border-b border-[#E2E8F0] px-3 py-2.5">
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
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-[#0F172A] transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Change username
              </button>
              <button
                onClick={() => {
                  setChangePasswordOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-[#0F172A] transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Change password
              </button>
            </div>
            <div className="border-t border-[#E2E8F0] py-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2.5 px-3 py-2 text-sm text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {successMessage && (
        <div
          className="fixed right-4 top-4 z-50 animate-pulse rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "#10B981" }}
        >
          {successMessage}
        </div>
      )}

      {changeUsernameOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setChangeUsernameOpen(false)}
        >
          <div
            className="w-96 animate-scale-up rounded-xl border border-[#E2E8F0] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#E2E8F0] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Change username
              </h3>
            </div>
            <div className="space-y-3 px-6 py-4">
              <input
                type="text"
                placeholder="New username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
              {usernameError && (
                <p className="text-sm text-red-600">{usernameError}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-[#E2E8F0] px-6 py-4">
              <button
                onClick={() => {
                  setChangeUsernameOpen(false);
                  setNewUsername("");
                  setUsernameError(null);
                }}
                className="flex-1 rounded-lg px-4 py-2 text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeUsername}
                disabled={usernameLoading}
                className="flex-1 rounded-lg bg-[#2563EB] px-4 py-2 text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {usernameLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changePasswordOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setChangePasswordOpen(false)}
        >
          <div
            className="w-96 animate-scale-up rounded-xl border border-[#E2E8F0] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#E2E8F0] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Change password
              </h3>
            </div>
            <div className="space-y-3 px-6 py-4">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
              <input
                type="password"
                placeholder="New password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-[#E2E8F0] px-6 py-4">
              <button
                onClick={() => {
                  setChangePasswordOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
                className="flex-1 rounded-lg px-4 py-2 text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="flex-1 rounded-lg bg-[#2563EB] px-4 py-2 text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
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

export function PortalTopBar({ currentUser }: { currentUser: NavUser }) {
  return (
    <header className="sticky top-0 z-30 hidden h-12 items-center border-b border-[#1D4ED8] bg-[#2563EB] px-6 lg:flex">
      <Link
        href="/companies"
        className="flex items-center gap-1.5 shrink-0 select-none"
      >
        <OrbitIcon
          size={24}
          className="text-black motion-safe:animate-[spin_6s_linear_infinite]"
        />
        <span className="font-black text-white">
          <span className="text-2xl leading-none">N</span>
          <span className="text-lg leading-none">EXUS</span>
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <NotificationWidget />
        <AccountMenu currentUser={currentUser} flat />
      </div>
    </header>
  );
}

export default function PortalSidebar({
  currentUser,
  collapsed = false,
  onCollapsedChange,
}: {
  currentUser: NavUser;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) =>
    canAccessAppPath(item.href, currentUser),
  );

  const isActive = (href: string) => pathname.startsWith(href);

  async function handleSidebarSignOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const handleCollapsedToggle = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <>
      <div className="sticky top-0 z-40 ml-18 lg:hidden">
        <nav className="topnav w-full">
          <div className="px-4">
            <div className="flex h-12 items-center">
              <Link
                href="/companies"
                className="flex items-center gap-1.5 shrink-0 select-none"
              >
                <OrbitIcon
                  size={22}
                  className="text-black motion-safe:animate-[spin_6s_linear_infinite]"
                />
                <span className="font-black text-white">
                  <span className="text-2xl leading-none">N</span>
                  <span className="text-lg leading-none">EXUS</span>
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-1">
                <NotificationWidget />
                <AccountMenu
                  currentUser={currentUser}
                  compact
                  mobileLabel
                  flat
                />
              </div>
            </div>
          </div>
        </nav>
      </div>

      <aside
        className="fixed bottom-0 left-0 top-0 z-30 flex w-18 flex-col lg:hidden"
        style={{
          background: "#000000",
          borderRight: "1px solid #1E293B",
        }}
      >
        <div
          className="flex h-12 items-center justify-center"
          style={{ borderBottom: "1px solid #1E293B" }}
        >
          <button
            type="button"
            aria-label="Open sidebar menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <Menu size={18} />
          </button>
        </div>
        <div className="flex-1 px-2 py-4">
          <div className="space-y-1.5">
            {visibleNavItems.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={`mobile-rail-${href}`}
                  href={href}
                  title={label}
                  className={`flex justify-center rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                    active
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-white"
                  }`}
                  style={active ? { background: "rgba(255,255,255,0.12)" } : {}}
                >
                  <Icon size={18} className="shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
        <div
          className="shrink-0 px-2 py-3"
          style={{ borderTop: "1px solid #1E293B" }}
        >
          <button
            type="button"
            title="Sign out"
            onClick={() => void handleSidebarSignOut()}
            className="flex w-full justify-center rounded-xl bg-[#DC2626] px-3 py-3 text-sm font-medium text-white transition-all hover:bg-[#B91C1C]"
          >
            <LogOut size={18} className="shrink-0" />
          </button>
        </div>
      </aside>

      <aside
        className={`hidden lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:flex lg:shrink-0 lg:flex-col transition-[width] duration-200 ${
          collapsed ? "lg:w-18" : "lg:w-72"
        }`}
        style={{
          background: "#0F172A",
          borderRight: "1px solid #1E293B",
        }}
      >
        <div
          className={`flex h-12 items-center ${collapsed ? "justify-center px-2" : "px-4"}`}
          style={{ borderBottom: "1px solid #1E293B" }}
        >
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={handleCollapsedToggle}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <Menu size={18} />
          </button>
        </div>

        <div className={`flex-1 ${collapsed ? "px-2 py-4" : "px-4 py-5"}`}>
          <div className="space-y-1.5">
            {visibleNavItems.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-white"
                  } ${collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"}`}
                  style={active ? { background: "rgba(255,255,255,0.12)" } : {}}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && (
                    <span className="uppercase tracking-wide">{label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <div
          className={`shrink-0 ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}
          style={{ borderTop: "1px solid #1E293B" }}
        >
          <button
            type="button"
            title={collapsed ? "Sign out" : undefined}
            onClick={() => void handleSidebarSignOut()}
            className={`flex w-full items-center rounded-xl text-sm font-medium text-[#93C5FD] transition-all hover:bg-white/8 hover:text-white ${
              collapsed
                ? "justify-center px-3 py-3 bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                : "justify-center gap-3 px-4 py-3 bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && (
              <span className="uppercase tracking-wide">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ background: "rgba(15,23,42,0.55)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col transition-transform duration-220 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#0F172A",
          borderRight: "1px solid #1E293B",
          boxShadow: "4px 0 24px rgba(15,23,42,0.25)",
        }}
      >
        <div
          className="flex h-12 items-center justify-between px-4"
          style={{ borderBottom: "1px solid #1E293B" }}
        >
          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-lg p-1.5 text-[#93C5FD] transition-all hover:bg-white/10 hover:text-white"
          >
            <Menu size={17} />
          </button>
          <div className="w-7" />
        </div>

        <div className="flex-1 px-3 py-3">
          <div className="space-y-0.5">
            {visibleNavItems.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/8 hover:text-white"
                  }`}
                  style={active ? { background: "rgba(255,255,255,0.12)" } : {}}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: "1px solid #1E293B" }}
        >
          <button
            type="button"
            onClick={() => void handleSidebarSignOut()}
            className="flex w-full items-center gap-2.5 rounded-lg bg-[#DC2626] px-3 py-2 text-sm text-white transition-all hover:bg-[#B91C1C]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
