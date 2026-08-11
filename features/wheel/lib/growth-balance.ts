/**
 * Soft-cap, effective growth gates/pools, and shared balance helpers (SoT §§4–6).
 * Preview (useCareerWheelItems) and resolve (career-wheel-resolver) MUST call these.
 */

import {
  type GrowthTier,
  getGrowthTier,
  getDecreaseGateWeight,
  getCountPool,
  getCountPoolBoosted,
  getMagnitudePool,
  getMagnitudePoolBoosted,
  getMagnitudeTierForDirection,
  getYoungYears,
  getGrowthBoostYears,
  isYoungByYears,
  isOldDualClock,
} from "./simulation-helpers";
import { FITNESS_COACH_SEVERITY_MULTIPLIER } from "@/lib/shop-catalog";

export function getSoftCapFactor(ovr: number): number {
  if (ovr >= 99) return 0;
  if (ovr >= 96) return 0.15;
  if (ovr >= 93) return 0.35;
  if (ovr >= 89) return 0.6;
  if (ovr >= 85) return 0.8;
  return 1;
}

/** Young boost only below soft-cap band start (SoT §4.5); years-based per SoT §1. */
export function getEffectiveGrowthBoost(
  currentAge: number,
  debutAge: number,
  position: string,
  currentOvr: number,
): number {
  if (currentOvr >= 82) return 0;
  return getGrowthBoostYears(currentAge - debutAge, getYoungYears(position));
}

export function applySoftCapToGate(
  yesW: number,
  noW: number,
  softCap: number,
  currentOvr?: number,
): { yes: number; no: number } {
  if (softCap >= 1) return { yes: yesW, no: noW };
  // Band 99: no increase path
  if (softCap <= 0) return { yes: 0, no: Math.max(1, yesW + noW) };
  let yes = Math.max(2, Math.round(yesW * softCap));
  // SoT §4.4.5 (Updated 2026-08-03): Keep a 35% floor for OVR < 92 when yesW >= 40
  if (currentOvr != null && currentOvr < 92 && yesW >= 40) {
    yes = Math.max(35, yes);
  }
  const no = Math.max(1, yesW + noW - yes);
  return { yes, no };
}

/** Scale weights for values ≥ 3 by softCap; keep small bumps relatively intact. */
export function applySoftCapToIncreasePool(
  pool: { value: number; weight: number }[],
  softCap: number,
): { value: number; weight: number }[] {
  if (softCap >= 1) return pool;
  if (softCap <= 0) {
    return pool.map((p) => ({
      value: p.value,
      weight: p.value === 1 ? Math.max(1, p.weight) : 1,
    }));
  }
  return pool.map((p) => ({
    value: p.value,
    weight: Math.max(1, Math.round(p.value >= 3 ? p.weight * softCap : p.weight)),
  }));
}

// ── SoT §4.4 Development Score (increase gate only) ─────────────────────────

type ProgressBand = "young" | "mid" | "old";
type HeadroomBand = "low" | "mid" | "high" | "elite";

const YES_FLOOR = 10;
const YES_CEIL = 90;

const DEVELOPMENT_BASE: Record<ProgressBand, Record<HeadroomBand, number>> = {
  young: { low: 80, mid: 72, high: 55, elite: 28 },
  mid: { low: 70, mid: 62, high: 45, elite: 22 },
  old: { low: 35, mid: 28, high: 20, elite: 10 },
};

export function getProgressBand(
  currentAge: number,
  debutAge: number,
  careerLength: number,
  position: string,
): ProgressBand {
  if (isYoungByYears(currentAge, debutAge, position)) return "young";
  if (isOldDualClock(currentAge, debutAge, careerLength, position)) return "old";
  return "mid";
}

export function getHeadroomBand(ovr: number): HeadroomBand {
  if (ovr <= 74) return "low";
  if (ovr <= 81) return "mid";
  if (ovr <= 88) return "high";
  return "elite";
}

export function getDevelopmentBaseYes(
  progressBand: ProgressBand,
  headroomBand: HeadroomBand,
): number {
  return DEVELOPMENT_BASE[progressBand][headroomBand];
}

