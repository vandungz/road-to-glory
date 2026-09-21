// ============================================================
// GROWTH TIER — khung tier rating duy nhất dùng chung cho gate
// tăng/giảm, count, và magnitude (thay vì mỗi wheel tự định nghĩa
// ngưỡng riêng, xem docs/core-growth-logic-review.md Vấn đề D.3)
// ============================================================

export type GrowthTier = "xuat_sac" | "tot" | "trung_binh" | "kem";

export function getGrowthTier(rating: number): GrowthTier {
  if (rating >= 7.50) return "xuat_sac";
  if (rating >= 7.00) return "tot";
  if (rating >= 6.50) return "trung_binh";
  return "kem";
}

export function getIncreaseGateWeight(tier: GrowthTier): { yes: number; no: number } {
  // Legacy table — increase path uses Development Score (§4.4) in growth-balance.ts.
  // Kept for reference / any non-career callers; do not wire back into dir_increase.
  switch (tier) {
    case "xuat_sac": return { yes: 70, no: 30 };
    case "tot":       return { yes: 50, no: 50 };
    case "trung_binh": return { yes: 32, no: 68 };
    case "kem":       return { yes: 8, no: 92 };
  }
}

export function getDecreaseGateWeight(tier: GrowthTier): { yes: number; no: number } {
  switch (tier) {
    case "kem":       return { yes: 65, no: 35 };
    case "trung_binh": return { yes: 35, no: 65 };
    case "tot":       return { yes: 18, no: 82 };
    case "xuat_sac":  return { yes: 8, no: 92 };
  }
}

// SoT §4.2 — narrow normal growth; count 3+ is a standout season
export function getCountPool(tier: GrowthTier, isIncrease: boolean): { value: number; weight: number }[] {
  if (isIncrease) {
    switch (tier) {
      case "xuat_sac":   return [{ value: 1, weight: 28 }, { value: 2, weight: 32 }, { value: 3, weight: 22 }, { value: 4, weight: 12 }, { value: 5, weight: 4 }, { value: 6, weight: 2 }];
      case "tot":        return [{ value: 1, weight: 40 }, { value: 2, weight: 35 }, { value: 3, weight: 18 }, { value: 4, weight: 5 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }];
      case "trung_binh": return [{ value: 1, weight: 55 }, { value: 2, weight: 32 }, { value: 3, weight: 10 }, { value: 4, weight: 2 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }];
      case "kem":        return [{ value: 1, weight: 70 }, { value: 2, weight: 25 }, { value: 3, weight: 4 }, { value: 4, weight: 1 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }];
    }
  }
  // Gentle Decline (SoT §4.2 updated 2026-08-03): 50% weight on 1 stat decrease
  switch (tier) {
    case "kem":        return [{ value: 1, weight: 50 }, { value: 2, weight: 35 }, { value: 3, weight: 15 }];
    case "trung_binh": return [{ value: 1, weight: 65 }, { value: 2, weight: 25 }, { value: 3, weight: 10 }];
    case "tot":        return [{ value: 1, weight: 75 }, { value: 2, weight: 20 }, { value: 3, weight: 5 }];
    case "xuat_sac":   return [{ value: 1, weight: 85 }, { value: 2, weight: 12 }, { value: 3, weight: 3 }];
  }
}

