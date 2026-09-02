/**
 * Transfer economy — buying power, MV, buyout, contract years.
 * SoT: docs/core-transfer-design.md (§5). Units: € thousands.
 * Pure TypeScript — no React/Prisma.
 */

import { estimateAppsRatio, getClubThreshold } from "@/lib/club-fit";
import { influenceTopUp } from "@/lib/influence-score";
import { computePositionValueSnapshot } from "@/lib/positional-value";

export {
  computePositionValueSnapshot,
  getPositionAttributeWeights,
  leagueCompetitivenessScore,
} from "@/lib/positional-value";

export const CONTRACT_YEARS_HARD_CAP = 5;
export const MAX_INBOUND_OFFERS = 3;

export type TransferBandId =
  | "lower"
  | "lower_plus"
  | "mid"
  | "upper_mid"
  | "big"
  | "elite";

export interface BuyingPowerBand {
  id: TransferBandId;
  minFee: number;
  maxFee: number;
  minWage: number;
  maxWage: number;
}

/** Locked §5.3 — values in € thousands. */
export function getBuyingPowerBand(prestige: number, leagueTier: number): BuyingPowerBand {
  const p = Math.min(5, Math.max(1, Math.round(prestige)));
  const tier = leagueTier <= 1 ? 1 : 2;

  if (tier === 2 && p <= 2) {
    return { id: "lower", minFee: 500, maxFee: 8_000, minWage: 50, maxWage: 400 };
  }
  if (tier === 2) {
    return { id: "lower_plus", minFee: 2_000, maxFee: 15_000, minWage: 100, maxWage: 800 };
  }
  if (p <= 2) {
    return { id: "mid", minFee: 5_000, maxFee: 25_000, minWage: 200, maxWage: 1_500 };
  }
  if (p === 3) {
    return { id: "upper_mid", minFee: 15_000, maxFee: 45_000, minWage: 800, maxWage: 4_000 };
  }
  if (p === 4) {
    return { id: "big", minFee: 30_000, maxFee: 90_000, minWage: 2_000, maxWage: 10_000 };
  }
  return { id: "elite", minFee: 60_000, maxFee: 180_000, minWage: 5_000, maxWage: 25_000 };
}

export function seasonsLeftInCareer(currentAge: number, retireAge: number): number {
  return Math.max(0, retireAge - currentAge);
}

export function clampContractYears(proposed: number, currentAge: number, retireAge: number): number {
  const left = seasonsLeftInCareer(currentAge, retireAge);
  if (left <= 0) return 0;
  return Math.min(CONTRACT_YEARS_HARD_CAP, Math.max(1, Math.round(proposed)), left);
}

/** Age multiplier DRAFT §5.4 */
export function ageCurveMul(age: number): number {
  if (age <= 21) return 1.2;
  if (age <= 27) return 1.08;
  if (age <= 31) return 0.92;
  if (age <= 34) return 0.68;
  return 0.42;
}

function baseMvFromOvr(ovr: number): number {
  // Rough ladder in € thousands
  if (ovr < 60) return 200 + ovr * 8;
  if (ovr < 70) return 800 + (ovr - 60) * 120;
  if (ovr < 80) return 2_000 + (ovr - 70) * 400;
  if (ovr < 88) return 6_000 + (ovr - 80) * 1_500;
  if (ovr < 93) return 18_000 + (ovr - 88) * 8_000;
  return 58_000 + (ovr - 93) * 15_000;
}

export function formMulFromRating(matchRating: number): number {
  if (matchRating >= 7.8) return 1.18;
  if (matchRating >= 7.2) return 1.1;
  if (matchRating >= 6.6) return 1.0;
  if (matchRating >= 6.2) return 0.92;
  return 0.85;
}

export function computeMarketValue(params: {
  ovr: number;
  age: number;
  matchRating: number;
  contractYearsRemaining: number;
  position?: string;
  currentStats?: Record<string, number>;
}): number {
  const { ovr, age, matchRating, contractYearsRemaining, position, currentStats } = params;
  const valuationOvr = position
    ? computePositionValueSnapshot(position, currentStats, ovr).effectivePositionOvr
    : ovr;
  const contractMul = 1 + 0.12 * Math.max(0, contractYearsRemaining - 1);
  const raw =
    baseMvFromOvr(valuationOvr) *
    ageCurveMul(age) *
    formMulFromRating(matchRating) *
    contractMul;
  const floor = Math.max(100, Math.round(baseMvFromOvr(valuationOvr) * 0.35));
  const ceil = Math.round(baseMvFromOvr(valuationOvr) * 2.2);
  return Math.max(floor, Math.min(ceil, Math.round(raw)));
}

