import type { ReactNode } from "react";

interface ExpandableProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Expandable({ open, children, className, id }: ExpandableProps) {
  return open ? <div data-mount="detail" id={id} className={className}>{children}</div> : null;
}