/** Position-Specific KPI Bonus Multiplier (SoT §4.4.8). */
export function getPositionKpiMultiplier(params: {
  position: string;
  apps?: number | null;
  goals?: number | null;
  assists?: number | null;
  cleanSheets?: number | null;
}): number {
  const apps = params.apps ?? 0;
  if (apps <= 0) return 1.0;

  const pos = params.position.toUpperCase();
  const goals = params.goals ?? 0;
  const assists = params.assists ?? 0;
  const cs = params.cleanSheets ?? 0;

  const gPerApp = goals / apps;
  const gaPerApp = (goals + assists) / apps;
  const aPerApp = assists / apps;
  const csRatio = cs / apps;

  if (pos === "ST" && gPerApp >= 0.5) return 1.2;
  if ((pos === "LW" || pos === "RW") && gaPerApp >= 0.4) return 1.18;
  if (pos === "CAM" && aPerApp >= 0.35) return 1.18;
  if ((pos === "LM" || pos === "RM") && gaPerApp >= 0.3) return 1.15;
  if (pos === "CM") return 1.0;
  if (pos === "CDM" && csRatio >= 0.35) return 1.15;
  if ((pos === "LB" || pos === "RB") && (csRatio >= 0.3 || aPerApp >= 0.15)) return 1.15;
  if (pos === "CB" && csRatio >= 0.35) return 1.2;
  if (pos === "GK" && csRatio >= 0.4) return 1.25;

  return 1.0;
}

/** Form is a modifier on base Yes — not the primary driver (SoT §4.4.4). */
export function getFormMultiplier(rating: number): number {
  const tier = getGrowthTier(rating);
  switch (tier) {
    case "xuat_sac": return 1.25;
    case "tot": return 1.1;
    case "trung_binh": return 1.0;
    case "kem": return 0.75;
  }
}

/**
 * Increase Yes = DevelopmentBase(progress×headroom) × formMul × kpiMul, clamped, then soft-cap.
 */
export function getEffectiveIncreaseGate(params: {
  rating: number;
  position: string;
  currentAge: number;
  debutAge: number;
  careerLength: number;
  currentOvr: number;
  seasonApps?: number | null;
  seasonGoals?: number | null;
  seasonAssists?: number | null;
  seasonCleanSheets?: number | null;
}): { yes: number; no: number } {
  const progressBand = getProgressBand(params.currentAge, params.debutAge, params.careerLength, params.position);
  const headroomBand = getHeadroomBand(params.currentOvr);

  const baseYes = getDevelopmentBaseYes(progressBand, headroomBand);
  const formMul = getFormMultiplier(params.rating);
  const kpiMul = getPositionKpiMultiplier({
    position: params.position,
    apps: params.seasonApps,
    goals: params.seasonGoals,
    assists: params.seasonAssists,
    cleanSheets: params.seasonCleanSheets,
  });

  const yesRaw = Math.max(YES_FLOOR, Math.min(YES_CEIL, Math.round(baseYes * formMul * kpiMul)));

  const softCap = getSoftCapFactor(params.currentOvr);
  return applySoftCapToGate(yesRaw, 100 - yesRaw, softCap, params.currentOvr);
}

export function getEffectiveDecreaseGate(params: {
  rating: number;
  position: string;
  currentAge: number;
  debutAge: number;
  careerLength: number;
  /** Total season apps — low opportunity softens decrease Yes (SoT §7.6). */
  seasonApps?: number | null;
}): { yes: number; no: number } {
  const tier = getGrowthTier(params.rating);
  let { yes: yesW, no: noW } = getDecreaseGateWeight(tier);
  const isYoung = isYoungByYears(params.currentAge, params.debutAge, params.position);
  const isOld = isOldDualClock(params.currentAge, params.debutAge, params.careerLength, params.position);

  if (isYoung) {
    yesW = Math.max(5, yesW - 20);
    noW = Math.min(95, noW + 20);
  } else if (isOld) {
    yesW = Math.min(95, yesW + 15);
    noW = Math.max(5, noW - 15);
    // SoT §6: late-career decline floor
    yesW = Math.max(yesW, 55);
    noW = Math.max(5, 100 - yesW);
  }

  // Sparse minutes: less likely forced into decrease (except old floor already applied)
  const apps = params.seasonApps;
  if (apps != null && apps < 16 && !isOld) {
    yesW = Math.max(5, Math.round(yesW * 0.65));
    noW = Math.max(5, 100 - yesW);
  }

  return { yes: yesW, no: noW };
}

