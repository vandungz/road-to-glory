import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataRowProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function DataRow({ label, value, className }: DataRowProps) {
  return (
    <div className={cn("rtg-data-row", className)}>
      <span className="rtg-data-row__label">{label}</span>
      <span className="rtg-data-row__value">{value}</span>
    </div>
  );
}

