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
    <article className={cn("football-timeline-item", active && "is-active", className)}>
      <span className="football-timeline-item__marker" aria-hidden="true" />
      <div>
        {eyebrow && <span className="football-timeline-item__eyebrow">{eyebrow}</span>}
        <h3 className="football-timeline-item__title">{title}</h3>
        {children && <div className="football-timeline-item__body">{children}</div>}
      </div>
    </article>
  );
}