// SoT §4.3 & §4.4.8 — increase domain 1–6 (80–85% weight mass on 1–2 for normal seasons); decrease domain 1–3
export function getMagnitudePool(
  tier: GrowthTier,
  isIncrease = true,
): { value: number; weight: number }[] {
  if (!isIncrease) {
    const decreaseByTier: Record<GrowthTier, number[]> = {
      // Gentle Decline (SoT §4.3 updated 2026-08-03): xuat_sac = harshest decrease, but mostly -1/-2 pts
      // Updated 2026-08-07 (2nd nudge): shift weight 3 → weight 1 (all tiers, uniform across ages) — slightly
      // gentler tail. kem's weight-3 already at floor 1 from the 1st nudge — left as-is to avoid hitting 0
      // (a 0 weight makes that magnitude value literally unreachable, not just rarer).
      xuat_sac:   [52, 35, 13],
      tot:        [67, 25, 8],
      trung_binh: [82, 15, 3],
      kem:        [91, 8, 1],
    };
    return decreaseByTier[tier].map((weight, i) => ({ value: i + 1, weight }));
  }
  const weightsByTier: Record<GrowthTier, number[]> = {
    // Updated 2026-08-07 (2nd nudge): shift weight 1 → weight 2 (all tiers, uniform across ages) — slightly
    // bigger swings
    xuat_sac:   [9, 41, 30, 15, 5, 0], // Reward standout seasons with higher +3/+4 chance (SoT §4.3)
    tot:        [34, 48, 12, 4, 1, 1],
    trung_binh: [49, 41, 7, 2, 1, 0],
    kem:        [59, 32, 7, 1, 1, 0],
  };
  return weightsByTier[tier].map((weight, i) => ({ value: i + 1, weight }));
}

const TIER_ORDER: GrowthTier[] = ["kem", "trung_binh", "tot", "xuat_sac"];

// Với hướng "decrease", mức độ nghiêm trọng đi NGƯỢC tier rating: rating càng thấp
// (tier "kem") → biên độ giảm càng lớn (dùng pool "xuat_sac"), rating càng cao
// (tier "xuat_sac", hiếm khi vẫn bị giảm) → biên độ giảm nhỏ nhất (dùng pool "kem").
export function getMagnitudeTierForDirection(rating: number, isIncrease: boolean): GrowthTier {
  const tier = getGrowthTier(rating);
  if (isIncrease) return tier;
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[TIER_ORDER.length - 1 - idx];
}

// ============================================================
// CAREER PROGRESS — tuổi "trẻ/già" tính theo % sự nghiệp CỦA RIÊNG
// cầu thủ đó (dựa trên debutAge + careerLength đã roll), không phải
// mốc tuổi tuyệt đối. Không có chấn thương trong game này, nên "già"
// phải là "gần hết sự nghiệp" chứ không phải 1 con số cố định cho
// mọi người — ai roll careerLength dài hơn thì già muộn hơn.
// ============================================================

// progress = 0 lúc debut, = 1 lúc giải nghệ
export function getCareerProgress(currentAge: number, debutAge: number, careerLength: number): number {
  if (careerLength <= 0) return 1;
  return Math.min(1, Math.max(0, (currentAge - debutAge) / careerLength));
}

// Nhóm tuổi nghề theo vị trí (Vấn đề D.5), tính bằng % tiến trình sự nghiệp —
// GK bền nhất (chỉ già ở 8% cuối), winger/ST ngắn nhất (già từ 15% cuối)
export function getAgeProgressThresholds(position: string): { young: number; old: number } {
  if (position === "GK") return { young: 0.12, old: 0.92 };
  if (["CB", "CDM", "CM"].includes(position)) return { young: 0.15, old: 0.90 };
  if (["LB", "RB", "CAM"].includes(position)) return { young: 0.18, old: 0.87 };
  return { young: 0.20, old: 0.85 }; // LW, RW, LM, RM, ST
}

// ============================================================
// DUAL-CLOCK MODEL (SoT core-growth-loop-fixes-design.md §1) — "trẻ" không nên phụ
// thuộc % của careerLength (1 số random tại debut mà chính player chưa biết trước lúc
// còn trẻ — nhân quả đảo ngược). Đồng hồ 1 (KINH NGHIỆM, dùng cho "young") = số mùa
// TUYỆT ĐỐI đã chơi kể từ debut, không phụ thuộc careerLength riêng của player. Đồng hồ 2
// (SINH HỌC + ĐỘ BỀN, dùng cho "old") GIỮ %-của-chính-mình (proxy hợp lý cho gen/độ bền
// khác nhau giữa các player) NHƯNG cộng thêm 1 trần tuổi tuyệt đối để career cực dài
// không khiến 1 player "mãi trẻ".
// ============================================================

const REFERENCE_CAREER_LENGTH = 16; // DRAFT — trung vị bell curve của Career Length Wheel

