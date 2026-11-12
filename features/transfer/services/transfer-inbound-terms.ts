import { estimateAppsRatio } from "@/lib/club-fit";
import { computeClubTransferFee, formMulFromRating, getBuyingPowerBand, leagueCompetitivenessScore } from "@/lib/transfer-economy";
import type { ClubMarketInfo, TransferSeasonForm } from "./transfer-market-types";

export function recentTransferForm(current: TransferSeasonForm, previous: Array<Partial<TransferSeasonForm> | null> = []): TransferSeasonForm {
  const currentWeight = 5 * Math.min(1, Math.max(0, (current.apps ?? 12) / 12));
  function average(metric: "matchRating" | "goals" | "assists" | "cleanSheets") {
    let sum = current[metric] * currentWeight;
    let weight = currentWeight;
    previous.slice(0, 2).forEach((season, index) => {
      const value = season?.[metric];
      if (typeof value !== "number" || !Number.isFinite(value) || season?.apps === 0) return;
      const sampleWeight = Math.min(1, (season?.apps ?? 12) / 12) * (3 - index);
      if (sampleWeight <= 0) return;
      sum += value * sampleWeight;
      weight += sampleWeight;
    });
    return weight > 0 ? sum / weight : current[metric];
  }

  return {
    matchRating: average("matchRating"),
    goals: average("goals"),
    assists: average("assists"),
    cleanSheets: average("cleanSheets"),
  };
}

export function quoteInboundTerms(params: {
  club: ClubMarketInfo;
  effectiveOvr: number;
  matchRating: number;
  marketValue: number;
  feeFloor: number;
  feeRoll: number;
  wageRoll: number;
}) {
  const { club, effectiveOvr, matchRating, marketValue, feeFloor, feeRoll, wageRoll } = params;
  const band = getBuyingPowerBand(club.prestige, club.leagueTier);
  const leagueQuality = leagueCompetitivenessScore(club.leaguePrestige, club.leagueTier);
  const form = Math.max(-2, Math.min(2, (matchRating - 6.8) * 2));
  const fit = estimateAppsRatio(effectiveOvr + form - (leagueQuality - 3), club.prestige);
  const fixtures = 2 * (Math.max(2, club.leagueSize ?? 20) - 1);
  const expectedLeagueApps = Math.max(1, Math.round(fixtures * fit));
  const ability = Math.min(1, Math.max(0, (effectiveOvr - 55) / 40));
  const wageShare = ability * (0.4 + fit * 0.6) * (0.7 + leagueQuality * 0.06);
  const wageTarget = (band.minWage + (band.maxWage - band.minWage) * wageShare) * formMulFromRating(matchRating);
  const wageAnnual = Math.max(band.minWage, Math.min(band.maxWage, Math.round(wageTarget * (0.88 + 0.24 * wageRoll))));
  const feeTarget = feeFloor > 0 ? computeClubTransferFee({
    marketValue,
    mandatoryBuyout: feeFloor,
    prestige: club.prestige,
    leagueTier: club.leagueTier,
    leaguePrestige: club.leaguePrestige,
    expectedAppsRatio: fit,
    clubIdentity: club.id,
  }) : 0;
  const transferFee = Math.min(band.maxFee, Math.max(feeFloor, Math.round(feeTarget * (0.88 + 0.24 * feeRoll))));

  return { transferFee, wageAnnual, expectedLeagueApps };
}
