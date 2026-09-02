import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
  label?: string;
}

export function ProgressIndicator({ current, total, labels, className, label }: ProgressIndicatorProps) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal);
  return (
    <div className={cn("rtg-progress", className)} aria-label={label ?? `Tiến trình ${safeCurrent} trên ${safeTotal}`}>
      {labels && <div className="rtg-progress__labels">{labels.map((item) => <span key={item}>{item}</span>)}</div>}
      <div className="rtg-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={safeTotal} aria-valuenow={safeCurrent}>
        {Array.from({ length: safeTotal }, (_, index) => (
          <span key={index} className={cn(index < safeCurrent && "is-complete", index === safeCurrent - 1 && "is-active")} />
        ))}
      </div>
    </div>
  );
}