/** Locked: player cannot discount this. */
export function buyoutFactor(remaining: number): number {
  if (remaining <= 0) return 0;
  if (remaining === 1) return 1.0;
  if (remaining === 2) return 1.15;
  if (remaining === 3) return 1.25;
  return 1.35;
}

export function computeMandatoryBuyout(marketValue: number, contractYearsRemaining: number): number {
  const f = buyoutFactor(contractYearsRemaining);
  if (f <= 0) return 0;
  return Math.round(marketValue * f);
}

export function clubCanAffordBuyout(
  prestige: number,
  leagueTier: number,
  mandatoryBuyout: number,
): boolean {
  if (mandatoryBuyout <= 0) return true;
  return getBuyingPowerBand(prestige, leagueTier).maxFee >= mandatoryBuyout;
}

export function proposeContractYears(params: {
  currentAge: number;
  retireAge: number;
  matchRating: number;
  isRenewal?: boolean;
}): number {
  const { currentAge, retireAge, matchRating, isRenewal } = params;
  let proposed = 3;
  if (matchRating >= 7.5) proposed = 4;
  else if (matchRating < 6.4) proposed = 2;
  if (isRenewal && matchRating >= 7.2) proposed = Math.max(proposed, 3);
  if (currentAge >= 32) proposed = Math.min(proposed, 2);
  if (currentAge >= 35) proposed = 1;
  return clampContractYears(proposed, currentAge, retireAge);
}

export function proposeWageAnnual(params: {
  ovr: number;
  age: number;
  currentWage: number;
  prestige: number;
  leagueTier: number;
  matchRating: number;
  stepUpPrestige?: number; // destination - current
  acceptLowerWage?: boolean;
}): number {
  const band = getBuyingPowerBand(params.prestige, params.leagueTier);
  const ovrT = Math.min(1, Math.max(0, (params.ovr - 55) / 40));
  let target = Math.round(band.minWage + ovrT * (band.maxWage - band.minWage));
  if (params.matchRating >= 7.5) target = Math.round(target * 1.08);
  if (params.matchRating < 6.3) target = Math.round(target * 0.92);
  if ((params.stepUpPrestige ?? 0) > 0) target = Math.round(target * 1.06);
  if ((params.stepUpPrestige ?? 0) < 0) target = Math.round(target * 0.95);

  if (params.acceptLowerWage) {
    target = Math.min(target, Math.round((band.minWage + band.maxWage) / 2));
  }

  // Prefer not dropping below current unless acceptLowerWage or band forces
  if (!params.acceptLowerWage && params.currentWage > 0) {
    target = Math.max(target, Math.min(params.currentWage, band.maxWage));
  }

  return Math.max(band.minWage, Math.min(band.maxWage, target));
}

export function wantsRenewal(params: {
  seasonsLeft: number;
  contractYearsRemaining: number;
  appsRatio: number;
  matchRating: number;
  ovr: number;
  clubPrestige: number;
  proposedWage: number;
  leagueTier: number;
  isDistressSale: boolean;
}): boolean {
  const {
    seasonsLeft,
    contractYearsRemaining: rem,
    appsRatio,
    matchRating,
    ovr,
    clubPrestige,
    proposedWage,
    leagueTier,
    isDistressSale,
  } = params;

  if (seasonsLeft < 1) return false;
  if (isDistressSale) return false;

  const band = getBuyingPowerBand(clubPrestige, leagueTier);
  if (proposedWage > band.maxWage) return false;

  const threshold = getClubThreshold(clubPrestige);
  const fitOk = appsRatio >= 0.45 || ovr >= threshold;
  const formOk = matchRating >= 6.4 || (appsRatio < 0.45 && ovr >= threshold && rem === 1);
  if (!fitOk || !formOk) return false;

  if (rem >= 2) {
    return matchRating >= 7.2 && ovr >= threshold + 2;
  }
  // rem 0 or 1 — priority renew
  return true;
}

