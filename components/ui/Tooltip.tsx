"use client";

import { useId, type ReactNode } from "react";

export function Tooltip({ label, children, focusable = false, descriptionId }: { label: string; children: ReactNode; focusable?: boolean; descriptionId?: string }) {
  const generatedId = useId();
  const id = descriptionId ?? generatedId;
  return <span className="football-tooltip" tabIndex={focusable ? 0 : undefined} aria-describedby={focusable ? id : undefined}>
    {children}<span id={id} role="tooltip" className="football-tooltip__bubble">{label}</span>
  </span>;
}
