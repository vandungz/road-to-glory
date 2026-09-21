/**
 * Transfer economy — buying power, MV, buyout, contract years.
 * SoT: docs/core-transfer-design.md (§5). Units: € thousands.
 * Pure TypeScript — no React/Prisma.
 */

import { computePositionValueSnapshot } from "@/lib/positional-value";
import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";

export {
  computePositionValueSnapshot,
  getPositionAttributeWeights,
  leagueCompetitivenessScore,
} from "@/lib/positional-value";

export const CONTRACT_YEARS_HARD_CAP = 5;
export const MAX_INBOUND_OFFERS = 3;

export type TransferFeeDealOption = "discount" | "standard" | "premium";

export interface TransferFeeOptionDetail {
  option: TransferFeeDealOption;
  label: string;
  fee: number;
  acceptChanceModifier: number;
}

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

/** True when the existing contract already covers every remaining career season. */
export function contractCoversRemainingCareer(
  currentAge: number,
  retireAge: number,
  contractYearsRemaining: number,
): boolean {
  const seasonsLeft = seasonsLeftInCareer(currentAge, retireAge);
  return seasonsLeft > 0 && contractYearsRemaining >= seasonsLeft;
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

/**
 * The player's market value is a valuation, not a universal transfer quote.
 * A destination club prices the same player differently according to buying
 * power, league level and expected role. The buyout remains the legal floor
 * while the club-specific premium creates a realistic spread between quotes.
 */
export function computeClubTransferFee(params: {
  marketValue: number;
  mandatoryBuyout: number;
  prestige: number;
  leagueTier: number;
  leaguePrestige?: number;
  expectedAppsRatio: number;
  /** Stable club identity used to model club-specific budget/negotiation behavior. */
  clubIdentity?: string;
}): number {
  const fit = Math.min(1, Math.max(0, params.expectedAppsRatio));
  const prestigePremium = (Math.min(5, Math.max(1, params.prestige)) - 1) * 0.025;
  const leaguePremium = (Math.min(5, Math.max(1, params.leaguePrestige ?? params.leagueTier)) - 1) * 0.018;
  const tierPremium = params.leagueTier <= 1 ? 0.04 : 0;
  const fitPremium = (fit - 0.5) * 0.1;
  const identitySignal = params.clubIdentity ? stableClubPriceSignal(params.clubIdentity) : 0;
  const clubBudgetPremium = 0.06 + identitySignal * 0.12;
  const multiplier = Math.min(
    1.42,
    Math.max(1.04, 1 + prestigePremium + leaguePremium + tierPremium + fitPremium + clubBudgetPremium),
  );
  const valuationBase = Math.max(params.marketValue, params.mandatoryBuyout);
  const desired = Math.round(valuationBase * multiplier);
  return desired;
}

function stableClubPriceSignal(identity: string): number {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

export function applyTransferFeeDealOption(
  baseFee: number,
  mandatoryBuyout: number,
  option: TransferFeeDealOption,
): number {
  if (baseFee <= 0) return 0;
  const multiplier = option === "discount" ? 0.88 : option === "premium" ? 1.12 : 1;
  return Math.max(mandatoryBuyout, Math.round(baseFee * multiplier));
}

export function computeTransferFeeOptions(params: {
  baseFee: number;
  mandatoryBuyout: number;
  maxFee: number;
}): Record<TransferFeeDealOption, TransferFeeOptionDetail> {
  return {
    discount: {
      option: "discount",
      label: "Giá mềm · tăng cơ hội",
      fee: applyTransferFeeDealOption(params.baseFee, params.mandatoryBuyout, "discount"),
      acceptChanceModifier: 0.12,
    },
    standard: {
      option: "standard",
      label: "Giá thị trường",
      fee: applyTransferFeeDealOption(params.baseFee, params.mandatoryBuyout, "standard"),
      acceptChanceModifier: 0,
    },
    premium: {
      option: "premium",
      label: "Giá cao · giảm cơ hội",
      fee: Math.min(
        params.maxFee,
        applyTransferFeeDealOption(params.baseFee, params.mandatoryBuyout, "premium"),
      ),
      acceptChanceModifier: -0.12,
    },
  };
}

export function applyTransferFeeDealChance(
  baseChance: number,
  option: TransferFeeDealOption,
): number {
  const modifier = option === "discount" ? 0.12 : option === "premium" ? -0.12 : 0;
  return Math.min(0.92, Math.max(0.05, baseChance + modifier));
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

/**
 * Adds a small club-specific market spread while staying inside the club's
 * buying-power band. The player/fit formula still supplies the centre point;
 * this function only makes otherwise identical clubs quote different wages.
 */
export function randomizeWageAnnual(params: {
  proposedWage: number;
  prestige: number;
  leagueTier: number;
  randomSource?: RandomSource;
}): number {
  const band = getBuyingPowerBand(params.prestige, params.leagueTier);
  const centre = clampWageAnnual(params.proposedWage, params.prestige, params.leagueTier);
  const spread = Math.max(1, Math.round((band.maxWage - band.minWage) * 0.15));
  const min = Math.max(band.minWage, centre - spread);
  const max = Math.min(band.maxWage, centre + spread);
  const roll = Math.max(0, Math.min(0.999999, (params.randomSource ?? resolveRandom)()));
  return Math.max(min, Math.min(max, Math.round(min + roll * (max - min))));
}

export function clampWageAnnual(wage: number, prestige: number, leagueTier: number): number {
  const band = getBuyingPowerBand(prestige, leagueTier);
  return Math.max(band.minWage, Math.min(band.maxWage, Math.round(wage)));
}
