"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of placement activities" },
  "/companies": {
    title: "Companies",
    subtitle: "Master database of all companies",
  },
  "/outreach": {
    title: "Outreach",
    subtitle: "Operational workspace for coordinators",
  },
  "/mailing": {
    title: "Mailing",
    subtitle: "Email approval and dispatch center",
  },
  "/assignments": {
    title: "Assignments",
    subtitle: "Manage company assignments to coordinators",
  },
  "/drives": { title: "Drives", subtitle: "Placement drive schedules" },
  "/blogs": { title: "Blogs", subtitle: "Student experience blogs" },
  "/notifications": {
    title: "Notifications",
    subtitle: "System notifications",
  },
};

function getPageInfo(pathname: string) {
  // Exact match
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Prefix match
  for (const key of Object.keys(pageTitles).sort(
    (a, b) => b.length - a.length,
  )) {
    if (pathname.startsWith(key) && key !== "/") return pageTitles[key];
  }
  return { title: "Nexus", subtitle: undefined };
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Restore collapse preference
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored) setSidebarCollapsed(stored === "true");
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const { title, subtitle } = getPageInfo(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
