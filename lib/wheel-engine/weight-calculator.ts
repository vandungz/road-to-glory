import type { WeightedItem } from "./spin-resolver";

// ============================================================
// STAT KEY DEFINITIONS
// ============================================================

export const FIELD_STAT_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"] as const;
export const GK_STAT_KEYS    = ["div", "han", "kic", "ref", "spd", "pos"] as const;

export type FieldStatKey = (typeof FIELD_STAT_KEYS)[number];
export type GKStatKey    = (typeof GK_STAT_KEYS)[number];

export function getStatKeys(position: string): readonly string[] {
  return position === "GK" ? GK_STAT_KEYS : FIELD_STAT_KEYS;
}

// 3 main-stat chính xác theo từng vị trí cụ thể (nguồn: trọng số trong
// calculateOvrByPosition) — dùng cho selector weight khi tăng/giảm chỉ số.
const MAIN_STATS_BY_POSITION: Record<string, readonly string[]> = {
  GK: ["ref", "div", "han"],
  CB: ["def", "phy", "pac"],
  LB: ["pac", "def", "pas"],
  RB: ["pac", "def", "pas"],
  CDM: ["def", "phy", "pas"],
  CM: ["pas", "dri", "phy"],
  CAM: ["pas", "dri", "sho"],
  LW: ["pac", "dri", "sho"],
  RW: ["pac", "dri", "sho"],
  LM: ["dri", "pac", "pas"],
  RM: ["dri", "pac", "pas"],
  ST: ["sho", "pac", "dri"],
};

export function getMainStatsByPosition(position: string): readonly string[] {
  return MAIN_STATS_BY_POSITION[position] ?? [];
}

const GK_STAT_LABELS: Record<GKStatKey, string> = {
  div: "Diving (DIV)",
  han: "Handling (HAN)",
  kic: "Kicking (KIC)",
  ref: "Reflexes (REF)",
  spd: "Speed (SPD)",
  pos: "Positioning (POS)",
};

const FIELD_STAT_LABELS: Record<FieldStatKey, string> = {
  pac: "Pace (PAC)",
  sho: "Shooting (SHO)",
  pas: "Passing (PAS)",
  dri: "Dribbling (DRI)",
  def: "Defending (DEF)",
  phy: "Physical (PHY)",
};

export function getStatLabel(position: string, key: string): string {
  if (position === "GK") return GK_STAT_LABELS[key as GKStatKey] ?? key.toUpperCase();
  return FIELD_STAT_LABELS[key as FieldStatKey] ?? key.toUpperCase();
}

export function getDefaultStats(position: string): Record<string, number> {
  return position === "GK"
    ? { div: 60, han: 60, kic: 60, ref: 60, spd: 60, pos: 60 }
    : { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 };
}

// ============================================================
// WEIGHT CONFIGURATIONS (PURE DETERMINISTIC LOGIC)
// ============================================================

// 1. Quốc tịch
export const NATIONALITY_POOL: WeightedItem<string>[] = [
  // Top lớn
  { value: "England", weight: 15 },
  { value: "France", weight: 12 },
  { value: "Spain", weight: 12 },
  { value: "Germany", weight: 10 },
  { value: "Italy", weight: 10 },
  { value: "Brazil", weight: 10 },
  { value: "Argentina", weight: 10 },
  { value: "Portugal", weight: 8 },
  { value: "Netherlands", weight: 8 },
  
  // Các quốc gia khác
  { value: "Norway", weight: 6 },
  { value: "Turkey", weight: 6 },
  { value: "Morocco", weight: 6 },
  { value: "Tunisia", weight: 5 },
  { value: "Senegal", weight: 6 },
  { value: "Mexico", weight: 5 },
  { value: "Ivory Coast", weight: 6 },
  { value: "Algeria", weight: 5 },
  { value: "Panama", weight: 4 },
  { value: "Ghana", weight: 5 },
  { value: "Canada", weight: 5 },
  { value: "Croatia", weight: 6 },
  { value: "Iran", weight: 5 },
  { value: "Ecuador", weight: 5 },
  { value: "Bosnia and Herzegovina", weight: 4 },
  { value: "Qatar", weight: 4 },
  { value: "Paraguay", weight: 5 },
  { value: "Haiti", weight: 4 },
  { value: "Czech Republic", weight: 5 },
  { value: "Saudi Arabia", weight: 5 },
  { value: "Switzerland", weight: 5 },
  { value: "USA", weight: 5 },
  { value: "South Africa", weight: 4 },
  { value: "Cape Verde", weight: 4 },
];

