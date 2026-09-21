import { resolveRandom } from "@/lib/wheel-engine/spin-resolver";
import { estimateAppsRatio } from "@/lib/club-fit";
import {
  MAX_INBOUND_OFFERS,
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  computeClubTransferFee,
  computeEffectivePositionOvr,
  computeMandatoryBuyout,
  computeMarketValue,
  computePositionValueSnapshot,
  contractCoversRemainingCareer,
  expectedAppsAtClub,
  isDistressSale,
  proposeContractYears,
  proposeWageAnnual,
  randomizeWageAnnual,
  seasonsLeftInCareer,
  wantsRenewal,
} from "@/lib/transfer-economy";
import type {
  ClubMarketInfo,
  ContractOfferCard,
  GenerateTransferMarketParams,
  ShortlistClubCard,
  TransferMarketResult,
} from "./transfer-market-types";
import {
  buildOfferCard,
  reasonForMove,
  scoreClubInterest,
  pickInboundClubs,
} from "./transfer-market-scoring";
export { buildOfferCard, reasonForMove } from "./transfer-market-scoring";

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
  const randomSource = params.randomSource ?? resolveRandom;
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

  function quoteWage(club: ClubMarketInfo, proposedWage: number): number {
    return randomizeWageAnnual({
      proposedWage,
      prestige: club.prestige,
      leagueTier: club.leagueTier,
      randomSource: params.wageRandomSource
        ? () => params.wageRandomSource?.(club.id) ?? randomSource()
        : randomSource,
    });
  }

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

  if (
    !unemployed &&
    currentClub &&
    !contractCoversRemainingCareer(currentAge, retireAge, contractYearsRemaining)
  ) {
    const renewYears = proposeContractYears({
      currentAge,
      retireAge,
      matchRating,
      isRenewal: true,
    });
    const renewWage = quoteWage(currentClub, proposeWageAnnual({
      ovr: effPositionOvr,
      age: currentAge,
      currentWage: currentWageAnnual,
      prestige: currentClubPrestige,
      leagueTier: currentClubLeagueTier,
      matchRating,
      stepUpPrestige: 0,
    }));

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
    .map((club) => {
      const transferFee = computeClubTransferFee({
        marketValue,
        mandatoryBuyout,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        leaguePrestige: club.leaguePrestige,
        expectedAppsRatio: estimateAppsRatio(effPositionOvr, club.prestige),
        clubIdentity: club.id,
      });
      return {
        club,
        transferFee,
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
        transferFee,
        influenceScore,
        randomSource,
        }),
      };
    })
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
  const rollInbound = randomSource() < windowChance || distress || unemployed;
  if (rollInbound && scored.length > 0) {
    const take = Math.min(MAX_INBOUND_OFFERS, scored.length);
    const picked = pickInboundClubs(scored, take, randomSource);

    for (const club of picked) {
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      if (years <= 0) continue;
      const fee = computeClubTransferFee({
        marketValue,
        mandatoryBuyout,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        leaguePrestige: club.leaguePrestige,
        expectedAppsRatio: estimateAppsRatio(effPositionOvr, club.prestige),
        clubIdentity: club.id,
      });
      const wage = quoteWage(club, proposeWageAnnual({
        ovr: effPositionOvr,
        age: currentAge,
        currentWage: currentWageAnnual,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        matchRating,
        stepUpPrestige: club.prestige - effectivePrestige,
        acceptLowerWage: willingToMove || unemployed,
      }));
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
      const transferFee = computeClubTransferFee({
        marketValue,
        mandatoryBuyout,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        leaguePrestige: club.leaguePrestige,
        expectedAppsRatio: fit,
        clubIdentity: club.id,
      });
      const canAfford = clubCanAffordBuyout(club.prestige, club.leagueTier, transferFee);
      const canApproachGate = contractYearsRemaining <= 1 || unemployed;
      const years = proposeContractYears({ currentAge, retireAge, matchRating });
      const wage = quoteWage(club, proposeWageAnnual({
        ovr: effPositionOvr,
        age: currentAge,
        currentWage: currentWageAnnual,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        matchRating,
        stepUpPrestige: club.prestige - effectivePrestige,
        acceptLowerWage: true,
      }));
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
        transferFee,
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
          previewFee: contractYearsRemaining <= 0 || unemployed ? 0 : transferFee,
          mandatoryBuyout,
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
