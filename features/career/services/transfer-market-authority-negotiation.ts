import { estimateAppsRatio } from "@/lib/club-fit";
import {
  computeEffectivePositionOvr,
  computeMandatoryBuyout,
  computeClubTransferFee,
  applyTransferFeeDealChance,
  computeMarketValue,
  expectedAppsAtClub,
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  contractCoversRemainingCareer,
  proposeContractYears,
  proposeWageAnnual,
  randomizeWageAnnual,
} from "@/lib/transfer-economy";
import { secureRandom } from "@/lib/secure-random";
import {
  resolveApproachService,
  resolveProactiveRenewalService,
  type ClubMarketInfo,
  type GenerateTransferMarketParams,
  type ShortlistClubCard,
} from "@/features/transfer/services/transfer.service";
import type { ResolveTransferNegotiationInput } from "@/features/career/contracts/transfer-market.contract";
import { type AuthorityContext, type NegotiationResult } from "./transfer-market-authority-context";
export function buildShortlist(params: GenerateTransferMarketParams): ShortlistClubCard[] {
  const unemployed = Boolean(params.isUnemployed || !params.currentClubId);
  const effectiveOvr = computeEffectivePositionOvr(
    params.position,
    params.currentStats,
    params.currentOvr,
  );
  const marketValue = computeMarketValue({
    ovr: params.currentOvr,
    age: params.currentAge,
    matchRating: params.matchRating,
    contractYearsRemaining: params.contractYearsRemaining,
    position: params.position,
    currentStats: params.currentStats,
  });
  const mandatoryBuyout = computeMandatoryBuyout(
    marketValue,
    params.contractYearsRemaining,
  );
  const currentPrestige = unemployed ? 2 : params.currentClubPrestige;
  const canApproachGate = params.contractYearsRemaining <= 1 || unemployed;
  const eligible = params.clubs
    .filter((club) => club.id !== params.currentClubId)
    .sort((left, right) => right.prestige - left.prestige || left.name.localeCompare(right.name));

  function quoteWage(club: ClubMarketInfo, proposedWage: number): number {
    return randomizeWageAnnual({
      proposedWage,
      prestige: club.prestige,
      leagueTier: club.leagueTier,
      randomSource: params.wageRandomSource
        ? () => params.wageRandomSource?.(club.id) ?? params.randomSource?.() ?? 0.5
        : params.randomSource,
    });
  }

  return eligible.map((club) => {
    const expectedApps = expectedAppsAtClub(effectiveOvr, club.prestige, club.leagueSize ?? 20);
    const fitRatio = estimateAppsRatio(effectiveOvr, club.prestige);
    const transferFee = computeClubTransferFee({
      marketValue,
      mandatoryBuyout,
      prestige: club.prestige,
      leagueTier: club.leagueTier,
      leaguePrestige: club.leaguePrestige,
      expectedAppsRatio: fitRatio,
      clubIdentity: club.id,
    });
    const canAfford = clubCanAffordBuyout(
      club.prestige,
      club.leagueTier,
      transferFee,
    );
    const years = proposeContractYears({
      currentAge: params.currentAge,
      retireAge: params.retireAge,
      matchRating: params.matchRating,
    });
    const wage = quoteWage(club, proposeWageAnnual({
      ovr: effectiveOvr,
      age: params.currentAge,
      currentWage: params.currentWageAnnual,
      prestige: club.prestige,
      leagueTier: club.leagueTier,
      matchRating: params.matchRating,
      stepUpPrestige: club.prestige - currentPrestige,
      acceptLowerWage: true,
    }));
    const acceptChance =
      canApproachGate && canAfford && years > 0
        ? computeApproachAcceptChance({
            ovr: params.currentOvr,
            effPositionOvr: effectiveOvr,
            age: params.currentAge,
            matchRating: params.matchRating,
            destPrestige: club.prestige,
            destLeagueTier: club.leagueTier,
            expectedAppsRatio: fitRatio,
            influenceScore: params.influenceScore,
          })
        : null;

    let blockReason: string | null = null;
    if (!canApproachGate) {
      blockReason = "Chỉ chủ động ngỏ lời khi còn ≤1 năm HĐ hoặc hết hạn";
    } else if (!canAfford) {
      blockReason = "Phí phá HĐ vượt ngân sách CLB — không thể tự giảm";
    } else if (years <= 0) {
      blockReason = "Không còn mùa nghề để ký HĐ";
    }
    return {
      clubId: club.id,
      clubName: club.name,
      leagueId: club.leagueId,
      leagueName: club.leagueName ?? "Giải đấu",
      prestige: club.prestige,
      leagueTier: club.leagueTier,
      expectedLeagueApps: expectedApps,
      canApproach: Boolean(canApproachGate && canAfford && years > 0),
      canAffordBuyout: canAfford,
      previewFee: params.contractYearsRemaining <= 0 || unemployed ? 0 : transferFee,
      mandatoryBuyout,
      previewWage: wage,
      previewYears: years,
      blockReason,
      acceptChance,
    };
  });
}