// 2. Tuổi ra mắt (Debut Age)
export const DEBUT_AGE_POOL: WeightedItem<number>[] = [
  { value: 15, weight: 4 }, // thần đồng ra mắt cực sớm, rất hiếm
  { value: 16, weight: 10 },
  { value: 17, weight: 25 },
  { value: 18, weight: 30 },
  { value: 19, weight: 20 },
  { value: 20, weight: 10 },
  { value: 21, weight: 5 },
];

// 3. Emergency fallback pool — KHÔNG phải pool debut OVR thật.
// Debut OVR luôn được TÍNH từ 6 chỉ số core qua calculateOvrByPosition(), không
// bao giờ random trực tiếp từ đây. Pool này chỉ được getDebutStatWeights() dùng
// làm fallback nếu gặp 1 vị trí lạ không khớp case nào — với danh sách vị trí hợp
// lệ hiện tại (kể cả LM/RM), nhánh này không bao giờ được kích hoạt trong thực tế.
export const DEBUT_OVR_POOL: WeightedItem<number>[] = [
  { value: 60, weight: 5 },
  { value: 62, weight: 8 },
  { value: 65, weight: 15 },
  { value: 67, weight: 20 },
  { value: 69, weight: 20 },
  { value: 71, weight: 15 },
  { value: 73, weight: 10 },
  { value: 75, weight: 5 },
  { value: 78, weight: 2 },
];

// 4. Career Length (Số năm thi đấu)
export const CAREER_LENGTH_POOL: WeightedItem<number>[] = [
  { value: 12, weight: 5 },
  { value: 13, weight: 8 },
  { value: 14, weight: 12 },
  { value: 15, weight: 20 },
  { value: 16, weight: 25 },
  { value: 17, weight: 15 },
  { value: 18, weight: 10 },
  { value: 19, weight: 3 },
  { value: 20, weight: 2 },
];

// 5. Tính trọng số Leagues dựa trên prestiges/tiếng tăm — ưu tiên (không tuyệt
// đối) giải đấu ở đúng quốc gia cầu thủ sinh ra, vd cầu thủ Anh có xu hướng debut
// ở Premier League/Championship nhiều hơn, cầu thủ Pháp ở Ligue 1/2 nhiều hơn...
export function getLeagueWeights(
  leagues: { id: string; name: string; country?: string }[],
  nationality?: string | null
): WeightedItem<{ id: string; name: string }>[] {
  return leagues.map((league) => {
    // Ưu tiên Top 5 giải đấu nổi tiếng
    let weight = 10;
    const name = league.name.toLowerCase();
    if (name.includes("premier league") || name.includes("la liga") || name.includes("serie a") || name.includes("bundesliga") || name.includes("ligue 1")) {
      weight = 40;
    } else if (name.includes("championship") || name.includes("primeira liga") || name.includes("eredivisie")) {
      weight = 20;
    }
    // Ưu tiên quê nhà — nhân hệ số, không ghi đè, để vẫn có cơ hội ra nước ngoài
    if (nationality && league.country === nationality) {
      weight *= 2.5;
    }
    return {
      value: { id: league.id, name: league.name },
      weight,
    };
  });
}

// 6. Tính trọng số Clubs trong 1 League
export function getClubWeights(clubs: { id: string; name: string }[]): WeightedItem<{ id: string; name: string }>[] {
  // CLB trong cùng league lấy đều nhau
  return clubs.map((club) => ({
    value: { id: club.id, name: club.name },
    weight: 10,
  }));
}

