import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateTransferMarketService,
  type ShortlistClubCard,
  type TransferMarketResult,
} from "@/features/transfer/services/transfer.service";
import type {
  GetTransferMarketInput,
  ResolveTransferNegotiationInput,
  SearchTransferClubsInput,
} from "@/features/career/contracts/transfer-market.contract";
import {
  buildShortlist,
  cancelledTransferClubIds,
  filterCancelledTransferMarket,
  findPendingTransferNegotiation,
  commandKey,
  loadAuthorityContext,
  parseMarketResult,
  parseNegotiationResult,
  resolveNegotiation,
  TransferAuthorityError,
  type NegotiationResult,
  type TransferNegotiationDto,
} from "@/features/career/services/transfer-market-authority.shared";
import {
  isClubCancelledInWorkflow,
  loadTransferWorkflowState,
  persistTransferOfferSelection,
  type TransferWorkflowState,
} from "@/features/career/services/transfer-workflow-state.service";

export type { TransferNegotiationDto } from "@/features/career/services/transfer-market-authority.shared";

async function hydratePendingNegotiation(params: {
  tx: Prisma.TransactionClient;
  playerId: string;
  seasonId: string;
  revision: number;
  market: TransferMarketResult;
  runtimeState: unknown;
  workflow: TransferWorkflowState;
}): Promise<TransferMarketResult> {
  const commands = await params.tx.careerCommand.findMany({
    where: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      commandType: "transfer_negotiation",
      revisionBefore: params.revision,
    },
    orderBy: { createdAt: "desc" },
    select: { input: true, result: true },
  });
  return {
    ...params.market,
    pendingNegotiation: findPendingTransferNegotiation(
      commands,
      params.runtimeState,
      params.workflow,
      params.market,
    ),
  };
}

export async function getAuthoritativeTransferMarket(params: {
  input: GetTransferMarketInput;
  userId: string;
}): Promise<TransferMarketResult> {
  const { input, userId } = params;
  return prisma.$transaction(async (tx) => {
    const context = await loadAuthorityContext(tx, input, userId);
    const moveChoice = context.params.willingToMove ? "yes" : "no";
    const idempotencyKey = commandKey(context.player.id, context.season.id, "market:" + moveChoice);
    const existing = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: context.player.id,
          idempotencyKey,
        },
      },
      select: { id: true, commandType: true, result: true },
    });
    if (existing) {
      if (existing.commandType !== "transfer_market") {
        throw new TransferAuthorityError("COMMAND_EXISTS", "Market key đã được dùng cho command khác");
      }
      return hydratePendingNegotiation({
        tx,
        playerId: context.player.id,
        seasonId: context.season.id,
        revision: context.player.revision,
        market: filterCancelledTransferMarket(
          parseMarketResult(existing.result),
          context.season.runtimeState,
          context.transferWorkflow,
        ),
        runtimeState: context.season.runtimeState,
        workflow: context.transferWorkflow,
      });
    }

    const market = generateTransferMarketService(context.params);
    const commandId = randomUUID();
    const saved = await tx.careerCommand.upsert({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: context.player.id,
          idempotencyKey,
        },
      },
      create: {
        id: commandId,
        careerPlayerId: context.player.id,
        seasonId: context.season.id,
        commandType: "transfer_market",
        idempotencyKey,
        input: {
          seasonId: context.season.id,
          revision: context.player.revision,
          willingToMove: context.params.willingToMove,
        } as Prisma.InputJsonValue,
        result: market as unknown as Prisma.InputJsonValue,
        revisionBefore: context.player.revision,
        revisionAfter: context.player.revision,
      },
      update: {},
      select: { id: true, result: true },
    });
    return hydratePendingNegotiation({
      tx,
      playerId: context.player.id,
      seasonId: context.season.id,
      revision: context.player.revision,
      market: filterCancelledTransferMarket(
        parseMarketResult(saved.result),
        context.season.runtimeState,
        context.transferWorkflow,
      ),
      runtimeState: context.season.runtimeState,
      workflow: context.transferWorkflow,
    });
  });
}

