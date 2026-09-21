import type { WageDealOption } from "@/lib/salary-negotiation";
import {
  cancelledClubIdsFromWorkflow,
  failedWageOptionsFromWorkflow,
  type TransferWorkflowState,
} from "@/features/career/services/transfer-workflow-state.service";
import type {
  ContractOfferCard,
  PendingTransferNegotiation,
  TransferMarketResult,
} from "@/features/transfer/services/transfer.service";
import {
  TransferAuthorityError,
  asRecord,
  type NegotiationResult,
  type StoredNegotiationResult,
} from "./transfer-market-authority-context";
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
