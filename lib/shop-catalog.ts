/**
 * Shop catalog — Wave 2 of docs/core-currency-shop-design.md §6.
 * Pure TypeScript — no React/Prisma.
 *
 * Only items with a fully-wired gameplay effect are listed here. Second Chance Token,
 * Sports Psychologist, Agent Đàm Phán, Mở Rộng Shortlist, and PR Campaign stay documented
 * in the SoT only — not sold yet. Cosmetics dropped (Updated 2026-08-09) — unnecessary.
 *
 * Design principle (Updated 2026-08-09): every item here must fit "buy at the start of a
 * season, it buffs that season" with no conditional exceptions — Adaptation Kit violated
 * this (only worked if it happened to be your first season at a new club) and was removed.
 */

export type ShopItemGroup = "performance";

export interface ShopCatalogItem {
  id: string;
  name: string;
  description: string;
  group: ShopItemGroup;
  /** € thousands — DRAFT, tune later without touching callers. */
  priceThousands: number;
  maxPurchasesPerSeason: 1;
}

export interface ShopInventoryEntry {
  itemId: string;
  purchasedAtAge: number;
  /** purchasedAtAge + 1 — the season the effect targets. */
  appliedSeason: number;
  /** Flipped true by updateSeasonProgressAction once that season's checkpoint runs. */
  consumed: boolean;
}

// core-growth-loop-fixes-design.md §5.2 (Updated 2026-08-09) — tuned up from 0.8 so the
// effect is actually perceptible against natural roll noise; price raised to match.
export const FITNESS_COACH_SEVERITY_MULTIPLIER = 0.55;
// Flat bonus added to calcRating's base for every competition in the target season
// (Updated 2026-08-09) — DRAFT.
export const TRAINING_CAMP_RATING_BONUS = 0.4;

export const SHOP_CATALOG: ShopCatalogItem[] = [
  {
    id: "fitness_coach",
    name: "Huấn Luyện Viên Thể Lực",
    description: "Giảm 45% mức độ nghiêm trọng của nguy cơ giảm điểm mùa tới.",
    group: "performance",
    priceThousands: 950,
    maxPurchasesPerSeason: 1,
  },
  {
    id: "training_camp",
    name: "Trại Tập Luyện Chuyên Sâu",
    description: "Tăng thẳng +0.4 phong độ (match rating) ở mọi giải đấu trong mùa này.",
    group: "performance",
    priceThousands: 1400,
    maxPurchasesPerSeason: 1,
  },
];

export function isShopItemActiveForSeason(
  inventory: ShopInventoryEntry[] | undefined | null,
  itemId: string,
  season: number,
): boolean {
  return !!inventory?.some(
    (e) => e.itemId === itemId && e.appliedSeason === season && !e.consumed,
  );
}
