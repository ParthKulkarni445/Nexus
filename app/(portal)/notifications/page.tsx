"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/api/auth";

/**
 * Notifications page - redirects to most relevant section
 * Users typically access notifications via the widget popup that routes to specific pages
 */
export default function NotificationsPage() {
  useEffect(() => {
    // Redirect to mailing as default for coordinators
    redirect("/mailing");
  }, []);

  return null;
}


