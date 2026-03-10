"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Building2,
  PhoneCall,
  Mail,
  Users,
  Briefcase,
  Bell,
  BookOpen,
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  OrbitIcon,
} from "lucide-react";
import { Orbit } from "next/font/google";

const navItems = [
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Outreach", href: "/outreach", icon: PhoneCall },
  { label: "Mailing", href: "/mailing", icon: Mail },
  { label: "Assignments", href: "/assignments", icon: Users },
  { label: "Drives", href: "/drives", icon: Briefcase },
  { label: "Blogs", href: "/blogs", icon: BookOpen },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isActive = (href: string) => pathname.startsWith(href);

  async function handleSignOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <>
      {/* ── Main topnav ─────────────────────────────────────── */}
      <nav className="topnav sticky top-0 z-40 w-full">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
          <div className="flex items-center h-12 gap-4">
            {/* Mobile hamburger — left corner */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-[#D4B8B8] hover:text-white hover:bg-white/8 transition-all -ml-1"
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
              {navItems.map(({ label, href, icon: Icon }) => {
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
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2 rounded-lg text-[#D4B8B8] hover:text-white hover:bg-white/8 transition-all"
                aria-label="Search"
              >
                <Search size={17} />
              </button>

              {/* Notification bell */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg text-[#D4B8B8] hover:text-white hover:bg-white/8 transition-all"
              >
                <Bell size={17} />
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#FFFFFF",
                    boxShadow: "0 0 4px rgba(255,255,255,0.6)",
                  }}
                />
              </Link>

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-white/8 transition-all group"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-red-600
                    text-xs font-bold shrink-0"
                    style={{ background: "#FFFFFF" }}
                  >
                    AD
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight">
                      TPO Admin
                    </p>
                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: "#D4B8B8" }}
                    >
                      tpo_admin
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-[#D4B8B8] transition-transform duration-150 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#EDE8E8] shadow-xl z-50 overflow-hidden animate-slide-down"
                    style={{ boxShadow: "0 8px 32px rgba(26,10,10,0.12)" }}
                  >
                    <div className="px-3 py-2.5 border-b border-[#EDE8E8]">
                      <p className="text-xs font-semibold text-[#1A0A0A]">
                        TPO Admin
                      </p>
                      <p className="text-xs text-[#7A6262]">
                        tpo.admin@college.edu
                      </p>
                    </div>
                    <div className="py-1">
                      {[
                        { label: "Profile", icon: User },
                        { label: "Settings", icon: Settings },
                      ].map(({ label, icon: Icon }) => (
                        <button
                          key={label}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1A0A0A] hover:bg-[#FFF1F3] hover:text-[#C41E3A] transition-colors"
                        >
                          <Icon size={14} />
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-[#EDE8E8] py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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

          {/* Inline search bar (slides in below nav) */}
          {searchOpen && (
            <div className="pb-3 animate-slide-down">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6262] pointer-events-none"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search companies, contacts, drives..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/10 text-white placeholder:text-[#D4B8B8] border border-white/15 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={
                    { "--tw-ring-color": "#C41E3A" } as React.CSSProperties
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile side drawer ──────────────────────────────────── */}
      </nav>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: "rgba(26,10,10,0.55)" }}
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
          boxShadow: "4px 0 24px rgba(26,10,10,0.25)",
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
            className="p-1.5 rounded-lg text-[#D4B8B8] hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "text-white"
                    : "text-[#D4B8B8] hover:text-white hover:bg-white/8"
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#C41E3A] text-xs font-bold shrink-0"
              style={{ background: "#FFFFFF" }}
            >
              AD
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                TPO Admin
              </p>
              <p className="text-[11px] truncate" style={{ color: "#D4B8B8" }}>
                tpo.admin@college.edu
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-[#D4B8B8] hover:text-white hover:bg-white/8"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