function rejected(acceptChance: number, rejectReason: string): NegotiationResult {
  return { accepted: false, acceptChance, rejectReason };
}

export function resolveNegotiation(
  context: AuthorityContext,
  input: ResolveTransferNegotiationInput,
): NegotiationResult {
  const { params, currentClub, currentClubId } = context;
  if (input.kind === "approach") {
    const target = input.clubId
      ? buildShortlist(params).find((club) => club.clubId === input.clubId)
      : null;
    if (!target) return rejected(0, "CLB đích không tồn tại trong danh sách hiện tại");
    if (!target.canApproach || target.acceptChance === null) {
      return rejected(target.acceptChance ?? 0, target.blockReason ?? "CLB chưa thể nhận đề nghị");
    }
    return resolveApproachService({
      clubId: target.clubId,
      clubName: target.clubName,
      leagueId: target.leagueId,
      leagueName: target.leagueName,
      prestige: target.prestige,
      leagueTier: target.leagueTier,
      previewFee: target.previewFee,
      previewWage: target.previewWage,
      previewYears: target.previewYears,
      mandatoryBuyout: computeMandatoryBuyout(
        computeMarketValue({
          ovr: params.currentOvr,
          age: params.currentAge,
          matchRating: params.matchRating,
          contractYearsRemaining: params.contractYearsRemaining,
          position: params.position,
          currentStats: params.currentStats,
        }),
        params.contractYearsRemaining,
      ),
      feeOption: input.feeOption,
      clientAcceptChance: applyTransferFeeDealChance(target.acceptChance, input.feeOption),
      currentOvr: params.currentOvr,
      effPositionOvr: computeEffectivePositionOvr(params.position, params.currentStats, params.currentOvr),
      currentAge: params.currentAge,
      matchRating: params.matchRating,
      contractYearsRemaining: params.contractYearsRemaining,
      isUnemployed: params.isUnemployed,
      influenceScore: params.influenceScore,
      randomSource: secureRandom,
    });
  }

  if (!currentClub || !currentClubId) {
    return rejected(0, "Không có CLB hiện tại để đề nghị gia hạn");
  }
  const years = proposeContractYears({
    currentAge: params.currentAge,
    retireAge: params.retireAge,
    matchRating: params.matchRating,
    isRenewal: true,
  });
  if (contractCoversRemainingCareer(
    params.currentAge,
    params.retireAge,
    params.contractYearsRemaining,
  )) {
    return rejected(0, "Hợp đồng hiện tại đã đủ cho các mùa còn lại");
  }
  if (years <= 0) return rejected(0, "Không còn mùa nghề để ký HĐ");
  return resolveProactiveRenewalService({
    currentClubId,
    currentClubName: currentClub.name,
    currentClubLeagueId: currentClub.leagueId,
    currentClubLeagueName: currentClub.leagueName ?? "Giải đấu",
    currentClubPrestige: currentClub.prestige,
    currentClubLeagueTier: currentClub.leagueTier,
    currentOvr: params.currentOvr,
    currentStats: params.currentStats,
    position: params.position,
    currentAge: params.currentAge,
    retireAge: params.retireAge,
    matchRating: params.matchRating,
    goals: params.goals,
    assists: params.assists,
    cleanSheets: params.cleanSheets,
    contractYearsRemaining: params.contractYearsRemaining,
    currentWageAnnual: params.currentWageAnnual,
    // Renewal is also a two-stage flow: first the club decides whether to
    // renew, then the selected salary is negotiated during completion.
    wageOption: "standard",
    randomSource: secureRandom,
    wageRandomSource: currentClubId
      ? () => params.wageRandomSource?.(currentClubId) ?? secureRandom()
      : secureRandom,
  });
}

