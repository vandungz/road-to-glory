"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  completeTransferCommandSchema,
  type TransferCompletionDto,
} from "@/features/career/contracts/transfer-transition.contract";
import {
  getTransferMarketSchema,
  resolveTransferNegotiationSchema,
  searchTransferClubsSchema,
} from "@/features/career/contracts/transfer-market.contract";
import { completeTransferCommand } from "@/features/career/services/transfer-transition.service";
import {
  getAuthoritativeTransferMarket,
  resolveAuthoritativeTransferNegotiation,
  searchAuthoritativeTransferClubs,
  type TransferNegotiationDto,
} from "@/features/career/services/transfer-market-authority.service";
import type { TransferMarketResult, ShortlistClubCard } from "@/features/transfer/services/transfer.service";
import { withCareerCommandLogging } from "@/lib/observability/career-command-log";

/** V2 transfer completion; the server derives destination terms and mutates the projection atomically. */
export async function completeTransferCommandAction(input: unknown): Promise<TransferCompletionDto> {
  const parsed = completeTransferCommandSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "transfer.complete",
      actorId: userId,
      careerId: parsed.playerId,
      seasonId: parsed.seasonId,
    },
    () => completeTransferCommand({ input: parsed, userId }),
  );
}

/** Loads one immutable market snapshot for the current transfer season. */
export async function getTransferMarketCommandAction(input: unknown): Promise<TransferMarketResult> {
  const parsed = getTransferMarketSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "transfer.market",
      actorId: userId,
      careerId: parsed.playerId,
      seasonId: parsed.seasonId,
    },
    () => getAuthoritativeTransferMarket({ input: parsed, userId }),
  );
}

/** Searches clubs from the server-owned career snapshot, never from client stats. */
export async function searchTransferClubsCommandAction(input: unknown): Promise<{
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}> {
  const parsed = searchTransferClubsSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "transfer.club_search",
      actorId: userId,
      careerId: parsed.playerId,
      seasonId: parsed.seasonId,
    },
    () => searchAuthoritativeTransferClubs({ input: parsed, userId }),
  );
}

/** Resolves one approach/renewal attempt once; replay uses the same persisted result. */
export async function resolveTransferNegotiationCommandAction(input: unknown): Promise<TransferNegotiationDto> {
  const parsed = resolveTransferNegotiationSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "transfer.negotiation",
      actorId: userId,
      careerId: parsed.playerId,
      seasonId: parsed.seasonId,
    },
    () => resolveAuthoritativeTransferNegotiation({ input: parsed, userId }),
  );
}
