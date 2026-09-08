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
  commandKey,
  loadAuthorityContext,
  parseMarketResult,
  parseNegotiationResult,
  resolveNegotiation,
  TransferAuthorityError,
  type NegotiationResult,
  type TransferNegotiationDto,
} from "@/features/career/services/transfer-market-authority.shared";

export type { TransferNegotiationDto } from "@/features/career/services/transfer-market-authority.shared";

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
      select: { commandType: true, result: true },
    });
    if (existing) {
      if (existing.commandType !== "transfer_market") {
        throw new TransferAuthorityError("COMMAND_EXISTS", "Market key đã được dùng cho command khác");
      }
      return parseMarketResult(existing.result);
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
      select: { result: true },
    });
    return parseMarketResult(saved.result);
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
    const allCards = buildShortlist(context.params);
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
    const suffix = input.kind + ":" + (targetClubId ?? "none") + ":" + input.wageOption;
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
