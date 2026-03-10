"use client";

import TopNav from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <TopNav />
      <main className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col w-full max-w-screen-2xl mx-auto px-4 lg:px-6 pt-6 pb-6 xl:pt-0 xl:pb-0">
        {children}
      </main>
    </div>
  );
}
