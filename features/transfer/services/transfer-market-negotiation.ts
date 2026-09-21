import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { estimateAppsRatio } from "@/lib/club-fit";
import {
  applyTransferFeeDealOption,
  applyTransferFeeDealChance,
  clampWageAnnual,
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  computeEffectivePositionOvr,
  getBuyingPowerBand,
  proposeContractYears,
  proposeWageAnnual,
  computeProactiveRenewalChance,
  randomizeWageAnnual,
} from "@/lib/transfer-economy";
import { applyWageDealChance, type WageDealOption } from "@/lib/salary-negotiation";
import type { TransferFeeDealOption } from "@/lib/transfer-economy";
import {
  buildOfferCard,
  reasonForMove,
  generateTransferMarketService,
  type TransferOfferResult,
} from "./transfer-market-generation";
import type { ClubMarketInfo, ContractOfferCard } from "./transfer-market-types";

export {
  buildOfferCard,
  reasonForMove,
} from "./transfer-market-generation";

export interface ResolveApproachParams {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  leagueSize?: number;
  previewFee: number;
  mandatoryBuyout?: number;
  previewWage: number;
  previewYears: number;
  feeOption?: TransferFeeDealOption;
  clientAcceptChance: number;
  currentOvr: number;
  effPositionOvr?: number; // SoT §7.10 — pass for accurate fit evaluation
  currentAge: number;
  matchRating: number;
  contractYearsRemaining: number;
  isUnemployed?: boolean;
  /** Must match whatever value produced `clientAcceptChance` in the shortlist step, or the drift-check below will spuriously reject. */
  influenceScore?: number;
  randomSource?: RandomSource;
}

export type ResolveApproachResult =
  | { accepted: true; acceptChance: number; offer: ContractOfferCard }
  | { accepted: false; acceptChance: number; rejectReason: string };

/** Resolve outbound approach: recompute chance, roll once via resolveRandom. */
export function resolveApproachService(params: ResolveApproachParams): ResolveApproachResult {
  const remaining = params.contractYearsRemaining;
  const unemployed = !!params.isUnemployed;
  if (remaining > 1 && !unemployed) {
    return {
      accepted: false,
      acceptChance: 0,
      rejectReason: "Chỉ chủ động ngỏ lời khi còn ≤1 năm HĐ hoặc hết hạn",
    };
  }

  const feeOption = params.feeOption ?? "standard";
  const feeAsk = remaining <= 0 || unemployed ? 0 : params.previewFee;
  const negotiatedFee = remaining <= 0 || unemployed
    ? 0
    : Math.min(
        getBuyingPowerBand(params.prestige, params.leagueTier).maxFee,
        applyTransferFeeDealOption(feeAsk, params.mandatoryBuyout ?? 0, feeOption),
      );
  if (negotiatedFee > 0 && !clubCanAffordBuyout(params.prestige, params.leagueTier, negotiatedFee)) {
    return {
      accepted: false,
      acceptChance: 0,
      rejectReason: "Phí phá HĐ vượt ngân sách CLB — không thể tự giảm",
    };
  }

  if (params.previewYears <= 0) {
    return {
      accepted: false,
      acceptChance: 0,
      rejectReason: "Không còn mùa nghề để ký HĐ",
    };
  }

  const fit = estimateAppsRatio(params.effPositionOvr ?? params.currentOvr, params.prestige);
  const baseChance = computeApproachAcceptChance({
    ovr: params.currentOvr,
    effPositionOvr: params.effPositionOvr, // SoT §7.10
    age: params.currentAge,
    matchRating: params.matchRating,
    destPrestige: params.prestige,
    destLeagueTier: params.leagueTier,
    expectedAppsRatio: fit,
    influenceScore: params.influenceScore,
  });

  // The approach decision is about the transfer fee. Salary is negotiated only
  // after this succeeds, in the final contract step.
  const acceptChance = applyTransferFeeDealChance(baseChance, feeOption);

  if (Math.abs(acceptChance - params.clientAcceptChance) > 0.02) {
    return {
      accepted: false,
      acceptChance,
      rejectReason: "Xác suất đã đổi — mở lại cửa sổ chuyển nhượng",
    };
  }

  const accepted = (params.randomSource ?? resolveRandom)() < acceptChance;
  if (!accepted) {
    return {
      accepted: false,
      acceptChance,
      rejectReason: "CLB chọn phương án khác",
    };
  }

  const kind = remaining <= 0 || unemployed ? "free_agent" : "transfer";
  const finalWage = clampWageAnnual(
    Math.max(10, Math.round(params.previewWage)),
    params.prestige,
    params.leagueTier,
  );

  const club: ClubMarketInfo = {
    id: params.clubId,
    name: params.clubName,
    leagueId: params.leagueId,
    leagueName: params.leagueName,
    prestige: params.prestige,
    leagueTier: params.leagueTier,
    leagueSize: params.leagueSize ?? 20,
  };

  return {
    accepted: true,
    acceptChance,
    offer: buildOfferCard({
      kind,
      club,
      fee: kind === "free_agent" ? 0 : negotiatedFee,
      wage: finalWage,
      years: params.previewYears,
      ovr: params.effPositionOvr ?? params.currentOvr,
      reason: unemployed
        ? "Cầu thủ tự do — ký mới"
        : reasonForMove({
            matchRating: params.matchRating,
            currentPrestige: params.prestige,
            destPrestige: params.prestige,
            distress: false,
            remaining,
          }),
    }),
  };
}

