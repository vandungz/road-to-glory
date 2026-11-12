import { estimateAppsRatio } from "@/lib/club-fit";
import {
  computeEffectivePositionOvr,
  computeScoutInterestScore,
  clubCanAffordBuyout,
  expectedAppsAtClub,
  leagueCompetitivenessScore,
} from "@/lib/transfer-economy";
import { resolveWeightedOutcome, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import type {
  ClubMarketInfo,
  ContractOfferCard,
  ContractOfferKind,
} from "./transfer-market-types";

export function reasonForMove(params: {
  matchRating: number;
  currentPrestige: number;
  destPrestige: number;
  distress: boolean;
  remaining: number;
}): string {
  if (params.distress) return "CLB muốn thanh lý hợp đồng";
  if (params.remaining <= 0) return "Cầu thủ tự do — ký mới";
  if (params.destPrestige > params.currentPrestige) return "Bước tiến sự nghiệp";
  if (params.destPrestige < params.currentPrestige) return "Tìm môi trường đá chính";
  if (params.matchRating >= 7.5) return "Phong độ cao thu hút CLB";
  return "Quan tâm chuyển nhượng";
}

export function scoreClubInterest(params: {
  club: ClubMarketInfo;
  currentOvr: number;
  position: string;
  currentStats?: Record<string, number>;
  potential?: number;
  playerNation?: string;
  currentPrestige: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  age: number;
  remaining: number;
  distress: boolean;
  willingToMove: boolean;
  transferFee: number;
  influenceScore?: number;
}): number {
  const {
    club,
    currentOvr,
    position,
    currentStats,
    potential,
    playerNation,
    currentPrestige,
    matchRating,
    goals,
    assists,
    cleanSheets,
    age,
    remaining,
    distress,
    willingToMove,
    transferFee,
    influenceScore,
  } = params;

  if (!clubCanAffordBuyout(club.prestige, club.leagueTier, transferFee)) {
    return -1;
  }

  const effOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
  const apps = expectedAppsAtClub(effOvr, club.prestige, club.leagueSize ?? 20);
  const fit = estimateAppsRatio(effOvr, club.prestige);
  const leagueQuality = leagueCompetitivenessScore(club.leaguePrestige, club.leagueTier);

  const scoutScore = computeScoutInterestScore({
    position,
    currentStats,
    currentOvr,
    potential,
    age,
    matchRating,
    goals,
    assists,
    cleanSheets,
    playerNation,
    clubLeagueCountry: club.leagueCountry ?? undefined,
    clubPrestige: club.prestige,
    influenceScore,
  });

  // League quality is deliberately independent from club prestige. This lets
  // a modest club in a strong league compete with a bigger club in a weaker
  // league without naming or hardcoding any country or team.
  let score = scoutScore * 0.4 + fit * 30 + Math.min(38, apps) * 0.4;
  score += (leagueQuality - 3) * 7;

  const prestigeDelta = club.prestige - currentPrestige;
  if (prestigeDelta > 0 && matchRating >= 7.0) score += 15 * prestigeDelta;
  if (prestigeDelta < 0 && (distress || matchRating < 6.5 || fit > 0.7)) score += 10;
  if (Math.abs(prestigeDelta) <= 1) score += 8;

  if (matchRating >= 7.5) score += 12;
  if (remaining <= 1) score += 8;
  if (remaining >= 3 && !distress && matchRating < 7.2) score *= 0.5;
  if (willingToMove) score += 12;

  return score;
}

export function pickInboundClubs(
  scored: Array<{ club: ClubMarketInfo; score: number }>,
  count: number,
  randomSource: RandomSource,
): ClubMarketInfo[] {
  const selected: ClubMarketInfo[] = [];
  const remaining = [...scored];

  while (selected.length < count && remaining.length > 0) {
    const selectedLeagueIds = new Set(selected.map((club) => club.leagueId));
    const selectedConfederations = new Set(
      selected.map((club) => club.confederation).filter(Boolean),
    );
    const selectedPrestiges = new Set(selected.map((club) => club.prestige));
    const buckets = new Map<number, Array<{ value: ClubMarketInfo; weight: number }>>();
    for (const { club, score } of remaining) {
      const leagueFactor = selectedLeagueIds.has(club.leagueId) ? 0.4 : 1;
      const confederationFactor = club.confederation && selectedConfederations.has(club.confederation)
        ? 0.8
        : 1;
      const bucket = buckets.get(club.prestige) ?? [];
      bucket.push({ value: club, weight: Math.exp(score / 22) * leagueFactor * confederationFactor });
      buckets.set(club.prestige, bucket);
    }
    // A prestige band's chance depends on its strongest available fit, not the number of seeded clubs.
    const bucket = resolveWeightedOutcome(Array.from(buckets, ([prestige, options]) => ({
      value: options,
      weight: Math.max(...options.map(({ weight }) => weight)) * (selectedPrestiges.has(prestige) ? 0.55 : 1),
    })), randomSource);
    const club = resolveWeightedOutcome(bucket, randomSource);
    selected.push(club);
    remaining.splice(remaining.findIndex((candidate) => candidate.club.id === club.id), 1);
  }

  return selected;
}

export function buildOfferCard(params: {
  kind: ContractOfferKind;
  club: ClubMarketInfo;
  fee: number;
  wage: number;
  years: number;
  ovr: number;
  reason: string;
  expectedLeagueApps?: number;
}): ContractOfferCard {
  const { club } = params;
  return {
    kind: params.kind,
    clubId: club.id,
    clubName: club.name,
    leagueId: club.leagueId,
    leagueName: club.leagueName ?? "Giải đấu",
    prestige: club.prestige,
    leagueTier: club.leagueTier,
    transferFee: params.fee,
    wageAnnual: params.wage,
    contractYears: params.years,
    expectedLeagueApps: params.expectedLeagueApps ?? expectedAppsAtClub(params.ovr, club.prestige, club.leagueSize ?? 20),
    reason: params.reason,
    canAffordBuyout: true,
  };
}

/** @deprecated Use generateTransferMarketService */
