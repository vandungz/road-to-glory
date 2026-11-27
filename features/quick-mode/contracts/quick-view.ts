import type { WeightedItem } from "@/lib/wheel-engine/spin-resolver";
import type { QuickCountRangeItem } from "../lib/quick-count-ranges";
import type { QuickModeState, QuickStats, QuickStatKey } from "../types";
export type QuickWheelItem = WeightedItem<unknown> & {
    active?: boolean;
    label?: string;
    range?: QuickCountRangeItem["range"];
};
export interface ActiveWheel {
    key: string;
    items: QuickWheelItem[];
    spinItems?: WeightedItem<unknown>[];
}
export interface QuickModeView {
    state: QuickModeState;
    activeWheel: ActiveWheel | null;
    stats: QuickStats;
    overall: number;
    statKeys: readonly QuickStatKey[];
}
