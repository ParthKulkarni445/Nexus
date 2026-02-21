import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-indigo-600",
  iconBg = "bg-indigo-50",
  subtitle,
}: StatCardProps) {
  const changeColors = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-slate-500",
  };

  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 leading-tight">
          {value}
        </p>
        {change && (
          <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
        )}
        {subtitle && !change && (
          <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