export async function setAuthoritativeTransferOfferSelection(params: {
  input: import("@/features/career/contracts/transfer-market.contract").SetTransferOfferSelectionInput;
  userId: string;
}): Promise<import("@/features/transfer/services/transfer.service").PendingTransferNegotiation | null> {
  const { input, userId } = params;
  return prisma.$transaction(async (tx) => {
    const context = await loadAuthorityContext(tx, input, userId, { includeClubPool: false });
    if (input.clubId === null) {
      await persistTransferOfferSelection(tx, {
        playerId: context.player.id,
        seasonId: context.season.id,
        clubId: null,
      });
      return null;
    }

    const marketCommand = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: context.player.id,
          idempotencyKey: commandKey(context.player.id, context.season.id, "market:yes"),
        },
      },
      select: { id: true, commandType: true, result: true },
    });
    if (!marketCommand || marketCommand.commandType !== "transfer_market") {
      throw new TransferAuthorityError("OFFER_NOT_FOUND", "Chưa có market snapshot hợp lệ");
    }
    const market = filterCancelledTransferMarket(
      parseMarketResult(marketCommand.result),
      context.season.runtimeState,
      context.transferWorkflow,
    );
    const offer = market.inbound.find((item) => item.clubId === input.clubId);
    if (!offer) throw new TransferAuthorityError("OFFER_NOT_FOUND", "Offer chuyển nhượng không còn hợp lệ");
    await persistTransferOfferSelection(tx, {
      playerId: context.player.id,
      seasonId: context.season.id,
      clubId: offer.clubId,
      offerKind: offer.kind,
      marketCommandId: marketCommand.id,
    });
    const workflow = await loadTransferWorkflowState(tx, context.player.id, context.season.id);
    return findPendingTransferNegotiation([], context.season.runtimeState, workflow, market);
  });
}

export async function searchAuthoritativeTransferClubs(params: {
  input: SearchTransferClubsInput;
  userId: string;
}): Promise<{
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}> {
  const { input, userId } = params;
  return prisma.$transaction(async (tx) => {
    const context = await loadAuthorityContext(tx, input, userId);
    const leagues = await tx.league.findMany({
      select: { id: true, name: true, tier: true },
      orderBy: [{ tier: "asc" }, { prestige: "desc" }],
    });
    const query = input.query?.trim().toLowerCase();
    const cancelled = cancelledTransferClubIds(context.season.runtimeState, context.transferWorkflow);
    const allCards = buildShortlist(context.params).filter((club) => !cancelled.has(club.clubId));
    const filtered = allCards.filter((club) => {
      if (query && !club.clubName.toLowerCase().includes(query)) return false;
      if (input.leagueId && input.leagueId !== "all" && club.leagueId !== input.leagueId) return false;
      if (input.prestigeMin !== undefined && club.prestige < input.prestigeMin) return false;
      if (input.prestigeMax !== undefined && club.prestige > input.prestigeMax) return false;
      return true;
    });
    const start = (input.page - 1) * input.pageSize;
    return {
      clubs: filtered.slice(start, start + input.pageSize),
      totalCount: filtered.length,
      leagues,
    };
  });
}

function parseNegotiationDto(value: unknown, replayed: boolean): TransferNegotiationDto {
  const result: NegotiationResult = parseNegotiationResult(value);
  return { ...result, replayed };
}

export async function resolveAuthoritativeTransferNegotiation(params: {
  input: ResolveTransferNegotiationInput;
  userId: string;
}): Promise<TransferNegotiationDto> {
  const { input, userId } = params;
  return prisma.$transaction(async (tx) => {
    const context = await loadAuthorityContext(tx, input, userId);
    const targetClubId = input.kind === "renewal"
      ? context.currentClubId
      : input.clubId ?? null;
    if (
      targetClubId &&
      (isClubCancelledInWorkflow(context.transferWorkflow, targetClubId) ||
        cancelledTransferClubIds(context.season.runtimeState, context.transferWorkflow).has(targetClubId))
    ) {
      throw new TransferAuthorityError("OFFER_NOT_FOUND", "CLB này đã hủy thương vụ hiện tại");
    }
    const dealOption = input.kind === "approach" ? input.feeOption : input.wageOption;
    const suffix = input.kind + ":" + (targetClubId ?? "none") + ":" + dealOption;
    const idempotencyKey = commandKey(context.player.id, context.season.id, suffix);
    const existing = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: context.player.id,
          idempotencyKey,
        },
      },
      select: { commandType: true, result: true },
    });
    if (existing) {
      if (existing.commandType !== "transfer_negotiation") {
        throw new TransferAuthorityError("COMMAND_EXISTS", "Negotiation key đã được dùng cho command khác");
      }
      return parseNegotiationDto(existing.result, true);
    }

    const result = resolveNegotiation(context, input);
    const commandId = randomUUID();
    const saved = await tx.careerCommand.upsert({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: context.player.id,
          idempotencyKey,
        },
      },
      create: {
        id: commandId,
        careerPlayerId: context.player.id,
        seasonId: context.season.id,
        commandType: "transfer_negotiation",
        idempotencyKey,
        input: {
          seasonId: context.season.id,
          kind: input.kind,
          clubId: targetClubId,
          feeOption: input.feeOption,
          wageOption: input.wageOption,
        } as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        revisionBefore: context.player.revision,
        revisionAfter: context.player.revision,
      },
      update: {},
      select: { id: true, result: true },
    });
    return parseNegotiationDto(saved.result, saved.id !== commandId);
  });
}
