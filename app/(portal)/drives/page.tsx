"use client";

import EmptyState from "@/components/ui/EmptyState";
import { Briefcase } from "lucide-react";

export default function DrivesPage() {
  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="card">
        <EmptyState
          icon={Briefcase}
          title="Drives"
          description="Placement drive scheduling and calendar will be available here."
        />
      </div>
    </div>
  );
}
