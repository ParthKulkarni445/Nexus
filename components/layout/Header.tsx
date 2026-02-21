"use client";

import { Menu, Bell, Search } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

export default function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 shrink-0 sticky top-0 z-20">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Global search (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-48 lg:w-64">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></span>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 text-xs font-semibold cursor-pointer hover:bg-indigo-200 transition-colors">
          AD
        </div>
      </div>
    </header>
  );
}
