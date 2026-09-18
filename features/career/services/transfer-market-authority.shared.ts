import { createHash } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
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
import type { WageDealOption } from "@/lib/salary-negotiation";
import {
  cancelledClubIdsFromWorkflow,
  failedWageOptionsFromWorkflow,
  loadTransferWorkflowState,
  type TransferWorkflowState,
} from "@/features/career/services/transfer-workflow-state.service";
import {
  resolveApproachService,
  resolveProactiveRenewalService,
  type ClubMarketInfo,
  type ContractOfferCard,
  type GenerateTransferMarketParams,
  type PendingTransferNegotiation,
  type ShortlistClubCard,
  type TransferMarketResult,
} from "@/features/transfer/services/transfer.service";
import type {
  GetTransferMarketInput,
  ResolveTransferNegotiationInput,
  SearchTransferClubsInput,
  SetTransferOfferSelectionInput,
} from "@/features/career/contracts/transfer-market.contract";

export type TransferAuthorityErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS"
  | "CLUB_NOT_FOUND"
  | "OFFER_NOT_FOUND";

export class TransferAuthorityError extends Error {
  constructor(public readonly code: TransferAuthorityErrorCode, message: string) {
    super(message);
    this.name = "TransferAuthorityError";
  }
}

const playerSelect = {
  id: true,
  revision: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  retireAge: true,
  position: true,
  nationality: true,
  peakOvr: true,
  statsTimeline: true,
  clubStints: true,
  currentWageAnnual: true,
  contractYearsTotal: true,
  contractYearsRemaining: true,
  marketValue: true,
  isUnemployed: true,
  influenceScore: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

const seasonSelect = {
  id: true,
  careerPlayerId: true,
  age: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

type AuthorityPlayer = Prisma.CareerPlayerGetPayload<{ select: typeof playerSelect }>;
type AuthoritySeason = Prisma.CareerSeasonGetPayload<{ select: typeof seasonSelect }>;
type Tx = Prisma.TransactionClient;

export type AuthorityContext = {
  player: AuthorityPlayer;
  season: AuthoritySeason;
  transferWorkflow: TransferWorkflowState;
  currentClubId: string | null;
  currentClub: ClubMarketInfo | null;
  params: GenerateTransferMarketParams;
};

type StoredNegotiationResult = {
  accepted: boolean;
  acceptChance: number;
  offer?: ContractOfferCard;
  rejectReason?: string;
};

export type TransferNegotiationResult =
  | { accepted: true; acceptChance: number; offer: ContractOfferCard; replayed: boolean }
  | { accepted: false; acceptChance: number; rejectReason: string; replayed: boolean };

export type NegotiationResult = Omit<
  Extract<TransferNegotiationResult, { accepted: true }>,
  "replayed"
> | Omit<Extract<TransferNegotiationResult, { accepted: false }>, "replayed">;

export type TransferNegotiationDto = TransferNegotiationResult;

function stableWageRandomSource(playerId: string, seasonId: string): (clubId: string) => number {
  return (clubId: string) => {
    const digest = createHash("sha256")
      .update(`transfer-wage:${playerId}:${seasonId}:${clubId}`)
      .digest();
    return digest.readUInt32BE(0) / 0x1_0000_0000;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStats(player: AuthorityPlayer): Record<string, number> {
  const snapshot = asRecord(asArray(player.statsTimeline).at(-1));
  const keys = player.position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return Object.fromEntries(keys.map((key) => [key, asNumber(snapshot[key], 60)]));
}

function clubInfo(row: {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  league: {
    name: string;
    tier: number;
    prestige: number;
    country: string;
    confederation: string;
  };
}, leagueSize: number): ClubMarketInfo {
  return {
    id: row.id,
    name: row.name,
    leagueId: row.leagueId,
    prestige: row.prestige,
    leagueName: row.league.name,
    leagueTier: row.league.tier,
    leaguePrestige: row.league.prestige,
    leagueCountry: row.league.country,
    confederation: row.league.confederation,
    leagueSize,
  };
}

export async function loadAuthorityContext(
  tx: Tx,
  input: GetTransferMarketInput | SearchTransferClubsInput | SetTransferOfferSelectionInput | ResolveTransferNegotiationInput,
  userId: string,
  options: { includeClubPool?: boolean } = {},
): Promise<AuthorityContext> {
  const player = await tx.careerPlayer.findUnique({
    where: { id: input.playerId },
    select: playerSelect,
  });
  if (!player || player.gameSession.userId !== userId) {
    throw new TransferAuthorityError("FORBIDDEN", "Career không thuộc user hiện tại");
  }
  if (
    player.checkpointVersion < 2 ||
    player.currentAge === null ||
    player.currentStep === null
  ) {
    throw new TransferAuthorityError(
      "CAREER_PROJECTION_UNAVAILABLE",
      "Career chưa được khởi tạo projection checkpoint V2",
    );
  }
  if (player.currentStep !== "transfer") {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Career chưa ở bước chuyển nhượng");
  }
  if (player.currentAge >= player.retireAge) {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Mùa giải cuối không có cửa sổ chuyển nhượng");
  }
  if (player.revision !== input.expectedRevision) {
    throw new TransferAuthorityError("STALE_REVISION", "Career đã có thay đổi mới hơn");
  }

  const season = await tx.careerSeason.findUnique({
    where: { id: input.seasonId },
    select: seasonSelect,
  });
  if (
    !season ||
    season.careerPlayerId !== player.id ||
    season.age !== player.currentAge
  ) {
    throw new TransferAuthorityError("SEASON_NOT_FOUND", "Mùa giải hiện tại không tồn tại");
  }
  if (season.status !== "in_progress") {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Mùa giải này đã được chốt");
  }

  const transferWorkflow = await loadTransferWorkflowState(tx, player.id, season.id);

  const rows = options.includeClubPool === false
    ? []
    : await tx.club.findMany({
        select: {
          id: true,
          name: true,
          leagueId: true,
          prestige: true,
          league: {
            select: {
              name: true,
              tier: true,
              prestige: true,
              country: true,
              confederation: true,
            },
          },
        },
      });
  const leagueIds = [...new Set(rows.map((row) => row.leagueId))];
  const leagueSizes = leagueIds.length
    ? await tx.club.groupBy({
        by: ["leagueId"],
        where: { leagueId: { in: leagueIds } },
        _count: { _all: true },
      })
    : [];
  const leagueSizeById = new Map(
    leagueSizes.map((row) => [row.leagueId, row._count._all] as const),
  );
  const clubs = rows.map((row) => clubInfo(row, leagueSizeById.get(row.leagueId) ?? 20));

  const stints = asArray(player.clubStints)
    .filter((value): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value),
    );
  const currentClubId = typeof stints.at(-1)?.clubId === "string"
    ? stints.at(-1)?.clubId as string
    : null;
  const currentClub = currentClubId
    ? clubs.find((club) => club.id === currentClubId) ?? null
    : null;
  if (options.includeClubPool !== false && currentClubId && !currentClub) {
    throw new TransferAuthorityError("CLUB_NOT_FOUND", "CLB hiện tại không tồn tại");
  }

  const snapshot = asRecord(asArray(player.statsTimeline).at(-1));
  const runtime = asRecord(season.runtimeState);
  const simulated = asRecord(runtime.yearSimResult);
  const currentOvr = asNumber(snapshot.ovr, player.peakOvr);
  const currentStats = asStats(player);
  const isUnemployed = player.isUnemployed || !currentClubId;
  const willingToMove = "willingToMove" in input ? input.willingToMove : true;
  const currentClubPrestige = currentClub?.prestige ?? 2;
  const currentClubLeagueTier = currentClub?.leagueTier ?? 1;
  const params: GenerateTransferMarketParams = {
    currentClubId,
    currentClubPrestige,
    currentClubLeagueTier,
    currentClubLeagueSize: currentClub ? currentClub.leagueSize : 20,
    currentOvr,
    currentStats,
    playerNation: player.nationality,
    currentAge: player.currentAge,
    retireAge: player.retireAge,
    matchRating: asNumber(simulated.matchRating, 6),
    goals: Math.max(0, Math.round(asNumber(simulated.goals, 0))),
    assists: Math.max(0, Math.round(asNumber(simulated.assists, 0))),
    cleanSheets: Math.max(0, Math.round(asNumber(simulated.cleanSheets, 0))),
    position: player.position,
    contractYearsRemaining: player.contractYearsRemaining,
    contractYearsTotal: player.contractYearsTotal,
    currentWageAnnual: player.currentWageAnnual,
    willingToMove,
    isUnemployed,
    influenceScore: player.influenceScore,
    clubs,
    randomSource: secureRandom,
    wageRandomSource: stableWageRandomSource(player.id, input.seasonId),
  };

  return { player, season, transferWorkflow, currentClubId, currentClub, params };
}

export function parseMarketResult(value: unknown): TransferMarketResult {
  const result = value as TransferMarketResult;
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.hasWindow !== "boolean" ||
    !Array.isArray(result.inbound) ||
    !Array.isArray(result.shortlist)
  ) {
    throw new TransferAuthorityError("COMMAND_EXISTS", "Market snapshot không hợp lệ");
  }
  return result;
}

export function cancelledTransferClubIds(
  runtimeState: unknown,
  workflow?: TransferWorkflowState,
): Set<string> {
  const transferNegotiation = asRecord(asRecord(runtimeState).transferNegotiation);
  const legacy = new Set(
    Object.entries(transferNegotiation)
      .filter(([, value]) => asRecord(value).cancelled === true)
      .map(([clubId]) => clubId),
  );
  if (workflow) {
    for (const clubId of cancelledClubIdsFromWorkflow(workflow)) legacy.add(clubId);
  }
  return legacy;
}

export function failedWageOptionsForClub(
  runtimeState: unknown,
  clubId: string,
  workflow?: TransferWorkflowState,
): WageDealOption[] {
  const transferNegotiation = asRecord(asRecord(runtimeState).transferNegotiation);
  const state = asRecord(transferNegotiation[clubId]);
  const failed = Array.isArray(state.failedWageOptions)
    ? state.failedWageOptions.filter((value): value is WageDealOption =>
        value === "lower" || value === "standard" || value === "higher",
      )
    : [];
  return [...new Set([
    ...failed,
    ...(workflow ? failedWageOptionsFromWorkflow(workflow, clubId) : []),
  ])];
}

function parseStoredOffer(value: unknown): ContractOfferCard | null {
  const offer = asRecord(value);
  if (
    typeof offer.clubId !== "string" ||
    typeof offer.clubName !== "string" ||
    (offer.kind !== "transfer" && offer.kind !== "free_agent" && offer.kind !== "renewal") ||
    typeof offer.transferFee !== "number" ||
    typeof offer.wageAnnual !== "number" ||
    typeof offer.contractYears !== "number"
  ) return null;
  return offer as unknown as ContractOfferCard;
}

/** Rehydrates an accepted offer after the user leaves and re-enters transfer. */
export function findPendingTransferNegotiation(
  commands: ReadonlyArray<{ input: unknown; result: unknown }>,
  runtimeState: unknown,
  workflow?: TransferWorkflowState,
  market?: TransferMarketResult,
): PendingTransferNegotiation | null {
  const runtime = asRecord(runtimeState);
  const cancelled = cancelledTransferClubIds(runtimeState, workflow);
  const hasPersistedMarketSelection = workflow?.negotiations.some((row) => row.marketCommandId !== null) ?? false;
  if (workflow?.selectedClubId && workflow.selectedOfferKind && market) {
    const selectedOffer = market.inbound.find((offer) =>
      offer.clubId === workflow.selectedClubId && offer.kind === workflow.selectedOfferKind,
    );
    if (selectedOffer && !cancelled.has(selectedOffer.clubId)) {
      return {
        offer: selectedOffer,
        failedWageOptions: failedWageOptionsForClub(runtimeState, selectedOffer.clubId, workflow),
      };
    }
  }
  if (hasPersistedMarketSelection) return null;
  if (workflow?.workflowId && workflow.status === "idle" && !workflow.selectedClubId) return null;
  if (Object.prototype.hasOwnProperty.call(runtime, "transferPendingOffer") && runtime.transferPendingOffer === null) return null;
  const selectedOffer = parseStoredOffer(asRecord(runtime.transferPendingOffer).offer);
  if (selectedOffer && !cancelled.has(selectedOffer.clubId)) {
    return {
      offer: selectedOffer,
      failedWageOptions: failedWageOptionsForClub(runtimeState, selectedOffer.clubId, workflow),
    };
  }
  for (const command of commands) {
    const input = asRecord(command.input);
    if (input.kind !== "approach" && input.kind !== "renewal") continue;
    const result = parseNegotiationResult(command.result);
    if (!result.accepted || !result.offer) continue;
    if (cancelled.has(result.offer.clubId)) continue;
    return {
      offer: result.offer,
      failedWageOptions: failedWageOptionsForClub(runtimeState, result.offer.clubId, workflow),
    };
  }
  return null;
}

export function filterCancelledTransferMarket(
  market: TransferMarketResult,
  runtimeState: unknown,
  workflow?: TransferWorkflowState,
): TransferMarketResult {
  const cancelled = cancelledTransferClubIds(runtimeState, workflow);
  if (cancelled.size === 0) return market;
  return {
    ...market,
    renewal: market.renewal && !cancelled.has(market.renewal.clubId) ? market.renewal : null,
    inbound: market.inbound.filter((offer) => !cancelled.has(offer.clubId)),
    shortlist: market.shortlist.filter((club) => !cancelled.has(club.clubId)),
  };
}

export function parseNegotiationResult(value: unknown): NegotiationResult {
  const result = value as StoredNegotiationResult;
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.accepted !== "boolean" ||
    typeof result.acceptChance !== "number"
  ) {
    throw new TransferAuthorityError("COMMAND_EXISTS", "Negotiation result không hợp lệ");
  }
  if (result.accepted && (!result.offer || typeof result.offer.clubId !== "string")) {
    throw new TransferAuthorityError("COMMAND_EXISTS", "Negotiation offer không hợp lệ");
  }
  if (!result.accepted && typeof result.rejectReason !== "string") {
    throw new TransferAuthorityError("COMMAND_EXISTS", "Negotiation rejection không hợp lệ");
  }
  return result as NegotiationResult;
}

export function commandKey(playerId: string, seasonId: string, suffix: string): string {
  return "transfer:" + playerId + ":" + seasonId + ":" + suffix;
}

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
