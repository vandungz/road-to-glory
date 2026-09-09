"use client";

import { useRef } from "react";
import type { ReactNode, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rtg-tabs", className)} role="tablist">{children}</div>;
}

export function TabsTrigger({ value, active, onSelect, children, className, disabled = false }: { value: string; active: boolean; onSelect: (value: string) => void; children: ReactNode; className?: string; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(ref.current?.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    const index = tabs.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next]?.focus();
    if (tabs[next]) onSelect(tabs[next].dataset.value ?? value);
  };
  return <button ref={ref} type="button" role="tab" data-value={value} aria-selected={active} tabIndex={disabled ? -1 : active ? 0 : -1} className={cn("rtg-tab", active && "is-active", className)} onClick={() => onSelect(value)} onKeyDown={handleKeyDown} disabled={disabled}>{children}</button>;
}

export function TabsContent({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null;
  return <div role="tabpanel" className={cn("rtg-tab-panel", className)}>{children}</div>;
}
