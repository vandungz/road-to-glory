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
  /** Some items only make sense in a season with a national-team tournament. */
  availability?: "all_seasons" | "national_tournament";
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
export const EXTRA_APPEARANCES_BONUS = 6;
export const NATIONAL_CALLUP_WEIGHT_BONUS = 18;
export const DEVELOPMENT_GATE_BONUS = 15;
export const DEVELOPMENT_SPECIALIST_WEIGHT_MULTIPLIER = 1.6;
export const DEVELOPMENT_HIGH_MAGNITUDE_WEIGHT_MULTIPLIER = 2.2;

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
  {
    id: "appearance_pack",
    name: "Gói Cơ Hội Ra Sân",
    description: `Tăng trực tiếp tối đa +${EXTRA_APPEARANCES_BONUS} trận ra sân trong mùa này (không vượt quá số trận của giải).`,
    group: "performance",
    priceThousands: 650,
    maxPurchasesPerSeason: 1,
  },
  {
    id: "national_callup_boost",
    name: "Hồ Sơ Tuyển Trạch ĐTQG",
    description: `Tăng +${NATIONAL_CALLUP_WEIGHT_BONUS} điểm trọng số cơ hội được gọi lên ĐTQG mùa này.`,
    group: "performance",
    priceThousands: 900,
    maxPurchasesPerSeason: 1,
    availability: "national_tournament",
  },
  {
    id: "elite_development_program",
    name: "Chương Trình Phát Triển Tinh Hoa",
    description: "Tăng cơ hội phát triển, ưu tiên chỉ số chuyên môn và tăng trọng số các biên độ +2 đến +6. Món đồ cao cấp, giá rất đắt.",
    group: "performance",
    // Balance pass 2026-08-28: the item affects three growth levers, so its price
    // must create a meaningful opportunity cost instead of being an automatic buy.
    priceThousands: 4500,
    maxPurchasesPerSeason: 1,
  },
];

/** The existing career flow exposes national-team wheels on even ages only. */
export function isNationalTournamentSeason(season: number): boolean {
  return season % 2 === 0;
}

export function isShopItemAvailableForSeason(
  item: ShopCatalogItem,
  season: number | null,
): boolean {
  if (item.availability !== "national_tournament") return true;
  return season !== null && isNationalTournamentSeason(season);
}

export function isShopItemActiveForSeason(
  inventory: ShopInventoryEntry[] | undefined | null,
  itemId: string,
  season: number,
): boolean {
  return !!inventory?.some(
    (e) => e.itemId === itemId && e.appliedSeason === season && !e.consumed,
  );
}
