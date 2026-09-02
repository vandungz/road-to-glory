import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PrimaryActionArea({
  children,
  note,
  className,
}: {
  children: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rtg-primary-action-area", className)}>
      {note && <p className="rtg-primary-action-area__note">{note}</p>}
      <div className="rtg-primary-action-area__actions">{children}</div>
    </div>
  );
}
