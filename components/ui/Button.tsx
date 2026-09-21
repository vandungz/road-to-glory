import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "football-button",
        `football-button--${variant}`,
        size !== "md" && `football-button--${size}`,
        fullWidth && "football-button--full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 aria-hidden="true" className="animate-spin" size={16} />}
      {children}
    </button>
  );
});
