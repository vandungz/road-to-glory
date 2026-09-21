import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResultBanner({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "positive" | "honour" | "negative"; className?: string }) {
  return <div className={cn("football-result-banner", `football-result-banner--${tone}`, className)} role="status">{children}</div>;
}