export function isDistressSale(matchRating: number, appsRatio: number): boolean {
  return matchRating < 6.2 && appsRatio < 0.4;
}

/** Format € thousands for UI. */
export function formatEuroThousands(k: number): string {
  const euros = k * 1000;
  if (euros >= 1_000_000) {
    const m = euros / 1_000_000;
    return `€${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (euros >= 1_000) {
    return `€${Math.round(euros / 1000)}k`;
  }
  return `€${euros}`;
}

export function expectedAppsAtClub(ovr: number, prestige: number, leagueSize = 20): number {
  const ratio = estimateAppsRatio(ovr, prestige);
  const fixtures = Math.max(1, (Math.max(2, leagueSize) - 1) * 2);
  return Math.max(1, Math.round(fixtures * ratio));
}

/** Expected club prestige band from OVR (1–5). */
export function expectedPrestigeFromOvr(ovr: number): number {
  return Math.min(5, Math.max(1, Math.round((ovr - 50) / 8)));
}

/**
 * P(CLB nhận approach outbound). Pure — no Math.random.
 * Clamp [0.08, 0.85]. SoT plan approach odds.
 * @param effPositionOvr — if provided, used for prestige/fit evaluation (SoT §12.1).
 *   Falls back to `ovr` when absent (e.g., legacy callers).
 * @param influenceScore — Player Influence Score (docs/core-currency-shop-design.md §5),
 *   applied as a small capped top-up INSIDE this function (not by callers) so every call
 *   site (shortlist builder, resolveApproachService, searchClubsForApproachAction) stays
 *   in sync — a mismatch between call sites would trip the client/server drift-check.
 */
export function computeApproachAcceptChance(params: {
  ovr: number;
  effPositionOvr?: number; // SoT §12.1 — prefer this over raw ovr for club fit evaluation
  age: number;
  matchRating: number;
  destPrestige: number;
  destLeagueTier: number;
  expectedAppsRatio: number;
  influenceScore?: number;
}): number {
  const { age, matchRating, destPrestige, destLeagueTier, expectedAppsRatio } = params;
  // Use effPositionOvr if provided (SoT §7.10: club evaluates by position-specific ability)
  const effOvr = params.effPositionOvr ?? params.ovr;

  let base: number;
  if (expectedAppsRatio >= 0.7) base = 0.55;
  else if (expectedAppsRatio >= 0.45) base = 0.35;
  else base = 0.18;

  const expectedPrestige = expectedPrestigeFromOvr(effOvr);
  const prestigeGap = destPrestige - expectedPrestige;
  let prestigeMul = 1;
  if (prestigeGap >= 2) prestigeMul = 0.5;
  else if (prestigeGap === 1) prestigeMul = 0.72;
  else if (prestigeGap < 0) prestigeMul = 0.95;

  let chance = base * prestigeMul;

  if (matchRating >= 7.5) chance += 0.12;
  else if (matchRating >= 7.0) chance += 0.06;
  else if (matchRating < 6.3) chance -= 0.1;

  if (age >= 34) chance -= 0.15;
  else if (age >= 32) chance -= 0.08;

  const threshold = getClubThreshold(destPrestige);
  if (destLeagueTier === 1 && destPrestige >= 4 && effOvr < threshold - 8) {
    chance -= 0.05;
  }

  chance += influenceTopUp(params.influenceScore) / 100;

  // Re-clamp to the same documented band after the top-up — approachChancePercent()
  // (UI display helper) independently re-clamps to [0.08, 0.85] too, so letting the
  // internal composite exceed it here would make the displayed % silently diverge
  // from the real resolve-time probability.
  return Math.min(0.85, Math.max(0.08, chance));
}

/** Integer percent for UI (e.g. 0.42 → 42). */
export function approachChancePercent(chance: number): number {
  return Math.round(Math.min(0.85, Math.max(0.08, chance)) * 100);
}

/** Shared alias retained for existing callers and the transfer SoT. */
export function computeEffectivePositionOvr(
  position: string,
  currentStats: Record<string, number> | undefined,
  currentOvr: number,
): number {
  return computePositionValueSnapshot(position, currentStats, currentOvr).effectivePositionOvr;
}

/**
 * Computes Scout Interest Score (0–100) based on position effective OVR, stats, nation fit, age & potential.
 */
/**
 * @param influenceScore — Player Influence Score (docs/core-currency-shop-design.md §5),
 *   applied as a small capped top-up INSIDE this function — single call site today, but
 *   kept internal for consistency with computeApproachAcceptChance's multi-call-site rule.
 */
export function computeScoutInterestScore(params: {
  position: string;
  currentStats?: Record<string, number>;
  currentOvr: number;
  potential?: number;
  age: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  playerNation?: string;
  clubLeagueCountry?: string;
  clubPrestige: number;
  influenceScore?: number;
}): number {
  const {
    position,
    currentStats,
    currentOvr,
    potential = currentOvr,
    age,
    matchRating,
    goals,
    assists,
    cleanSheets,
    playerNation,
    clubLeagueCountry,
    clubPrestige,
  } = params;

  const effOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
  const threshold = getClubThreshold(clubPrestige);

  // 1. OVR & Fit score (0 - 40 pts)
  const ovrGap = effOvr - threshold;
  let ovrScore = 20 + ovrGap * 2.5;
  ovrScore = Math.max(0, Math.min(40, ovrScore));

  // 2. Performance score (0 - 30 pts)
  let perfScore = Math.max(0, (matchRating - 6.0) * 15);
  const pos = position.toUpperCase();
  if (pos === "ST" || pos === "CF" || pos === "LW" || pos === "RW") {
    perfScore += Math.min(10, goals * 0.5 + assists * 0.3);
  } else if (pos === "CAM" || pos === "CM" || pos === "LM" || pos === "RM") {
    perfScore += Math.min(10, assists * 0.6 + goals * 0.3);
  } else {
    perfScore += Math.min(10, cleanSheets * 0.6);
  }
  perfScore = Math.min(30, perfScore);

  // 3. Cultural/National fit bonus (0 - 10 pts)
  let natBonus = 0;
  if (playerNation && clubLeagueCountry && playerNation.toLowerCase() === clubLeagueCountry.toLowerCase()) {
    natBonus = 8;
  }

  // 4. Age & Potential bonus (0 - 20 pts)
  let agePotBonus = 0;
  if (age <= 23) {
    const potGap = Math.max(0, potential - effOvr);
    agePotBonus = 10 + Math.min(10, potGap * 1.2);
  } else if (age <= 28) {
    agePotBonus = 12;
  } else if (age <= 32) {
    agePotBonus = 6;
  } else {
    agePotBonus = 2;
  }

  const base = Math.round(Math.max(5, Math.min(100, ovrScore + perfScore + natBonus + agePotBonus)));
  return Math.min(100, base + influenceTopUp(params.influenceScore));
}

/**
 * Calculates success chance % (0.10 - 0.85) when player actively requests a renewal with current club.
 */
export function computeProactiveRenewalChance(params: {
  position: string;
  currentStats?: Record<string, number>;
  currentOvr: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  clubPrestige: number;
  contractYearsRemaining: number;
}): number {
  const {
    position,
    currentStats,
    currentOvr,
    matchRating,
    goals,
    assists,
    cleanSheets,
    clubPrestige,
    contractYearsRemaining,
  } = params;

  const effOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
  const threshold = getClubThreshold(clubPrestige);

  let chance = 0.45; // baseline 45%

  // Effective OVR vs threshold
  if (effOvr >= threshold + 3) chance += 0.20;
  else if (effOvr >= threshold) chance += 0.10;
  else if (effOvr < threshold - 5) chance -= 0.20;

  // Form (Match Rating)
  if (matchRating >= 7.4) chance += 0.18;
  else if (matchRating >= 6.8) chance += 0.08;
  else if (matchRating < 6.2) chance -= 0.15;

  // Contract Remaining
  if (contractYearsRemaining <= 1) chance += 0.10; // Club more likely to renew last year
  else if (contractYearsRemaining >= 3) chance -= 0.15;

  // Position Stats
  const pos = position.toUpperCase();
  if (pos === "ST" || pos === "CF" || pos === "LW" || pos === "RW") {
    if (goals + assists >= 10) chance += 0.10;
  } else if (pos === "CB" || pos === "GK" || pos === "LB" || pos === "RB" || pos === "CDM") {
    if (cleanSheets >= 8) chance += 0.10;
  } else {
    if (assists >= 6) chance += 0.10;
  }

  return Math.min(0.88, Math.max(0.10, chance));
}
