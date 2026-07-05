import type { WeightedItem } from "./spin-resolver";

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
  { value: 16, weight: 10 },
  { value: 17, weight: 25 },
  { value: 18, weight: 30 },
  { value: 19, weight: 20 },
  { value: 20, weight: 10 },
  { value: 21, weight: 5 },
];

// 3. Debut OVR
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

// 5. Tính trọng số Leagues dựa trên prestiges/tiếng tăm
export function getLeagueWeights(leagues: { id: string; name: string }[]): WeightedItem<{ id: string; name: string }>[] {
  return leagues.map((league) => {
    // Ưu tiên Top 5 giải đấu nổi tiếng
    let weight = 10;
    const name = league.name.toLowerCase();
    if (name.includes("premier league") || name.includes("la liga") || name.includes("serie a") || name.includes("bundesliga") || name.includes("ligue 1")) {
      weight = 40;
    } else if (name.includes("championship") || name.includes("primeira liga") || name.includes("eredivisie")) {
      weight = 20;
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
  
  // ── GK (Thủ môn) ──
  if (position === "GK") {
    if (stat === "def" || stat === "phy") {
      return generateContinuousWeights(65, 80);
    } else if (stat === "sho" || stat === "dri") {
      return generateContinuousWeights(15, 30);
    } else {
      return generateContinuousWeights(45, 60);
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
  const uefa = ["England", "France", "Spain", "Germany", "Italy", "Portugal", "Netherlands", "Croatia", "Czech Republic", "Switzerland", "Norway", "Turkey", "Bosnia and Herzegovina"];
  const conmebol = ["Brazil", "Argentina", "Ecuador", "Paraguay", "Uruguay", "Chile", "Colombia"];
  const afc = ["Japan", "South Korea", "Saudi Arabia", "Qatar", "Iran", "Australia"];
  const concacaf = ["USA", "Mexico", "Canada", "Haiti", "Panama"];
  const caf = ["Morocco", "Senegal", "Ivory Coast", "Ghana", "Algeria", "Cape Verde", "South Africa", "Tunisia"];

  if (uefa.includes(nationality)) return "UEFA Euro";
  if (conmebol.includes(nationality)) return "Copa América";
  if (afc.includes(nationality)) return "AFC Asian Cup";
  if (concacaf.includes(nationality)) return "CONCACAF Gold Cup";
  if (caf.includes(nationality)) return "CAF Africa Cup of Nations";
  return "Continental Cup";
}

// 10. Tính toán OVR theo trọng số vị trí thi đấu thực tế (Weighted OVR)
export function calculateOvrByPosition(position: string, stats: { pac: number; sho: number; pas: number; dri: number; def: number; phy: number }): number {
  const { pac, sho, pas, dri, def, phy } = stats;
  let ovr = 0;

  switch (position) {
    case "GK":
      ovr = def * 0.60 + phy * 0.30 + pas * 0.10;
      break;
    case "CB":
      ovr = def * 0.45 + phy * 0.35 + pac * 0.15 + pas * 0.05;
      break;
    case "LB":
    case "RB":
      ovr = pac * 0.30 + def * 0.30 + pas * 0.20 + dri * 0.10 + phy * 0.10;
      break;
    case "CDM":
      ovr = def * 0.35 + phy * 0.30 + pas * 0.20 + dri * 0.10 + pac * 0.05;
      break;
    case "CM":
      ovr = pas * 0.30 + dri * 0.25 + def * 0.15 + phy * 0.15 + sho * 0.10 + pac * 0.05;
      break;
    case "CAM":
      ovr = pas * 0.35 + dri * 0.30 + sho * 0.25 + pac * 0.10;
      break;
    case "LW":
    case "RW":
      ovr = pac * 0.35 + dri * 0.30 + sho * 0.20 + pas * 0.15;
      break;
    case "ST":
      ovr = sho * 0.45 + pac * 0.25 + dri * 0.15 + phy * 0.10 + pas * 0.05;
      break;
    default:
      // Fallback trung bình cộng
      ovr = (pac + sho + pas + dri + def + phy) / 6;
  }

  return Math.round(ovr);
}