/**
 * Severity of decrease count/mag: 1 = full SoT table, 0.3 = mostly −1 light.
 * Low apps = incomplete opportunity, not a full failed season (SoT §7.6.2).
 * @param fitnessCoachActive — Shop item (docs/core-currency-shop-design.md §6.2). Caller
 *   must compute this ONCE and pass the same value to preview and resolve — never let the
 *   two recompute it independently (see the O11 preview≠resolve warning elsewhere in SoT).
 */
export function getDecreaseOpportunitySeverity(
  seasonApps: number | null | undefined,
  fitnessCoachActive = false,
): number {
  const base =
    seasonApps == null || seasonApps < 0
      ? 1
      : seasonApps >= 24
        ? 1
        : seasonApps <= 10
          ? 0.3
          : 0.3 + ((seasonApps - 10) / 14) * 0.7;
  return fitnessCoachActive ? base * FITNESS_COACH_SEVERITY_MULTIPLIER : base;
}

function blendWeightPools(
  harsh: { value: number; weight: number }[],
  gentle: { value: number; weight: number }[],
  severity: number,
): { value: number; weight: number }[] {
  const s = Math.max(0, Math.min(1, severity));
  const byValue = new Map<number, { harsh: number; gentle: number }>();
  for (const p of harsh) {
    byValue.set(p.value, { harsh: p.weight, gentle: 0 });
  }
  for (const p of gentle) {
    const cur = byValue.get(p.value) ?? { harsh: 0, gentle: 0 };
    cur.gentle = p.weight;
    byValue.set(p.value, cur);
  }
  return [...byValue.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, w]) => ({
      value,
      weight: Math.max(1, Math.round(w.harsh * s + w.gentle * (1 - s))),
    }));
}

export function getEffectiveCountPool(params: {
  rating: number;
  isIncrease: boolean;
  position: string;
  currentAge: number;
  debutAge: number;
  careerLength: number;
  currentOvr: number;
  seasonApps?: number | null;
  fitnessCoachActive?: boolean;
}): { value: number; weight: number }[] {
  const tier = getGrowthTier(params.rating);
  let pool = getCountPool(tier, params.isIncrease);
  if (params.isIncrease) {
    const boost = getEffectiveGrowthBoost(params.currentAge, params.debutAge, params.position, params.currentOvr);
    pool = getCountPoolBoosted(tier, boost);
    pool = applySoftCapToIncreasePool(pool, getSoftCapFactor(params.currentOvr));
  } else {
    const severity = getDecreaseOpportunitySeverity(params.seasonApps, params.fitnessCoachActive);
    if (severity < 1) {
      // Gentle = "xuat_sac" decrease count (mostly 1)
      pool = blendWeightPools(pool, getCountPool("xuat_sac", false), severity);
    }
  }
  return pool;
}

export function getEffectiveMagnitudePool(params: {
  rating: number;
  isIncrease: boolean;
  position: string;
  currentAge: number;
  debutAge: number;
  careerLength: number;
  currentOvr: number;
  seasonApps?: number | null;
  fitnessCoachActive?: boolean;
}): { value: number; weight: number }[] {
  const magTier = getMagnitudeTierForDirection(params.rating, params.isIncrease);
  let pool = getMagnitudePool(magTier, params.isIncrease);
  if (params.isIncrease) {
    const boost = getEffectiveGrowthBoost(params.currentAge, params.debutAge, params.position, params.currentOvr);
    pool = getMagnitudePoolBoosted(magTier, boost);
    pool = applySoftCapToIncreasePool(pool, getSoftCapFactor(params.currentOvr));
  } else {
    const severity = getDecreaseOpportunitySeverity(params.seasonApps, params.fitnessCoachActive);
    if (severity < 1) {
      // Gentle = kem-shaped mag pool (small deltas); harsh = mirrored tier
      pool = blendWeightPools(pool, getMagnitudePool("kem", false), severity);
    }
  }
  return pool;
}

/**
 * Selector weights — when decreasing late-career, prefer main stats so OVR drops.
 * Not old: main 25 / sec 10; old (dual-clock, SoT §1): main 32 / sec 8 → reverse bias.
 */
export function getSelectorStatWeight(
  isMain: boolean,
  isIncrease: boolean,
  isOld: boolean,
): number {
  if (isIncrease || !isOld) {
    return isMain ? 25 : 10;
  }
  // Late decline: weight main stats higher when cutting
  return isMain ? 32 : 8;
}

export type { GrowthTier };
