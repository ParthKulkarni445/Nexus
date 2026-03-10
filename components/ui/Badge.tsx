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
  success: "bg-[#C41E3A] text-white border border-[#A8192F]",
  warning: "bg-[#FFE4E9] text-[#A8192F] border border-[#FBBDC8]",
  danger: "bg-[#FFF1F3] text-[#C41E3A] border border-[#C41E3A]",
  info: "bg-[#FFF1F3] text-[#C41E3A] border border-[#FBBDC8]",
  purple: "bg-[#FFF1F3] text-[#C41E3A] border border-[#FBBDC8]",
  gray: "bg-slate-100 text-slate-500 border border-slate-200",
};

const dotMap: Record<string, string> = {
  default: "bg-slate-400",
  success: "bg-white",
  warning: "bg-[#A8192F]",
  danger: "bg-[#C41E3A]",
  info: "bg-[#C41E3A]",
  purple: "bg-[#C41E3A]",
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
