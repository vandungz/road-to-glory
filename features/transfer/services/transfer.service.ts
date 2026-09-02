/**
 * Transfer market builder — SoT docs/core-transfer-design.md
 * Inbound ≤ 3, renewal, mandatoryBuyout (not player-discountable).
 */

import { resolveRandom } from "@/lib/wheel-engine/spin-resolver";
import { estimateAppsRatio } from "@/lib/club-fit";
import {
  MAX_INBOUND_OFFERS,
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  computeEffectivePositionOvr,
  computeMandatoryBuyout,
  computeMarketValue,
  computePositionValueSnapshot,
  computeProactiveRenewalChance,
  computeScoutInterestScore,
  expectedAppsAtClub,
  isDistressSale,
  leagueCompetitivenessScore,
  proposeContractYears,
  proposeWageAnnual,
  seasonsLeftInCareer,
  wantsRenewal,
} from "@/lib/transfer-economy";
import { applyWageDealChance, WageDealOption } from "@/lib/salary-negotiation";

export interface ClubMarketInfo {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  leagueName?: string | null;
  leagueTier: number;
  /** League quality is separate from the club's own prestige. */
  leaguePrestige?: number;
  leagueCountry?: string | null;
  confederation?: string | null;
  leagueSize?: number;
}

export type ContractOfferKind = "transfer" | "free_agent" | "renewal";

export interface ContractOfferCard {
  kind: ContractOfferKind;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  transferFee: number;
  wageAnnual: number;
  contractYears: number;
  expectedLeagueApps: number;
  reason: string;
  canAffordBuyout: boolean;
}

export interface ShortlistClubCard {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  expectedLeagueApps: number;
  canApproach: boolean;
  canAffordBuyout: boolean;
  previewFee: number;
  previewWage: number;
  previewYears: number;
  blockReason: string | null;
  /** 0–1; only meaningful when canApproach. UI shows as %. */
  acceptChance: number | null;
}

export interface TransferMarketResult {
  hasWindow: boolean;
  marketValue: number;
  mandatoryBuyout: number;
  valuation: {
    positionWeightedRating: number;
    effectivePositionOvr: number;
  };
  isUnemployedMarket: boolean;
  contract: {
    yearsRemaining: number;
    yearsTotal: number;
    currentWageAnnual: number;
    marketValue: number;
    seasonsLeftInCareer: number;
  };
  renewal: ContractOfferCard | null;
  inbound: ContractOfferCard[];
  shortlist: ShortlistClubCard[];
}

export interface GenerateTransferMarketParams {
  currentClubId: string | null;
  currentClubPrestige: number;
  currentClubLeagueTier: number;
  currentClubLeagueSize?: number;
  currentOvr: number;
  currentStats?: Record<string, number>;
  potential?: number;
  playerNation?: string;
  currentAge: number;
  retireAge: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  position: string;
  contractYearsRemaining: number;
  contractYearsTotal: number;
  currentWageAnnual: number;
  willingToMove?: boolean;
  isUnemployed?: boolean;
  clubs: ClubMarketInfo[];
  /** Player Influence Score (docs/core-currency-shop-design.md §5) — optional small top-up on scout/approach. */
  influenceScore?: number;
}

