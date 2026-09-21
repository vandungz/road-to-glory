import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, type = "button", children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn("football-icon-button", className)} {...props}>
      {children}
    </button>
  );
});