function generateContinuousWeights(min: number, max: number): WeightedItem<number>[] {
  const items: WeightedItem<number>[] = [];
  const mean = (min + max) / 2;
  const stdDev = Math.max(1, (max - min) / 4);

  for (let val = min; val <= max; val++) {
    const exponent = -Math.pow(val - mean, 2) / (2 * Math.pow(stdDev, 2));
    const weight = Math.max(1, Math.round(100 * Math.exp(exponent)));
    items.push({ value: val, weight });
  }
  return items;
}

// 7. Sinh phân phối chỉ số core lúc debut theo vị trí thi đấu thực tế
export function getDebutStatWeights(position: string, statName: string): WeightedItem<number>[] {
  const stat = statName.toLowerCase();

  // ── GK (Thủ môn) — dùng bộ stats riêng: div/han/kic/ref/spd/pos ──
  if (position === "GK") {
    switch (stat) {
      case "ref": return generateContinuousWeights(65, 82); // Reflexes — quan trọng nhất
      case "div": return generateContinuousWeights(62, 80); // Diving
      case "han": return generateContinuousWeights(60, 78); // Handling
      case "pos": return generateContinuousWeights(60, 78); // Positioning
      case "kic": return generateContinuousWeights(45, 68); // Kicking — trung bình
      case "spd": return generateContinuousWeights(40, 65); // Speed — thấp hơn field
      default:    return generateContinuousWeights(55, 72);
    }
  }

  // ── TIỀN ĐẠO (ST, LW, RW) ──
  if (position === "ST" || position === "LW" || position === "RW") {
    if (stat === "pac" || stat === "sho" || stat === "dri") {
      return generateContinuousWeights(65, 80);
    } else if (stat === "def") {
      return generateContinuousWeights(20, 35);
    } else {
      return generateContinuousWeights(55, 70);
    }
  }

  // ── HẬU VỆ (CB, LB, RB) ──
  if (position === "CB" || position === "LB" || position === "RB") {
    if (stat === "def" || stat === "phy") {
      return generateContinuousWeights(65, 80);
    } else if (stat === "sho") {
      return generateContinuousWeights(20, 40);
    } else {
      const isWingBack = position === "LB" || position === "RB";
      if (stat === "pac" && isWingBack) {
        return generateContinuousWeights(65, 80);
      }
      if (stat === "pac" && position === "CB") {
        return generateContinuousWeights(45, 60);
      }
      return generateContinuousWeights(50, 65);
    }
  }

  // ── TIỀN VỆ (CDM, CM, CAM) ──
  if (position === "CDM" || position === "CM" || position === "CAM") {
    if (stat === "pas" || stat === "dri") {
      return generateContinuousWeights(65, 80);
    } else if (stat === "def") {
      if (position === "CDM") {
        return generateContinuousWeights(65, 80);
      } else if (position === "CAM") {
        return generateContinuousWeights(30, 50);
      } else {
        return generateContinuousWeights(50, 65);
      }
    } else if (stat === "sho") {
      if (position === "CAM") {
        return generateContinuousWeights(62, 78);
      } else if (position === "CDM") {
        return generateContinuousWeights(35, 55);
      } else {
        return generateContinuousWeights(50, 70);
      }
    } else {
      return generateContinuousWeights(58, 73);
    }
  }

  // ── TIỀN VỆ CÁNH (LM, RM) ──
  if (position === "LM" || position === "RM") {
    if (stat === "pac" || stat === "dri") {
      return generateContinuousWeights(60, 78);
    } else if (stat === "pas") {
      return generateContinuousWeights(55, 72);
    } else if (stat === "def") {
      return generateContinuousWeights(35, 55);
    } else {
      return generateContinuousWeights(50, 65);
    }
  }

  return DEBUT_OVR_POOL;
}