function reasonForMove(params: {
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

function scoreClubInterest(params: {
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
  mandatoryBuyout: number;
  influenceScore?: number;
  randomize?: boolean;
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
    mandatoryBuyout,
    influenceScore,
  } = params;

  if (!clubCanAffordBuyout(club.prestige, club.leagueTier, mandatoryBuyout)) {
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

  if (params.randomize !== false) score += resolveRandom() * 6;
  return score;
}

function pickInboundClubs(
  scored: Array<{ club: ClubMarketInfo; score: number }>,
  count: number,
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
    let roll = resolveRandom() * totalWeight;
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

function buildOfferCard(params: {
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
export type TransferOfferResult = {
  hasOffer: boolean;
  offer: {
    clubId: string;
    clubName: string;
    leagueId: string;
    leagueName: string;
  } | null;
};

export function generateTransferMarketService(
  params: GenerateTransferMarketParams,
): TransferMarketResult {
  const {
    currentClubId,
    currentClubPrestige,
    currentClubLeagueTier,
    currentClubLeagueSize = 20,
    currentOvr,
    currentAge,
    retireAge,
    matchRating,
    contractYearsRemaining,
    contractYearsTotal,
    currentWageAnnual,
    willingToMove = false,
    isUnemployed = false,
    clubs,
    influenceScore,
  } = params;

  // SoT §7.10 — club evaluates by position-specific ability (effPositionOvr §12.1)
  const effPositionOvr = computeEffectivePositionOvr(params.position, params.currentStats, currentOvr);

  const unemployed = isUnemployed || !currentClubId;
  const seasonsLeft = seasonsLeftInCareer(currentAge, retireAge);
  const valuation = computePositionValueSnapshot(params.position, params.currentStats, currentOvr);
  const marketValue = computeMarketValue({
    ovr: currentOvr,
    age: currentAge,
    matchRating,
    contractYearsRemaining,
    position: params.position,
    currentStats: params.currentStats,
  });
  const mandatoryBuyout = computeMandatoryBuyout(marketValue, contractYearsRemaining);
  const emptyContract = {
    yearsRemaining: contractYearsRemaining,
    yearsTotal: contractYearsTotal,
    currentWageAnnual,
    marketValue,
    seasonsLeftInCareer: seasonsLeft,
  };

  if (seasonsLeft <= 0) {
    return {
      hasWindow: false,
      marketValue,
      mandatoryBuyout: 0,
      valuation,
      isUnemployedMarket: unemployed,
      contract: emptyContract,
      renewal: null,
      inbound: [],
      shortlist: [],
    };
  }

  const effectivePrestige = unemployed ? 2 : currentClubPrestige;
  const distress = unemployed
    ? false
    : isDistressSale(matchRating, estimateAppsRatio(effPositionOvr, effectivePrestige));
  const appsRatioCurrent = unemployed
    ? 0
    : estimateAppsRatio(effPositionOvr, effectivePrestige);

  const contractSnap = {
    yearsRemaining: contractYearsRemaining,
    yearsTotal: contractYearsTotal,
    currentWageAnnual,
    marketValue,
    seasonsLeftInCareer: seasonsLeft,
  };

  // --- Renewal (not when unemployed / no current club) ---
  let renewal: ContractOfferCard | null = null;
  const currentClub =
    currentClubId != null
      ? clubs.find((c) => c.id === currentClubId) ?? {
          id: currentClubId,
          name: "Current",
          leagueId: "",
          prestige: currentClubPrestige,
          leagueTier: currentClubLeagueTier,
          leagueSize: currentClubLeagueSize,
          leagueName: "",
        }
      : null;

  if (!unemployed && currentClub) {
    const renewYears = proposeContractYears({
      currentAge,
      retireAge,
      matchRating,
      isRenewal: true,
    });
    const renewWage = proposeWageAnnual({
      ovr: effPositionOvr,
      age: currentAge,
      currentWage: currentWageAnnual,
      prestige: currentClubPrestige,
      leagueTier: currentClubLeagueTier,
      matchRating,
      stepUpPrestige: 0,
    });

    if (
      renewYears > 0 &&
      wantsRenewal({
        seasonsLeft,
        contractYearsRemaining,
        appsRatio: appsRatioCurrent,
        matchRating,
        ovr: effPositionOvr,
        clubPrestige: currentClubPrestige,
        proposedWage: renewWage,
        leagueTier: currentClubLeagueTier,
        isDistressSale: distress,
      })
    ) {
      renewal = buildOfferCard({
        kind: "renewal",
        club: { ...currentClub, prestige: currentClubPrestige, leagueTier: currentClubLeagueTier },
        fee: 0,
        wage: renewWage,
        years: renewYears,
        ovr: effPositionOvr,
        reason: contractYearsRemaining <= 1 ? "Gia hạn hợp đồng" : "Gia hạn sớm — giữ chân",
      });
    }
  }

  // --- Inbound ---
  const eligible = clubs.filter((c) => (currentClubId ? c.id !== currentClubId : true));
  const scored = eligible
    .map((club) => ({
      club,
      score: scoreClubInterest({
        club,
        currentOvr,
        position: params.position,
        currentStats: params.currentStats,
        potential: params.potential,
        playerNation: params.playerNation,
        currentPrestige: effectivePrestige,
        matchRating,
        goals: params.goals,
        assists: params.assists,
        cleanSheets: params.cleanSheets,
        age: currentAge,
        remaining: contractYearsRemaining,
        distress,
        willingToMove: willingToMove || unemployed,
        mandatoryBuyout,
        influenceScore,
      }),
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  let windowChance = unemployed ? 0.35 : 0.22;
  if (matchRating >= 7.5) windowChance += 0.18;
  if (matchRating < 6.3) windowChance += 0.12;
  const expectedPrestige = Math.min(5, Math.max(1, Math.round((effPositionOvr - 50) / 8)));
  if (expectedPrestige > effectivePrestige) windowChance += 0.14;
  if (contractYearsRemaining <= 1) windowChance += 0.1;
  if (contractYearsRemaining >= 3 && !distress) windowChance -= 0.08;
  if (willingToMove || unemployed) windowChance += 0.1;
  windowChance = Math.min(0.55, Math.max(0.08, windowChance));

  const inbound: ContractOfferCard[] = [];
  const rollInbound = resolveRandom() < windowChance || distress || unemployed;
  if (rollInbound && scored.length > 0) {
    const take = Math.min(MAX_INBOUND_OFFERS, scored.length);
    const picked = pickInboundClubs(scored, take);

    for (const club of picked) {
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      if (years <= 0) continue;
      const fee = mandatoryBuyout;
      const wage = proposeWageAnnual({
        ovr: effPositionOvr,
        age: currentAge,
        currentWage: currentWageAnnual,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        matchRating,
        stepUpPrestige: club.prestige - effectivePrestige,
        acceptLowerWage: willingToMove || unemployed,
      });
      const kind = contractYearsRemaining <= 0 || unemployed ? "free_agent" : "transfer";
      inbound.push(
        buildOfferCard({
          kind,
          club,
          fee: kind === "free_agent" ? 0 : fee,
          wage,
          years,
          ovr: effPositionOvr,
          reason: unemployed
            ? "Cầu thủ tự do — tìm CLB mới"
            : reasonForMove({
                matchRating,
                currentPrestige: effectivePrestige,
                destPrestige: club.prestige,
                distress,
                remaining: contractYearsRemaining,
              }),
        }),
      );
    }
  }

  // --- Shortlist (fit-oriented, up to 8) ---
  const shortlist: ShortlistClubCard[] = eligible
    .map((club) => {
      const apps = expectedAppsAtClub(effPositionOvr, club.prestige, club.leagueSize ?? 20);
      const fit = estimateAppsRatio(effPositionOvr, club.prestige);
      const canAfford = clubCanAffordBuyout(club.prestige, club.leagueTier, mandatoryBuyout);
      const canApproachGate = contractYearsRemaining <= 1 || unemployed;
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      const wage = proposeWageAnnual({
        ovr: effPositionOvr,
        age: currentAge,
        currentWage: currentWageAnnual,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        matchRating,
        stepUpPrestige: club.prestige - effectivePrestige,
        acceptLowerWage: true,
      });
      const acceptChance =
        canApproachGate && canAfford && years > 0
          ? computeApproachAcceptChance({
              ovr: currentOvr,
              effPositionOvr, // SoT §7.10
              age: currentAge,
              matchRating,
              destPrestige: club.prestige,
              destLeagueTier: club.leagueTier,
              expectedAppsRatio: fit,
              influenceScore,
            })
          : null;
      let blockReason: string | null = null;
      if (!canApproachGate) {
        blockReason = "Chỉ chủ động ngỏ lời khi còn ≤1 năm HĐ hoặc hết hạn";
      } else if (!canAfford) {
        blockReason = `Phí phá HĐ vượt ngân sách CLB — không thể tự giảm`;
      } else if (years <= 0) {
        blockReason = "Không còn mùa nghề để ký HĐ";
      }
      const score = scoreClubInterest({
        club,
        currentOvr,
        position: params.position,
        currentStats: params.currentStats,
        potential: params.potential,
        playerNation: params.playerNation,
        currentPrestige: effectivePrestige,
        matchRating,
        goals: params.goals,
        assists: params.assists,
        cleanSheets: params.cleanSheets,
        age: currentAge,
        remaining: contractYearsRemaining,
        distress,
        willingToMove: willingToMove || unemployed,
        mandatoryBuyout,
        influenceScore,
        randomize: false,
      });
      return {
        club,
        apps,
        fit,
        score,
        card: {
          clubId: club.id,
          clubName: club.name,
          leagueId: club.leagueId,
          leagueName: club.leagueName ?? "Giải đấu",
          prestige: club.prestige,
          leagueTier: club.leagueTier,
          expectedLeagueApps: apps,
          canApproach: canApproachGate && canAfford && years > 0,
          canAffordBuyout: canAfford,
          previewFee: contractYearsRemaining <= 0 || unemployed ? 0 : mandatoryBuyout,
          previewWage: wage,
          previewYears: years,
          blockReason,
          acceptChance,
        } satisfies ShortlistClubCard,
      };
    })
    .sort((a, b) => b.score - a.score || b.fit - a.fit || b.apps - a.apps)
    .slice(0, 8)
    .map((x) => x.card);

  return {
    hasWindow: true,
    marketValue,
    mandatoryBuyout,
    valuation,
    isUnemployedMarket: unemployed,
    contract: contractSnap,
    renewal,
    inbound,
    shortlist,
  };
}

export interface ResolveApproachParams {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  leagueSize?: number;
  previewFee: number;
  previewWage: number;
  previewYears: number;
  wageOption?: WageDealOption; // SoT §13 — wage deal adjustment ("lower", "standard", "higher")
  clientAcceptChance: number;
  currentOvr: number;
  effPositionOvr?: number; // SoT §7.10 — pass for accurate fit evaluation
  currentAge: number;
  matchRating: number;
  contractYearsRemaining: number;
  isUnemployed?: boolean;
  /** Must match whatever value produced `clientAcceptChance` in the shortlist step, or the drift-check below will spuriously reject. */
  influenceScore?: number;
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

  const feeAsk = remaining <= 0 || unemployed ? 0 : params.previewFee;
  if (feeAsk > 0 && !clubCanAffordBuyout(params.prestige, params.leagueTier, feeAsk)) {
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

  // Apply wage deal modifier (+0.14 for lower, -0.14 for higher)
  const acceptChance = applyWageDealChance(baseChance, params.wageOption ?? "standard");

  if (Math.abs(acceptChance - params.clientAcceptChance) > 0.02) {
    return {
      accepted: false,
      acceptChance,
      rejectReason: "Xác suất đã đổi — mở lại cửa sổ chuyển nhượng",
    };
  }

  const accepted = resolveRandom() < acceptChance;
  if (!accepted) {
    return {
      accepted: false,
      acceptChance,
      rejectReason: "CLB chọn phương án khác",
    };
  }

  const kind = remaining <= 0 || unemployed ? "free_agent" : "transfer";
  const wageMul = params.wageOption === "lower" ? 0.8 : params.wageOption === "higher" ? 1.15 : 1.0;
  const finalWage = Math.max(10, Math.round(params.previewWage * wageMul));

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
      fee: kind === "free_agent" ? 0 : feeAsk,
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
  const accepted = resolveRandom() < finalChance;

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

  let wage = proposeWageAnnual({
    ovr: effPositionOvr,
    age: params.currentAge,
    currentWage: params.currentWageAnnual,
    prestige: params.currentClubPrestige,
    leagueTier: params.currentClubLeagueTier,
    matchRating: params.matchRating,
    stepUpPrestige: 0,
  });

  if (params.wageOption === "lower") wage = Math.round(wage * 0.82);
  else if (params.wageOption === "higher") wage = Math.round(wage * 1.15);

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
