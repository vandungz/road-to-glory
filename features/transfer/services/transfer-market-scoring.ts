import { estimateAppsRatio } from "@/lib/club-fit";
import {
  computeEffectivePositionOvr,
  computeScoutInterestScore,
  clubCanAffordBuyout,
  expectedAppsAtClub,
  leagueCompetitivenessScore,
} from "@/lib/transfer-economy";
import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
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
 randomize?: boolean;
  randomSource?: RandomSource;
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
    clubLeagueCountry: club.leagueName ?? "",
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

  if (params.randomize !== false) score += (params.randomSource ?? resolveRandom)() * 6;
 return score;
}

export function pickInboundClubs(
  scored: Array<{ club: ClubMarketInfo; score: number }>,
  count: number,
  randomSource: RandomSource = resolveRandom,
): ClubMarketInfo[] {
  const selected: ClubMarketInfo[] = [];
  const remaining = scored.slice(0, Math.min(14, scored.length));

  while (selected.length < count && remaining.length > 0) {
    const selectedLeagueIds = new Set(selected.map((club) => club.leagueId));
    const selectedConfederations = new Set(
      selected.map((club) => club.confederation).filter(Boolean),
    );
    const weights = remaining.map(({ club, score }) => {
      const leagueFactor = selectedLeagueIds.has(club.leagueId) ? 0.4 : 1;
      const confederationFactor = club.confederation && selectedConfederations.has(club.confederation)
        ? 0.8
        : 1;
      return Math.max(1, score) * leagueFactor * confederationFactor;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = randomSource() * totalWeight;
    let pickedIndex = 0;
    for (let index = 0; index < weights.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) {
        pickedIndex = index;
        break;
      }
    }
    selected.push(remaining[pickedIndex].club);
    remaining.splice(pickedIndex, 1);
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
    expectedLeagueApps: expectedAppsAtClub(params.ovr, club.prestige, club.leagueSize ?? 20),
    reason: params.reason,
    canAffordBuyout: true,
  };
}

/** @deprecated Use generateTransferMarketService */
