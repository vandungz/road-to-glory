"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Drawer({ open, title, onClose, children, className }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="rtg-drawer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={cn("rtg-drawer", className)} role="dialog" aria-modal="true" aria-label={title}>
        <header className="rtg-modal-header"><h2 className="rtg-modal-header__title">{title}</h2><button type="button" className="rtg-icon-button" onClick={onClose} aria-label="Đóng">×</button></header>
        <div className="rtg-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
