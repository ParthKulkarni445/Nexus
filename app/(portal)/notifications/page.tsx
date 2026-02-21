"use client";

import EmptyState from "@/components/ui/EmptyState";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="card">
        <EmptyState
          icon={Bell}
          title="Notifications"
          description="Your system notifications will appear here."
        />
      </div>
    </div>
  );
}
