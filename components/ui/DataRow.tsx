import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataRowProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function DataRow({ label, value, className }: DataRowProps) {
  return (
    <div className={cn("football-data-row", className)}>
      <span className="football-data-row__label">{label}</span>
      <span className="football-data-row__value">{value}</span>
    </div>
  );
}
