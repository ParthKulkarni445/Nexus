"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  bodyClassName?: string;
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
  bodyClassName,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-120 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:py-8">
        {/* Dialog */}
        <div
          className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${sizeMap[size]} animate-fade-in flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100dvh-4rem)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          {/* Body */}
          <div
            className={`flex-1 overflow-y-auto px-6 py-5 ${bodyClassName ?? ""}`}
          >
            {children}
          </div>
          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
