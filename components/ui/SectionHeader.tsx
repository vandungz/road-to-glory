import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  label?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, label, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("rtg-section-header", className)}>
      <div>
        {label && <div className="rtg-section-header__label">{label}</div>}
        <h2 className="rtg-section-header__title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

