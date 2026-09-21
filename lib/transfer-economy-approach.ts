import { getClubThreshold } from "@/lib/club-fit";
import { influenceTopUp } from "@/lib/influence-score";
import { computePositionValueSnapshot } from "@/lib/positional-value";
import { expectedPrestigeFromOvr } from "@/lib/transfer-economy-contracts";

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

