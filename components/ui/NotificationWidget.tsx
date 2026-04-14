"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Mail, BookOpen, Building2 } from "lucide-react";

type NotificationSummary = {
  pendingMails: number;
  pendingBlogs: number;
  assignedCompanies: number;
};

const EMPTY: NotificationSummary = {
  pendingMails: 0,
  pendingBlogs: 0,
  assignedCompanies: 0,
};

export default function NotificationWidget() {
  const [isOpen, setIsOpen] = useState(false);
  // badgeCount drives the red-dot on the bell (updated on mount, cleared after panel is opened)
  const [badgeCount, setBadgeCount] = useState(0);
  // summary drives what's shown inside the open panel
  const [summary, setSummary] = useState<NotificationSummary>(EMPTY);
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // ── Fetch badge count only — no mark-viewed. Used on mount so bell indicator shows.
  const fetchBadgeCount = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/summary");
      if (res.ok) {
        const data = await res.json();
        const s: NotificationSummary = data.data;
        setBadgeCount(s.pendingMails + s.pendingBlogs + s.assignedCompanies);
      }
    } catch {
      // badge fetch is best-effort; silent failure is fine
    }
  }, []);

  // ── Fetch summary for panel display AND mark as viewed so these won't show again.
  const fetchSummaryAndMarkViewed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data);
        // Persist the "viewed" timestamp so future fetches don't repeat these items
        await fetch("/api/v1/notifications/mark-viewed", { method: "POST" }).catch(
          () => console.error("Failed to mark notifications as viewed")
        );
        // Clear badge — user has now seen the notifications
        setBadgeCount(0);
      } else {
        console.error("Failed to fetch notification summary, status:", res.status);
      }
    } catch (error) {
      console.error("Failed to fetch notification summary:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch badge count once on mount so the bell lights up without requiring a click
  useEffect(() => {
    fetchBadgeCount();
  }, [fetchBadgeCount]);

  // When panel opens → fetch fresh summary and mark viewed
  // When panel closes → clear panel summary (badge already cleared when panel was opened)
  useEffect(() => {
    if (isOpen) {
      fetchSummaryAndMarkViewed();
    } else {
      setSummary(EMPTY);
    }
  }, [isOpen, fetchSummaryAndMarkViewed]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalNotifications =
    summary.pendingMails + summary.pendingBlogs + summary.assignedCompanies;

  return (
    <div className="relative" ref={widgetRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg text-[#93C5FD] hover:text-white hover:bg-white/8 transition-all"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {badgeCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: "#EF4444",
              boxShadow: "0 0 6px rgba(239,68,68,0.8)",
            }}
          />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-[#E2E8F0] shadow-2xl z-50 overflow-hidden animate-slide-down"
          style={{ boxShadow: "0 12px 40px rgba(15,23,42,0.2)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              New Work Assigned
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {loading
                ? "Loading…"
                : totalNotifications > 0
                  ? `${totalNotifications} new item${totalNotifications !== 1 ? "s" : ""}`
                  : "No new work"}
            </p>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : totalNotifications === 0 ? (
              <div className="text-center py-8">
                <Bell size={24} className="mx-auto text-[#CBD5E1] mb-2" />
                <p className="text-xs text-[#94A3B8]">All caught up!</p>
              </div>
            ) : (
              <>
                {/* Pending Mails */}
                {summary.pendingMails > 0 && (
                  <Link href="/mailing" onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-blue-50 transition-all cursor-pointer group">
                      <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                        <Mail size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">
                          Mailing Queue
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {summary.pendingMails} new
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {summary.pendingMails}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Pending Blogs */}
                {summary.pendingBlogs > 0 && (
                  <Link href="/blogs" onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-blue-50 transition-all cursor-pointer group">
                      <div className="p-2 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
                        <BookOpen size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">
                          Blogs to Review
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {summary.pendingBlogs} new
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                        {summary.pendingBlogs}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Assigned Companies */}
                {summary.assignedCompanies > 0 && (
                  <Link href="/outreach" onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-blue-50 transition-all cursor-pointer group">
                      <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                        <Building2 size={16} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">
                          Companies Assigned
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {summary.assignedCompanies} new
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {summary.assignedCompanies}
                      </span>
                    </div>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
