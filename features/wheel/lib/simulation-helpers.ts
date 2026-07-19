// features/wheel/lib/simulation-helpers.ts

export function calculateContinentalQualification(
  leagueId: string,
  standing: number,
  continentalCupResult?: string | null,
  currentContinentalCup?: string,
): string {
  if (!leagueId) return "none";

  // Vô địch cúp châu lục → tự động có vé mùa sau (bất kể hạng mấy)
  if (continentalCupResult === "Winner" && currentContinentalCup && currentContinentalCup !== "none") {
    // UEFA pathway: thắng UEL → UCL, thắng UECL → UEL
    if (currentContinentalCup === "UEL") return "UCL";
    if (currentContinentalCup === "UECL") return "UEL";
    return currentContinentalCup;
  }

  const id = leagueId.toUpperCase();

  // 1. Nhóm giải siêu cấp châu Âu (Top 4 leagues: Anh, Tây Ban Nha, Đức, Ý)
  if (["ENG1", "ESP1", "GER1", "ITA1"].includes(id)) {
    if (standing <= 4) return "UCL";
    if (standing <= 6) return "UEL";
    if (standing === 7) return "UECL";
  }
  
  // 2. Nhóm giải cấp 2 châu Âu (Pháp, Bồ Đào Nha, Hà Lan, Thổ Nhĩ Kỳ, Bỉ)
  if (["FRA1", "POR1", "NED1", "TUR1", "BEL1"].includes(id)) {
    if (standing <= 2) return "UCL";
    if (standing <= 4) return "UEL";
    if (standing === 5) return "UECL";
  }
  
  // 3. Nhóm giải cấp 3 châu Âu (Scotland...)
  if (["SCO1"].includes(id)) {
    if (standing === 1) return "UCL";
    if (standing === 2) return "UEL";
    if (standing === 3) return "UECL";
  }
  
  // 4. Nhóm Nam Mỹ (Brazil, Argentina)
  if (["BRA1", "ARG1"].includes(id)) {
    if (standing <= 6) return "Libertadores";
  }
  if (["COL1", "ECU1", "URU1", "CHI1"].includes(id)) {
    if (standing <= 2) return "Libertadores";
  }
  
  // 5. Nhóm Châu Á (Nhật Bản, Hàn Quốc, Saudi Arabia...)
  if (["JPN1", "KOR1", "KSA1"].includes(id)) {
    if (standing <= 3) return "AFC_CL";
  }
  if (["QAT1", "UAE1", "AUS1", "IND1", "CHN1"].includes(id)) {
    if (standing === 1) return "AFC_CL";
  }
  
  // 6. Nhóm Bắc Mỹ (Mỹ, Mexico)
  if (["USA1", "MEX1"].includes(id)) {
    if (standing <= 3) return "CONCACAF_CC";
  }

  // 7. Nhóm Châu Phi (Egypt, South Africa...)
  if (["EGY1", "RSA1"].includes(id)) {
    if (standing <= 2) return "CAF_CL";
  }

  return "none";
}

export function getContinentalCupLabel(cupType: string): string {
  switch (cupType) {
    case "UCL": return "UEFA Champions League";
    case "UEL": return "UEFA Europa League";
    case "UECL": return "UEFA Conference League";
    case "Libertadores": return "Copa Libertadores";
    case "AFC_CL": return "AFC Champions League";
    case "CONCACAF_CC": return "CONCACAF Champions Cup";
    default: return "Cúp Châu Lục CLB";
  }
}

export function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function getStandingWheelPool(
  clubPrestige: number,
  ovr: number,
  leagueSize: number,
  apps: number = 38,
  lastYearStanding?: number | null,
) {
  const targetOvr = 55 + clubPrestige * 6;
  const diff = ovr - targetOvr;
  const influenceFactor = Math.min(1.0, Math.max(0.0, apps / 55));

  const prestigeExpectedPos = Math.max(1, Math.min(leagueSize, Math.round(leagueSize - clubPrestige * (leagueSize / 5) + 1)));
  // Kéo nhẹ theo thành tích mùa trước (nếu có) để tạo quán tính giữa các mùa —
  // tránh nhảy cóc cực đoan kiểu Á quân mùa này, cầm đèn đỏ mùa sau, dù prestige
  // CLB không đổi. Chỉ áp dụng khi có dữ liệu mùa trước thật (không phải mùa debut).
  const expectedPos = lastYearStanding
    ? Math.max(1, Math.min(leagueSize, Math.round(prestigeExpectedPos * 0.7 + lastYearStanding * 0.3)))
    : prestigeExpectedPos;

  const pool = Array.from({ length: leagueSize }, (_, i) => {
    const pos = i + 1;
    const dist = Math.abs(pos - expectedPos);
    const baseWeight = Math.max(1, 40 - dist * (35 / leagueSize));

    let ovrModifier = 0;
    if (diff > 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.5 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.2 * influenceFactor;
    } else if (diff < 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.2 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.5 * influenceFactor;
    }

    const finalWeight = Math.max(1, Math.round(baseWeight + ovrModifier));
    return {
      value: pos,
      weight: finalWeight,
    };
  });

  return pool;
}

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
  switch (tier) {
    case "xuat_sac": return { yes: 80, no: 20 };
    case "tot":       return { yes: 60, no: 40 };
    case "trung_binh": return { yes: 40, no: 60 };
    case "kem":       return { yes: 5, no: 95 };
  }
}

