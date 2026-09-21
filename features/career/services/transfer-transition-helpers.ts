import type { Prisma } from "@/app/generated/prisma/client";
import type { CompleteTransferCommand, TransferCompletionDto } from "@/features/career/contracts/transfer-transition.contract";
import type { ContractOfferCard, ContractOfferKind } from "@/features/transfer/services/transfer.service";
import type { WageDealOption } from "@/lib/salary-negotiation";
import { cancelledTransferClubIds, commandKey, failedWageOptionsForClub } from "@/features/career/services/transfer-market-authority.shared";
import type { TransferWorkflowState } from "@/features/career/services/transfer-workflow-state.service";

export type TransferTransitionErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS"
  | "CLUB_NOT_FOUND"
  | "INVALID_TERMS"
  | "OFFER_NOT_FOUND"
  | "WAGE_NEGOTIATION_FAILED"
  | "WAGE_OPTION_UNAVAILABLE"
  | "TRANSFER_DEAL_CANCELLED";

export class TransferTransitionError extends Error {
  constructor(public readonly code: TransferTransitionErrorCode, message: string) {
    super(message);
    this.name = "TransferTransitionError";
  }
}

type PublicTransferResult = Omit<TransferCompletionDto, "replayed">;

export const playerSelect = {
  id: true,
  revision: true,
  peakOvr: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  retireAge: true,
  position: true,
  statsTimeline: true,
  clubStints: true,
  currentContinentalCup: true,
  currentWageAnnual: true,
  contractYearsTotal: true,
  contractYearsRemaining: true,
  marketValue: true,
  isUnemployed: true,
  walletBalance: true,
  walletLedger: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

export const seasonSelect = {
  id: true,
  careerPlayerId: true,
  age: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

export type Player = Prisma.CareerPlayerGetPayload<{ select: typeof playerSelect }>;
export type Season = Prisma.CareerSeasonGetPayload<{ select: typeof seasonSelect }>;

export type TransferCommandOutcome =
  | { kind: "success"; result: TransferCompletionDto }
  | { kind: "failure"; code: TransferTransitionErrorCode; message: string };

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function currentSnapshot(player: Player): Record<string, unknown> {
  return asRecord(asArray(player.statsTimeline).at(-1));
}

export function currentStats(player: Player): Record<string, number> {
  const snapshot = currentSnapshot(player);
  const keys = player.position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return Object.fromEntries(keys.map((key) => [key, asNumber(snapshot[key], 60)]));
}

export function seasonMatchRating(season: Season): number {
  return asNumber(asRecord(asRecord(season.runtimeState).yearSimResult).matchRating, 6);
}

export function wageAttemptState(
  runtimeState: unknown,
  clubId: string,
  workflow?: TransferWorkflowState,
): {
  failedWageOptions: WageDealOption[];
  cancelled: boolean;
} {
  const transferNegotiation = asRecord(asRecord(runtimeState).transferNegotiation);
  const state = asRecord(transferNegotiation[clubId]);
  const legacyFailed = Array.isArray(state.failedWageOptions)
    ? state.failedWageOptions.filter((value): value is WageDealOption =>
        value === "lower" || value === "standard" || value === "higher",
      )
    : [];
  const failed = [...new Set([
    ...legacyFailed,
    ...failedWageOptionsForClub(runtimeState, clubId, workflow),
  ])];
  return {
    failedWageOptions: failed,
    cancelled: state.cancelled === true || cancelledTransferClubIds(runtimeState, workflow).has(clubId),
  };
}

export function wageMultiplier(option: WageDealOption): number {
  if (option === "lower") return 0.8;
  if (option === "higher") return 1.15;
  return 1;
}

export function renewalWageMultiplier(option: WageDealOption): number {
  if (option === "lower") return 0.82;
  if (option === "higher") return 1.15;
  return 1;
}

export function issuedWageMultiplier(kind: CompleteTransferCommand["kind"], option: WageDealOption): number {
  return kind === "renewal" ? renewalWageMultiplier(option) : wageMultiplier(option);
}

export function parseReplayResult(value: unknown, fallbackWalletBalance?: number): TransferCompletionDto {
  const raw = value as Partial<PublicTransferResult>;
  const result = {
    ...raw,
    walletBalance: typeof raw.walletBalance === "number"
      ? raw.walletBalance
      : fallbackWalletBalance ?? 0,
  } as PublicTransferResult;
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.commandId !== "string" ||
    typeof result.revision !== "number" ||
    typeof result.currentAge !== "number" ||
    result.nextStep !== "resolved" ||
    (result.kind !== "stay" && result.kind !== "transfer" && result.kind !== "free_agent" && result.kind !== "renewal") ||
    (typeof result.clubId !== "string" && result.clubId !== null) ||
    typeof result.clubName !== "string" ||
    typeof result.leagueName !== "string" ||
    typeof result.fee !== "number" ||
    typeof result.contractYears !== "number" ||
    typeof result.wageAnnual !== "number" ||
    typeof result.walletBalance !== "number" ||
    typeof result.nextAge !== "number"
  ) {
    throw new TransferTransitionError("COMMAND_EXISTS", "Idempotency record không hợp lệ");
  }
  return { ...result, replayed: true };
}

export function transferResult(params: {
  commandId: string;
  revision: number;
  age: number;
  kind: CompleteTransferCommand["kind"];
  clubId: string | null;
  clubName: string;
  leagueName: string;
  fee: number;
  contractYears: number;
  wageAnnual: number;
  walletBalance: number;
}): PublicTransferResult {
  return {
    commandId: params.commandId,
    revision: params.revision,
    currentAge: params.age,
    nextStep: "resolved",
    kind: params.kind,
    clubId: params.clubId,
    clubName: params.clubName,
    leagueName: params.leagueName,
    fee: params.fee,
    contractYears: params.contractYears,
    wageAnnual: params.wageAnnual,
    walletBalance: params.walletBalance,
    nextAge: params.age + 1,
  };
}

type IssuedTransferOffer = {
  offer: ContractOfferCard;
  wageOption: WageDealOption;
};

export function parseIssuedOffer(value: unknown): ContractOfferCard | null {
  const offer = asRecord(value);
  if (
    typeof offer.clubId !== "string" ||
    typeof offer.clubName !== "string" ||
    typeof offer.kind !== "string" ||
    typeof offer.transferFee !== "number" ||
    typeof offer.wageAnnual !== "number" ||
    typeof offer.contractYears !== "number"
  ) {
    return null;
  }
  return offer as unknown as ContractOfferCard;
}

export function hasAcceptedNegotiation(
  value: unknown,
  clubId: string,
  kind: ContractOfferKind,
): ContractOfferCard | null {
  const result = asRecord(value);
  if (result.accepted !== true) return null;
  const offer = parseIssuedOffer(result.offer);
  return offer?.clubId === clubId && offer.kind === kind ? offer : null;
}

/**
 * A completion request may only consume an offer that the server previously
 * issued for this season. This closes the direct-POST path where a client
 * could otherwise invent a valid-looking destination club and terms.
 */
export async function assertServerIssuedOffer(params: {
  tx: Prisma.TransactionClient;
  playerId: string;
  seasonId: string;
  revision: number;
  kind: CompleteTransferCommand["kind"];
  clubId: string | null | undefined;
  wageOption: WageDealOption;
}): Promise<IssuedTransferOffer | null> {
  if (params.kind === "stay") return null;
  if (!params.clubId) {
    throw new TransferTransitionError("OFFER_NOT_FOUND", "Thiếu CLB đích đã được server cấp offer");
  }
  const clubId = params.clubId;
  const expectedOfferKind: ContractOfferKind = params.kind === "renewal"
    ? "renewal"
    : params.kind === "transfer"
      ? "transfer"
      : "free_agent";

  const negotiationCommands = await params.tx.careerCommand.findMany({
    where: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      commandType: "transfer_negotiation",
      revisionBefore: params.revision,
    },
    select: { input: true, result: true },
  });
  const negotiationInputKind = params.kind === "renewal" ? "renewal" : "approach";
  let issuedNegotiationOffer: IssuedTransferOffer | null = null;
  const acceptedNegotiation = negotiationCommands.some((command) => {
    const commandInput = asRecord(command.input);
    const offer = commandInput.kind === negotiationInputKind &&
      commandInput.clubId === clubId
      ? hasAcceptedNegotiation(command.result, clubId, expectedOfferKind)
      : null;
    if (!offer) return false;
    const wageOption = commandInput.wageOption === "lower" || commandInput.wageOption === "higher"
      ? commandInput.wageOption
      : "standard";
    issuedNegotiationOffer = { offer, wageOption };
    return true;
  });
  if (acceptedNegotiation && issuedNegotiationOffer) return issuedNegotiationOffer;

  if (params.kind === "renewal") {
    throw new TransferTransitionError("OFFER_NOT_FOUND", "Chưa có offer gia hạn được server chấp thuận");
  }

  const marketCommand = await params.tx.careerCommand.findUnique({
    where: {
      careerPlayerId_idempotencyKey: {
        careerPlayerId: params.playerId,
        idempotencyKey: commandKey(params.playerId, params.seasonId, "market:yes"),
      },
    },
    select: { commandType: true, result: true },
  });
  if (!marketCommand || marketCommand.commandType !== "transfer_market") {
    throw new TransferTransitionError("OFFER_NOT_FOUND", "Offer chuyển nhượng chưa được server cấp");
  }
  const expectedKind = params.kind;
  let issuedMarketOffer: IssuedTransferOffer | null = null;
  const inboundExists = asArray(asRecord(marketCommand.result).inbound).some((value) => {
    const offer = parseIssuedOffer(value);
    if (!offer || offer.clubId !== clubId || offer.kind !== expectedKind) return false;
    issuedMarketOffer = { offer, wageOption: "standard" };
    return true;
  });
  if (!inboundExists) {
    throw new TransferTransitionError("OFFER_NOT_FOUND", "Offer chuyển nhượng không còn hợp lệ");
  }
  return issuedMarketOffer;
}
