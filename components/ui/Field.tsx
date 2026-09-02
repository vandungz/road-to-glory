import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("rtg-field", error && "has-error", className)}>
      <span className="rtg-field__label">{label}</span>
      {children}
      {error ? <span className="rtg-field__error">{error}</span> : hint && <span className="rtg-field__hint">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("rtg-input", className)} {...props} />;
}