// Quy đổi 1 LẦN, DUY NHẤT từ bảng % young đã có (không phụ thuộc player) → số năm tuyệt đối.
export function getYoungYears(position: string): number {
  const { young } = getAgeProgressThresholds(position);
  return Math.max(1, Math.round(young * REFERENCE_CAREER_LENGTH));
}

export function getAbsoluteOldAge(position: string): number {
  if (position === "GK") return 38;
  if (["CB", "CDM", "CM"].includes(position)) return 36;
  if (["LB", "RB", "CAM"].includes(position)) return 35;
  return 34; // LW, RW, LM, RM, ST
}

export function getGrowthBoostYears(yearsInCareer: number, youngYears: number): number {
  if (yearsInCareer >= youngYears || youngYears <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - yearsInCareer / youngYears));
}

export function isYoungByYears(currentAge: number, debutAge: number, position: string): boolean {
  return currentAge - debutAge < getYoungYears(position);
}

export function isOldDualClock(
  currentAge: number,
  debutAge: number,
  careerLength: number,
  position: string,
): boolean {
  const { old } = getAgeProgressThresholds(position);
  const isOldByOwnCareer = getCareerProgress(currentAge, debutAge, careerLength) >= old;
  // Sàn 1 mùa trước khi trần tuyệt đối có thể áp — tránh 1 player debut muộn (vd 33 tuổi)
  // bị coi "old" ngay mùa đầu tiên chỉ vì trần tuổi, trong khi %-của-chính-mình vẫn áp
  // bình thường không qua sàn này.
  const isOldByAbsoluteAge = currentAge - debutAge >= 1 && currentAge >= getAbsoluteOldAge(position);
  return isOldByOwnCareer || isOldByAbsoluteAge;
}

// ============================================================
// GROWTH BOOST — thay cho "wonderkid tier" rời rạc: 1 hệ số liên tục
// dùng CHÍNH khoảng "Trẻ" ở trên, cao nhất (1.0) ngay lúc debut, giảm
// dần về 0 khi ra khỏi khoảng Trẻ. Áp dụng bằng cách BLEND (trộn theo
// tỉ lệ) pool count/magnitude hiện tại với pool của tier cao hơn 1 bậc
// — hoàn toàn xác định (deterministic) theo (rating, careerProgress),
// KHÔNG random riêng, để useCareerWheelItems.ts (preview UI) và
// career-wheel-resolver.ts (resolve thật) luôn tính ra đúng 1 pool
// giống hệt nhau trước khi resolveWeightedOutcome() quay.
// ============================================================

export function getGrowthBoost(progress: number, youngThreshold: number): number {
  if (progress >= youngThreshold || youngThreshold <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - progress / youngThreshold));
}

function bumpTierUp(tier: GrowthTier): GrowthTier {
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[Math.min(TIER_ORDER.length - 1, idx + 1)];
}

function blendPools(
  poolA: { value: number; weight: number }[],
  poolB: { value: number; weight: number }[],
  t: number,
): { value: number; weight: number }[] {
  return poolA.map((item, i) => ({
    value: item.value,
    weight: item.weight * (1 - t) + poolB[i].weight * t,
  }));
}

// Count/Magnitude có growth boost — chỉ nên dùng cho hướng "increase";
// hướng "decrease" luôn dùng getCountPool/getMagnitudePool gốc, không boost.
export function getCountPoolBoosted(tier: GrowthTier, growthBoost: number): { value: number; weight: number }[] {
  const base = getCountPool(tier, true);
  if (growthBoost <= 0) return base;
  const boostedTier = bumpTierUp(tier);
  if (boostedTier === tier) return base;
  return blendPools(base, getCountPool(boostedTier, true), growthBoost);
}

export function getMagnitudePoolBoosted(tier: GrowthTier, growthBoost: number): { value: number; weight: number }[] {
  const base = getMagnitudePool(tier, true);
  if (growthBoost <= 0) return base;
  const boostedTier = bumpTierUp(tier);
  if (boostedTier === tier) return base;
  return blendPools(base, getMagnitudePool(boostedTier, true), growthBoost);
}