// 8. Định nghĩa phân loại ĐTQG theo Tiers
export function getNationalTier(nationality: string): number {
  const tier1 = ["England", "France", "Spain", "Germany", "Italy", "Brazil", "Argentina"];
  const tier2 = ["Portugal", "Netherlands", "Croatia", "Morocco", "Senegal", "Ivory Coast", "USA", "Mexico", "Colombia", "Uruguay", "Japan", "South Korea"];
  
  if (tier1.includes(nationality)) return 1;
  if (tier2.includes(nationality)) return 2;
  return 3; // Tier 3 cho các nước còn lại
}

// 9. Định nghĩa cúp lục địa ĐTQG tương thích
export function getNationalContinentalCup(nationality: string): string {
  const uefa = [
    "England", "France", "Spain", "Germany", "Italy", "Portugal", "Netherlands", "Croatia", "Belgium", 
    "Sweden", "Poland", "Denmark", "Austria", "Switzerland", "Norway", "Turkey", "Ukraine", "Scotland", 
    "Ireland", "Wales", "Greece", "Czech Republic", "Slovakia", "Hungary", "Romania", "Finland", 
    "Iceland", "Serbia", "Bosnia and Herzegovina", "Slovenia", "Georgia", "Albania"
  ];
  const conmebol = ["Brazil", "Argentina", "Uruguay", "Colombia", "Chile", "Ecuador", "Paraguay", "Peru", "Venezuela", "Bolivia"];
  const afc = [
    "Japan", "South Korea", "Saudi Arabia", "Australia", "Iran", "Iraq", "Qatar", "UAE", "Uzbekistan", 
    "Jordan", "Syria", "Oman", "China", "Vietnam", "Thailand", "Indonesia", "Malaysia", "India", "Lebanon"
  ];
  const concacaf = ["USA", "Mexico", "Canada", "Costa Rica", "Panama", "Jamaica", "Honduras", "Haiti", "El Salvador", "Curaçao", "Trinidad and Tobago"];
  const caf = [
    "Morocco", "Senegal", "Ivory Coast", "Egypt", "Nigeria", "Cameroon", "Algeria", "Tunisia", "Ghana", 
    "Mali", "South Africa", "DR Congo", "Angola", "Burkina Faso", "Guinea", "Cape Verde", "Equatorial Guinea", 
    "Zambia", "Kenya", "Gabon", "Togo"
  ];

  if (uefa.includes(nationality)) return "UEFA Euro";
  if (conmebol.includes(nationality)) return "Copa América";
  if (afc.includes(nationality)) return "AFC Asian Cup";
  if (concacaf.includes(nationality)) return "CONCACAF Gold Cup";
  if (caf.includes(nationality)) return "CAF Africa Cup of Nations";
  return "Continental Cup";
}

// 10. Tính toán OVR theo trọng số vị trí thi đấu thực tế (Weighted OVR)
export function calculateOvrByPosition(position: string, stats: Record<string, number>): number {
  let ovr = 0;

  switch (position) {
    case "GK": {
      const { ref = 60, div = 60, han = 60, pos: gkPos = 60, kic = 60, spd = 60 } = stats;
      ovr = ref * 0.25 + div * 0.25 + han * 0.20 + gkPos * 0.15 + kic * 0.10 + spd * 0.05;
      break;
    }
    default: {
      const { pac = 60, sho = 60, pas = 60, dri = 60, def = 60, phy = 60 } = stats;
      switch (position) {
        case "CB":
          ovr = def * 0.40 + phy * 0.30 + pac * 0.20 + pas * 0.10;
          break;
        case "LB":
        case "RB":
          ovr = pac * 0.30 + def * 0.30 + pas * 0.20 + dri * 0.10 + phy * 0.10;
          break;
        case "CDM":
          ovr = def * 0.35 + phy * 0.30 + pas * 0.20 + dri * 0.10 + pac * 0.05;
          break;
        case "CM":
          ovr = pas * 0.30 + dri * 0.25 + phy * 0.20 + def * 0.15 + sho * 0.10;
          break;
        case "CAM":
          ovr = pas * 0.35 + dri * 0.30 + sho * 0.25 + pac * 0.10;
          break;
        case "LW":
        case "RW":
          ovr = pac * 0.35 + dri * 0.30 + sho * 0.20 + pas * 0.15;
          break;
        case "LM":
        case "RM":
          ovr = dri * 0.30 + pac * 0.30 + pas * 0.25 + def * 0.10 + phy * 0.05;
          break;
        case "ST":
          ovr = sho * 0.40 + pac * 0.25 + dri * 0.20 + phy * 0.10 + pas * 0.05;
          break;
        default:
          ovr = (pac + sho + pas + dri + def + phy) / 6;
      }
    }
  }

  return Math.round(ovr);
}