export interface ResolveProactiveRenewalParams {
  currentClubId: string;
  currentClubName: string;
  currentClubLeagueId: string;
  currentClubLeagueName: string;
  currentClubPrestige: number;
  currentClubLeagueTier: number;
  currentOvr: number;
  currentStats?: Record<string, number>;
  position: string;
  currentAge: number;
  retireAge: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  contractYearsRemaining: number;
  currentWageAnnual: number;
  wageOption?: WageDealOption;
  randomSource?: RandomSource;
  /** Stable quote source matching the renewal shown in the market snapshot. */
  wageRandomSource?: RandomSource;
}

export type ResolveProactiveRenewalResult =
  | { accepted: true; acceptChance: number; offer: ContractOfferCard }
  | { accepted: false; acceptChance: number; rejectReason: string };

export function resolveProactiveRenewalService(
  params: ResolveProactiveRenewalParams,
): ResolveProactiveRenewalResult {
  const effPositionOvr = computeEffectivePositionOvr(params.position, params.currentStats, params.currentOvr);
  const baseChance = computeProactiveRenewalChance({
    position: params.position,
    currentStats: params.currentStats,
    currentOvr: params.currentOvr,
    matchRating: params.matchRating,
    goals: params.goals,
    assists: params.assists,
    cleanSheets: params.cleanSheets,
    clubPrestige: params.currentClubPrestige,
    contractYearsRemaining: params.contractYearsRemaining,
  });

  const finalChance = applyWageDealChance(baseChance, params.wageOption ?? "standard");
  const accepted = (params.randomSource ?? resolveRandom)() < finalChance;

  if (!accepted) {
    return {
      accepted: false,
      acceptChance: finalChance,
      rejectReason: "Ban lãnh đạo CLB chưa muốn gia hạn hợp đồng lúc này",
    };
  }

  const years = proposeContractYears({
    currentAge: params.currentAge,
    retireAge: params.retireAge,
    matchRating: params.matchRating,
    isRenewal: true,
  });

  let wage = randomizeWageAnnual({
    proposedWage: proposeWageAnnual({
      ovr: effPositionOvr,
      age: params.currentAge,
      currentWage: params.currentWageAnnual,
      prestige: params.currentClubPrestige,
      leagueTier: params.currentClubLeagueTier,
      matchRating: params.matchRating,
      stepUpPrestige: 0,
    }),
    prestige: params.currentClubPrestige,
    leagueTier: params.currentClubLeagueTier,
    randomSource: params.wageRandomSource ?? params.randomSource,
  });

  if (params.wageOption === "lower") wage = Math.round(wage * 0.82);
  else if (params.wageOption === "higher") wage = Math.round(wage * 1.15);
  wage = clampWageAnnual(wage, params.currentClubPrestige, params.currentClubLeagueTier);

  const club: ClubMarketInfo = {
    id: params.currentClubId,
    name: params.currentClubName,
    leagueId: params.currentClubLeagueId,
    leagueName: params.currentClubLeagueName,
    prestige: params.currentClubPrestige,
    leagueTier: params.currentClubLeagueTier,
  };

  return {
    accepted: true,
    acceptChance: finalChance,
    offer: buildOfferCard({
      kind: "renewal",
      club,
      fee: 0,
      wage,
      years,
      ovr: effPositionOvr,
      reason: "Gia hạn chủ động — CLB đồng ý",
    }),
  };
}

/** Backward-compatible thin wrapper for older callers. */
export function generateTransferOfferService(params: {
  currentClubId: string;
  currentClubPrestige: number;
  currentOvr: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  position: string;
  clubs: Array<{
    id: string;
    name: string;
    leagueId: string;
    prestige: number;
    leagueName?: string | null;
  }>;
}): TransferOfferResult {
  const market = generateTransferMarketService({
    currentClubId: params.currentClubId,
    currentClubPrestige: params.currentClubPrestige,
    currentClubLeagueTier: 1,
    currentOvr: params.currentOvr,
    currentAge: 24,
    retireAge: 36,
    matchRating: params.matchRating,
    goals: params.goals,
    assists: params.assists,
    cleanSheets: params.cleanSheets,
    position: params.position,
    contractYearsRemaining: 1,
    contractYearsTotal: 3,
    currentWageAnnual: 500,
    clubs: params.clubs.map((c) => ({ ...c, leagueTier: 1 })),
  });
  const offer = market.inbound[0];
  if (!offer) return { hasOffer: false, offer: null };
  return {
    hasOffer: true,
    offer: {
      clubId: offer.clubId,
      clubName: offer.clubName,
      leagueId: offer.leagueId,
      leagueName: offer.leagueName,
    },
  };
}

