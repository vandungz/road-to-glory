/**
 * Salary Negotiation Logic — SoT docs/core-transfer-design.md §13
 * Pure TypeScript — deal options ("lower", "standard", "higher") and wage elasticity.
 */

export type WageDealOption = "lower" | "standard" | "higher";

export interface WageOptionDetail {
  option: WageDealOption;
  label: string;
  wageAnnual: number;
  acceptChanceModifier: number; // e.g. +0.12 or -0.15
}

export function computeWageOptions(params: {
  baseWage: number;
  minWage: number;
  maxWage: number;
}): Record<WageDealOption, WageOptionDetail> {
  const { baseWage, minWage, maxWage } = params;

  // Lower wage: 20% lower than base, clamped to minWage
  const lowerWage = Math.max(minWage, Math.round(baseWage * 0.8));
  
  // Higher wage: 15% higher than base, clamped to maxWage
  const higherWage = Math.min(maxWage, Math.round(baseWage * 1.15));

  return {
    lower: {
      option: "lower",
      label: "Chấp nhận giảm lương (-20%)",
      wageAnnual: lowerWage,
      acceptChanceModifier: 0.14, // +14% chance to be accepted
    },
    standard: {
      option: "standard",
      label: "Mức lương tiêu chuẩn",
      wageAnnual: baseWage,
      acceptChanceModifier: 0,
    },
    higher: {
      option: "higher",
      label: "Yêu cầu tăng lương (+15%)",
      wageAnnual: higherWage,
      acceptChanceModifier: -0.14, // -14% chance
    },
  };
}

export function applyWageDealChance(baseChance: number, option: WageDealOption): number {
  let modifier = 0;
  if (option === "lower") modifier = 0.14;
  else if (option === "higher") modifier = -0.14;

  return Math.min(0.92, Math.max(0.05, baseChance + modifier));
}
