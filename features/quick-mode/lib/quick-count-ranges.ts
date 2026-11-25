import { resolveRandomInt, type WeightedItem } from "@/lib/wheel-engine/spin-resolver";
import type { QuickCountValue } from "../types";

export interface QuickCountRangeItem extends WeightedItem<QuickCountValue> {
  label: string;
  range: { min: number; max: number };
}

// Keep the existing bucket weights; only the final resolver draws within a bucket.
export function getQuickCountRanges(
  items: WeightedItem<QuickCountValue>[],
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): QuickCountRangeItem[] {
  let previous = minimum - 1;
  let previousWidth = 1;
  return items.flatMap((item) => {
    const openEnded = item.value === "1000+";
    // The open bucket spans one more bucket width, rather than an unbounded draw.
    const end = item.value === "1000+" ? previous + previousWidth : item.value;
    const min = Math.max(minimum, previous + 1);
    const max = Math.min(maximum, end);
    previousWidth = Math.max(1, end - previous);
    previous = end;
    if (min > max) return [];
    return [{ ...item, range: { min, max }, label: openEnded ? "1000+" : min === max ? String(min) : `${min}–${max}` }];
  });
}

export function resolveQuickCountRange(
  range: QuickCountRangeItem["range"],
  draw: typeof resolveRandomInt = resolveRandomInt,
): number {
  return draw(range.min, range.max);
}
