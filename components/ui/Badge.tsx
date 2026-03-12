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
  success: "bg-[#2563EB] text-white border border-[#1D4ED8]",
  warning: "bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]",
  danger: "bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]",
  info: "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]",
  purple: "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]",
  gray: "bg-slate-100 text-slate-500 border border-slate-200",
};

const dotMap: Record<string, string> = {
  default: "bg-slate-400",
  success: "bg-white",
  warning: "bg-[#1D4ED8]",
  danger: "bg-[#2563EB]",
  info: "bg-[#2563EB]",
  purple: "bg-[#2563EB]",
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
