"use client";

import { useId, type ReactNode } from "react";

export function Tooltip({ label, children, focusable = false }: { label: string; children: ReactNode; focusable?: boolean }) {
  const id = useId();
  return <span className="football-tooltip" tabIndex={focusable ? 0 : undefined} aria-describedby={focusable ? id : undefined}>
    {children}<span id={id} role="tooltip" className="football-tooltip__bubble">{label}</span>
  </span>;
}
