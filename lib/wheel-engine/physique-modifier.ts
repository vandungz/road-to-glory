import type { WeightedItem } from "./spin-resolver";
import { generateContinuousWeights } from "./weight-pools";

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


