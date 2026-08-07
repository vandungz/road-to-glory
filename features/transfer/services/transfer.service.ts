/**
 * Transfer market builder — SoT docs/core-transfer-design.md
 * Inbound ≤ 3, renewal, mandatoryBuyout (not player-discountable).
 */

import { resolveRandom, resolveRandomInt } from "@/lib/wheel-engine/spin-resolver";
import { estimateAppsRatio } from "@/lib/club-fit";
import {
  MAX_INBOUND_OFFERS,
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  computeEffectivePositionOvr,
  computeMandatoryBuyout,
  computeMarketValue,
  computeProactiveRenewalChance,
  computeScoutInterestScore,
  expectedAppsAtClub,
  isDistressSale,
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
  } = params;

  if (!clubCanAffordBuyout(club.prestige, club.leagueTier, mandatoryBuyout)) {
    return -1;
  }

  const effOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
  const apps = expectedAppsAtClub(effOvr, club.prestige, club.leagueSize ?? 20);
  const fit = estimateAppsRatio(effOvr, club.prestige);

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
  });

  let score = scoutScore * 0.4 + fit * 30 + Math.min(38, apps) * 0.4;

  const prestigeDelta = club.prestige - currentPrestige;
  if (prestigeDelta > 0 && matchRating >= 7.0) score += 15 * prestigeDelta;
  if (prestigeDelta < 0 && (distress || matchRating < 6.5 || fit > 0.7)) score += 10;
  if (Math.abs(prestigeDelta) <= 1) score += 8;

  if (matchRating >= 7.5) score += 12;
  if (remaining <= 1) score += 8;
  if (remaining >= 3 && !distress && matchRating < 7.2) score *= 0.5;
  if (willingToMove) score += 12;

  score += resolveRandom() * 6;
  return score;
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
  } = params;

  // SoT §7.10 — club evaluates by position-specific ability (effPositionOvr §12.1)
  const effPositionOvr = computeEffectivePositionOvr(params.position, params.currentStats, currentOvr);

  const unemployed = isUnemployed || !currentClubId;
  const seasonsLeft = seasonsLeftInCareer(currentAge, retireAge);
  const emptyContract = {
    yearsRemaining: contractYearsRemaining,
    yearsTotal: contractYearsTotal,
    currentWageAnnual,
    marketValue: 0,
    seasonsLeftInCareer: seasonsLeft,
  };

  if (seasonsLeft <= 0) {
    return {
      hasWindow: false,
      marketValue: 0,
      mandatoryBuyout: 0,
      isUnemployedMarket: unemployed,
      contract: emptyContract,
      renewal: null,
      inbound: [],
      shortlist: [],
    };
  }

  const marketValue = computeMarketValue({
    ovr: currentOvr,
    age: currentAge,
    matchRating,
    contractYearsRemaining,
  });
  const mandatoryBuyout = computeMandatoryBuyout(marketValue, contractYearsRemaining);
  const effectivePrestige = unemployed ? 2 : currentClubPrestige;
  const distress = unemployed
    ? false
    : isDistressSale(matchRating, estimateAppsRatio(currentOvr, effectivePrestige));
  const appsRatioCurrent = unemployed
    ? 0
    : estimateAppsRatio(currentOvr, effectivePrestige);

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
      ovr: currentOvr,
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
        ovr: currentOvr,
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
        ovr: currentOvr,
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
      }),
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  let windowChance = unemployed ? 0.35 : 0.22;
  if (matchRating >= 7.5) windowChance += 0.18;
  if (matchRating < 6.3) windowChance += 0.12;
  const expectedPrestige = Math.min(5, Math.max(1, Math.round((currentOvr - 50) / 8)));
  if (expectedPrestige > effectivePrestige) windowChance += 0.14;
  if (contractYearsRemaining <= 1) windowChance += 0.1;
  if (contractYearsRemaining >= 3 && !distress) windowChance -= 0.08;
  if (willingToMove || unemployed) windowChance += 0.1;
  windowChance = Math.min(0.55, Math.max(0.08, windowChance));

  const inbound: ContractOfferCard[] = [];
  const rollInbound = resolveRandom() < windowChance || distress || unemployed;
  if (rollInbound && scored.length > 0) {
    const take = Math.min(MAX_INBOUND_OFFERS, scored.length);
    const pool = scored.slice(0, Math.min(8, scored.length));
    const picked: ClubMarketInfo[] = [];
    const temp = [...pool];
    while (picked.length < take && temp.length > 0) {
      const idx = resolveRandomInt(0, Math.min(2, temp.length - 1));
      picked.push(temp[idx].club);
      temp.splice(idx, 1);
    }

    for (const club of picked) {
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      if (years <= 0) continue;
      const fee = mandatoryBuyout;
      const wage = proposeWageAnnual({
        ovr: currentOvr,
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
          ovr: currentOvr,
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
      const apps = expectedAppsAtClub(currentOvr, club.prestige, club.leagueSize ?? 20);
      const fit = estimateAppsRatio(currentOvr, club.prestige);
      const canAfford = clubCanAffordBuyout(club.prestige, club.leagueTier, mandatoryBuyout);
      const canApproachGate = contractYearsRemaining <= 1 || unemployed;
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      const wage = proposeWageAnnual({
        ovr: currentOvr,
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
      return {
        club,
        apps,
        fit,
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
    .sort((a, b) => b.fit - a.fit || b.apps - a.apps)
    .slice(0, 8)
    .map((x) => x.card);

  return {
    hasWindow: true,
    marketValue,
    mandatoryBuyout,
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
      ovr: params.currentOvr,
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
    ovr: params.currentOvr,
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
      ovr: params.currentOvr,
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
