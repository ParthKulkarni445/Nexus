"use client";

import EmptyState from "@/components/ui/EmptyState";
import { BookOpen } from "lucide-react";

export default function BlogsPage() {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="card">
        <EmptyState
          icon={BookOpen}
          title="Blogs"
          description="Student experience blogs and moderation queue will appear here."
        />
      </div>
    </div>
  );
}
