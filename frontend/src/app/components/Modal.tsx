"use client";
import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

