import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SurfaceLevel = "paper" | "surface" | "inverse" | "none";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  padding?: "none" | "compact" | "default";
}

export function Surface({
  level = "surface",
  padding = "none",
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "rtg-surface",
        `rtg-surface--${level}`,
        padding === "compact" && "rtg-surface--compact",
        padding === "default" && "rtg-surface--padded",
        className,
      )}
      {...props}
    />
  );
}

