import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "neutral" | "accent" | "positive" | "negative";
  className?: string;
}

export function Stat({ label, value, detail, tone = "neutral", className }: StatProps) {
  return (
    <div className={cn("football-stat", `football-stat--${tone}`, className)}>
      <span className="football-stat__label">{label}</span>
      <strong className="football-stat__value">{value}</strong>
      {detail && <span className="football-stat__detail">{detail}</span>}
    </div>
  );
}

export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("football-stat-group", className)}>{children}</div>;
}
