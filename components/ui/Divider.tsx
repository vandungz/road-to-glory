import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("football-divider", className)} {...props} />;
}