// ============================================================
// HEIGHT / WEIGHT WHEEL — ảnh hưởng debut stats theo thể hình
// ============================================================

// 11. Dải chiều cao (cm) theo vị trí — dùng với generateContinuousWeights
export const HEIGHT_RANGE_BY_POSITION: Record<string, { min: number; max: number }> = {
  GK: { min: 185, max: 198 },
  CB: { min: 182, max: 196 },
  CDM: { min: 178, max: 190 },
  LB: { min: 172, max: 185 },
  RB: { min: 172, max: 185 },
  CM: { min: 173, max: 185 },
  CAM: { min: 168, max: 182 },
  LW: { min: 165, max: 180 },
  RW: { min: 165, max: 180 },
  LM: { min: 168, max: 181 },
  RM: { min: 168, max: 181 },
  ST: { min: 170, max: 190 },
};

export function getHeightWeights(position: string): WeightedItem<number>[] {
  const range = HEIGHT_RANGE_BY_POSITION[position] ?? { min: 170, max: 190 };
  return generateContinuousWeights(range.min, range.max);
}

// 12. Dải cân nặng (kg) phụ thuộc chiều cao vừa roll — BMI vận động viên 21-24
export function getWeightRangeFromHeight(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  const min = Math.round(21 * heightM * heightM);
  const max = Math.round(24 * heightM * heightM);
  return { min, max };
}

export function getWeightWeights(heightCm: number): WeightedItem<number>[] {
  const { min, max } = getWeightRangeFromHeight(heightCm);
  return generateContinuousWeights(min, max);
}

// 13. Modifier từ thể hình (chiều cao/cân nặng) lên chỉ số core lúc debut
export function getPhysiqueModifier(
  heightCm: number,
  weightKg: number,
  position: string
): Record<string, number> {
  const range = HEIGHT_RANGE_BY_POSITION[position] ?? { min: 170, max: 190 };
  const heightMid = (range.min + range.max) / 2;
  const heightDev = heightCm - heightMid;
  const heightMod = Math.max(-3, Math.min(3, Math.round(heightDev / 5)));

  const { min: wMin, max: wMax } = getWeightRangeFromHeight(heightCm);
  const weightMid = (wMin + wMax) / 2;
  const weightDev = weightKg - weightMid;
  const weightMod = Math.max(-2, Math.min(2, Math.round(weightDev / 2)));

  const totalMod = Math.max(-3, Math.min(3, heightMod + weightMod));

  const bulkyStat = position === "GK" ? "div" : "phy";
  const agileStat = position === "GK" ? "spd" : "pac";

  return {
    [bulkyStat]: totalMod,
    [agileStat]: -totalMod,
  };
}

// 14. Áp modifier thể hình lên bộ chỉ số vừa roll, clamp cùng biên 10-99 như
// evolvePlayerStatsService để nhất quán trong toàn bộ vòng đời chỉ số.
export function applyPhysiqueModifier(
  stats: Record<string, number>,
  modifier: Record<string, number>
): Record<string, number> {
  const result = { ...stats };
  for (const key of Object.keys(modifier)) {
    if (key in result) {
      result[key] = Math.min(99, Math.max(10, result[key] + modifier[key]));
    }
  }
  return result;
}
