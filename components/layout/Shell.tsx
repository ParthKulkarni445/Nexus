"use client";

import { useState } from "react";
import PortalSidebar, { PortalTopBar } from "./Sidebar";

type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  coordinatorType?: string;
};

export default function Shell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: ShellUser;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <PortalSidebar
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={`ml-18 flex min-w-0 flex-1 flex-col transition-[margin-left] duration-200 ${
          sidebarCollapsed ? "lg:ml-18" : "lg:ml-72"
        }`}
      >
        <PortalTopBar currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto flex flex-col w-full px-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
