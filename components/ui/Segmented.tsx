import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> { value: T; label: ReactNode; disabled?: boolean }

export function Segmented<T extends string>({ options, value, onChange, className }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <div className={cn("football-segmented", className)} role="radiogroup">
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={value === option.value} disabled={option.disabled} className={cn(value === option.value && "is-active")} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}
