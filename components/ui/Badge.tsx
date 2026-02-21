import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "purple"
    | "gray";
  size?: "sm" | "md";
  dot?: boolean;
}

const variantMap: Record<string, string> = {
  default: "bg-slate-100 text-slate-700 border border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  gray: "bg-slate-100 text-slate-500 border border-slate-200",
};

const dotMap: Record<string, string> = {
  default: "bg-slate-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  purple: "bg-indigo-500",
  gray: "bg-slate-400",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot,
}: BadgeProps) {
  const sizeClass =
    size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-0.5";
  return (
    <span className={`badge ${sizeClass} ${variantMap[variant]}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotMap[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
