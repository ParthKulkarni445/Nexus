"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  PhoneCall,
  Mail,
  Users,
  LayoutDashboard,
  ChevronLeft,
  X,
  Briefcase,
  Bell,
  BookOpen,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Companies",
    href: "/companies",
    icon: Building2,
  },
  {
    label: "Outreach",
    href: "/outreach",
    icon: PhoneCall,
  },
  {
    label: "Mailing",
    href: "/mailing",
    icon: Mail,
  },
  {
    label: "Assignments",
    href: "/assignments",
    icon: Users,
  },
  {
    label: "Drives",
    href: "/drives",
    icon: Briefcase,
  },
  {
    label: "Blogs",
    href: "/blogs",
    icon: BookOpen,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col sidebar-enter
          bg-[#0F172A] text-slate-300 overflow-hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? "w-17" : "w-64"}
        `}
        style={{ transition: "width 0.25s, transform 0.25s" }}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-700/60 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">
                  Nexus
                </p>
                <p className="text-xs text-slate-500 leading-tight">
                  Placement Portal
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">N</span>
            </div>
          )}

          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${
                        active
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent"
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 ${active ? "text-indigo-400" : ""}`}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex items-center justify-end px-3 pb-4 pt-2 border-t border-slate-700/60">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="px-4 pb-4 border-t border-slate-700/60 pt-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-semibold shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  TPO Admin
                </p>
                <p className="text-xs text-slate-500 truncate">
                  tpo.admin@college.edu
                </p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="px-3 pb-4 border-t border-slate-700/60 pt-3 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-semibold">
              AD
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
