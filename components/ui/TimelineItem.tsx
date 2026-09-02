import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TimelineItem({
  eyebrow,
  title,
  children,
  active = false,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("rtg-timeline-item", active && "is-active", className)}>
      <span className="rtg-timeline-item__marker" aria-hidden="true" />
      <div>
        {eyebrow && <span className="rtg-timeline-item__eyebrow">{eyebrow}</span>}
        <h3 className="rtg-timeline-item__title">{title}</h3>
        {children && <div className="rtg-timeline-item__body">{children}</div>}
      </div>
    </article>
  );
}
