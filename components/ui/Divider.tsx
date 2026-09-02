import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("rtg-divider", className)} {...props} />;
}