export function getDecreaseGateWeight(tier: GrowthTier): { yes: number; no: number } {
  // Nghịch đảo cùng tier — mùa kém dễ giảm, mùa xuất sắc gần như không giảm
  switch (tier) {
    case "kem":       return { yes: 70, no: 30 };
    case "trung_binh": return { yes: 30, no: 70 };
    case "tot":       return { yes: 10, no: 90 };
    case "xuat_sac":  return { yes: 5, no: 95 };
  }
}

// Increase: domain 1-6. Decrease: domain 1-3 (giảm càng lan rộng nhiều chỉ số
// càng hiếm, và tier "kem" (mùa tệ) có xu hướng lan rộng hơn tier "xuất sắc"
// (hiếm khi giảm, nếu có cũng chỉ là 1 điểm trừ lẻ tẻ) — nghịch đảo giống cách
// getMagnitudeTierForDirection đã làm cho biên độ.
export function getCountPool(tier: GrowthTier, isIncrease: boolean): { value: number; weight: number }[] {
  if (isIncrease) {
    switch (tier) {
      case "xuat_sac":   return [{ value: 1, weight: 10 }, { value: 2, weight: 20 }, { value: 3, weight: 25 }, { value: 4, weight: 20 }, { value: 5, weight: 15 }, { value: 6, weight: 10 }];
      case "tot":        return [{ value: 1, weight: 20 }, { value: 2, weight: 28 }, { value: 3, weight: 25 }, { value: 4, weight: 15 }, { value: 5, weight: 8 }, { value: 6, weight: 4 }];
      case "trung_binh": return [{ value: 1, weight: 38 }, { value: 2, weight: 30 }, { value: 3, weight: 18 }, { value: 4, weight: 9 }, { value: 5, weight: 4 }, { value: 6, weight: 1 }];
      case "kem":        return [{ value: 1, weight: 60 }, { value: 2, weight: 24 }, { value: 3, weight: 10 }, { value: 4, weight: 4 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }];
    }
  }
  switch (tier) {
    case "kem":        return [{ value: 1, weight: 30 }, { value: 2, weight: 40 }, { value: 3, weight: 30 }];
    case "trung_binh": return [{ value: 1, weight: 45 }, { value: 2, weight: 35 }, { value: 3, weight: 20 }];
    case "tot":        return [{ value: 1, weight: 60 }, { value: 2, weight: 28 }, { value: 3, weight: 12 }];
    case "xuat_sac":   return [{ value: 1, weight: 70 }, { value: 2, weight: 22 }, { value: 3, weight: 8 }];
  }
}

// Domain 1-8 dùng chung cho mọi tier — chỉ đổi trọng số (Vấn đề F)
export function getMagnitudePool(tier: GrowthTier): { value: number; weight: number }[] {
  const weightsByTier: Record<GrowthTier, number[]> = {
    xuat_sac:   [2, 4, 6, 12, 20, 25, 20, 11],
    tot:        [6, 10, 18, 24, 22, 12, 6, 2],
    trung_binh: [25, 28, 22, 13, 7, 3, 1, 1],
    kem:        [55, 25, 12, 5, 2, 1, 1, 1],
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
  const base = getMagnitudePool(tier);
  if (growthBoost <= 0) return base;
  const boostedTier = bumpTierUp(tier);
  if (boostedTier === tier) return base;
  return blendPools(base, getMagnitudePool(boostedTier), growthBoost);
}

export function getDomesticCupName(leagueName: string): string {
  if (!leagueName) return "Cup Quốc Gia";
  const name = leagueName.toLowerCase();
  if (name.includes("premier league") || name.includes("championship")) return "FA Cup";
  if (name.includes("laliga") || name.includes("segunda")) return "Copa del Rey";
  if (name.includes("serie a") || name.includes("serie b")) {
    if (name.includes("brazil") || name.includes("brasileirão")) return "Copa do Brasil";
    return "Coppa Italia";
  }
  if (name.includes("ligue")) return "Coupe de France";
  if (name.includes("bundesliga")) return "DFB-Pokal";
  if (name.includes("portugal")) return "Taça de Portugal";
  if (name.includes("eredivisie")) return "KNVB Beker";
  if (name.includes("primera") || name.includes("argentina")) return "Copa Argentina";
  if (name.includes("saudi") || name.includes("pro league")) return "King Cup";
  if (name.includes("mls") || name.includes("major league")) return "US Open Cup";
  return "Cup Quốc Gia";
}
