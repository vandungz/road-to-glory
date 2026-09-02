import { cn } from "@/lib/utils";

export function LineChart({ values, labels, className, label = "Biểu đồ tiến trình" }: { values: number[]; labels?: string[]; className?: string; label?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => `${values.length === 1 ? 50 : (index / (values.length - 1)) * 100},${100 - ((value - min) / range) * 86 - 7}`).join(" ");
  return (
    <div className={cn("rtg-line-chart", className)} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /></svg>
      {labels && <div className="rtg-line-chart__labels">{labels.map((item) => <span key={item}>{item}</span>)}</div>}
    </div>
  );
}
