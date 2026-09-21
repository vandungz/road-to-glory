"use server";

import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeSeasonWalletIncome, buildWalletLedgerEntries, type WalletLedgerEntry } from "@/lib/wallet";
import { computeLegacyScore, computeCurrentFormIndex, computeInfluenceScore } from "@/lib/influence-score";
import { isShopItemAvailableForSeason, SHOP_CATALOG, type ShopInventoryEntry } from "@/lib/shop-catalog";
import { seasonProgressUpdateSchema, type SaveProgressParams, type SeasonProgressUpdate } from "./season-action-contracts";
import type { AchievementRecord, ClubStint, SeasonHistory, StatSnapshot } from "@/types/domain";
import type { SeasonRecord } from "@/types/game";

async function verifyGameOwnership(gameId: string) {
  return requireGameOwnership(gameId);
}

export async function saveSeasonProgress(params: SaveProgressParams) {
  const { gameId, playersUpdate } = params;
  const owner = await verifyGameOwnership(gameId);
  await checkRateLimit(owner.id);

  const v2Players = await prisma.careerPlayer.count({
    where: {
      gameSessionId: gameId,
      id: { in: playersUpdate.map((player) => player.id) },
      checkpointVersion: { gte: 2 },
    },
  });
  if (v2Players > 0) {
    throw new Error("Legacy season save không được phép ghi Career V2.");
  }

  await prisma.$transaction(
    playersUpdate.map((player) =>
      prisma.careerPlayer.update({
        where: { id: player.id },
        data: {
          statsTimeline: player.statsTimeline,
          clubStints: player.clubStints as unknown as Prisma.InputJsonValue,
          events: player.events,
          slotIndex: player.slotIndex,
          currentContinentalCup: player.currentContinentalCup,
          ...(player.contractYearsTotal !== undefined
            ? { contractYearsTotal: player.contractYearsTotal }
            : {}),
          ...(player.contractYearsRemaining !== undefined
            ? { contractYearsRemaining: player.contractYearsRemaining }
            : {}),
          ...(player.currentWageAnnual !== undefined
            ? { currentWageAnnual: player.currentWageAnnual }
            : {}),
          ...(player.marketValue !== undefined ? { marketValue: player.marketValue } : {}),
          ...(player.isUnemployed !== undefined ? { isUnemployed: player.isUnemployed } : {}),
        },
      })
    )
  );

  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}

export async function updateSeasonProgressAction(
  params: unknown
): Promise<{ walletBalance: number; influenceScore: number; shopInventory: ShopInventoryEntry[]; revision: number }> {
  const validated: SeasonProgressUpdate = seasonProgressUpdateSchema.parse(params) as SeasonProgressUpdate;
  const {
    playerId,
    statsTimeline,
    clubStints,
    currentContinentalCup,
    seasonHistory,
    contractYearsTotal,
    contractYearsRemaining,
    currentWageAnnual,
    marketValue,
    isUnemployed,
    currentAge,
    peakOvr,
    debutAge,
    careerLength,
    clubPrestige,
    matchRatingThisSeason,
    transferFeeThisSeason,
  } = validated;

  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);

  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: {
      gameSession: { select: { userId: true } },
      statsTimeline: true,
      clubStints: true,
      achievements: true,
      seasonHistory: true,
      walletBalance: true,
      walletLedger: true,
      influenceScore: true,
      shopInventory: true,
      currentAge: true,
      revision: true,
      checkpointVersion: true,
    },
  });
  if (player?.gameSession.userId !== userId) throw new Error("Forbidden");
  if (player.checkpointVersion >= 2) {
    throw new Error("Legacy season save không được phép ghi Career V2.");
  }
  const serverAchievements = (player.achievements as unknown as AchievementRecord | null) ?? {
    ballonDor: 0,
    trophies: [],
    seasonAwards: [],
  };

  // A refresh can leave a previous background request in flight while the new
  // page hydrates. Never allow that older request to overwrite a newer career
  // snapshot. V2 uses the projection column; legacy rows fall back to the
  // last timeline entry until backfill completes.
  const persistedTimeline = (player.statsTimeline as unknown as StatSnapshot[] | null) ?? [];
  const persistedCurrentAge = player.currentAge ?? persistedTimeline.at(-1)?.age;
  if (typeof persistedCurrentAge === "number" && currentAge < persistedCurrentAge) {
    return {
      walletBalance: player.walletBalance,
      influenceScore: player.influenceScore,
      shopInventory: (player.shopInventory as unknown as ShopInventoryEntry[] | null) ?? [],
      revision: player.revision,
    };
  }

  // Merge history-shaped JSON instead of replacing it with a possibly stale
  // client snapshot. This protects completed seasons if a request from a page
  // that was refreshed arrives after the current page has already saved.
  const persistedSeasonHistory =
    (player.seasonHistory as unknown as SeasonHistory | null) ?? {};
  const mergedSeasonHistory: SeasonHistory = { ...persistedSeasonHistory };
  for (const [age, incomingRecord] of Object.entries(seasonHistory)) {
    const previousRecord = persistedSeasonHistory[Number(age)];
    const mergedContinentalCup: SeasonRecord["continentalCup"] =
      previousRecord?.continentalCup && incomingRecord.continentalCup
        ? { ...previousRecord.continentalCup, ...incomingRecord.continentalCup }
        : incomingRecord.continentalCup ?? previousRecord?.continentalCup ?? null;
    const mergedNationalTeam: SeasonRecord["nationalTeam"] =
      previousRecord?.nationalTeam && incomingRecord.nationalTeam
        ? { ...previousRecord.nationalTeam, ...incomingRecord.nationalTeam }
        : incomingRecord.nationalTeam ?? previousRecord?.nationalTeam ?? null;
    mergedSeasonHistory[Number(age)] = previousRecord
      ? {
          ...previousRecord,
          ...incomingRecord,
          continentalCup: mergedContinentalCup,
          nationalTeam: mergedNationalTeam,
        }
      : incomingRecord;
  }

  const persistedClubStints =
    (player.clubStints as unknown as ClubStint[] | null) ?? [];
  const mergedClubStints = Array.from(
    new Map(
      [...persistedClubStints, ...clubStints].map((stint) => [
        `${stint.clubId}:${stint.startAge}`,
        stint,
      ]),
    ).values(),
  ).sort((left, right) => left.startAge - right.startAge);
  const mergedStatsTimeline = Array.from(
    new Map(
      [...persistedTimeline, ...statsTimeline].map((snapshot) => [snapshot.age, snapshot]),
    ).values(),
  ).sort((left, right) => left.age - right.age);

  // Wallet — server-authoritative: income always computed server-side, never trusted from client.
  const income = computeSeasonWalletIncome({
    currentWageAnnual: currentWageAnnual ?? 0,
    transferFeeThisSeason,
  });
  const currentWalletLedger = Array.isArray(player.walletLedger)
    ? (player.walletLedger as unknown as WalletLedgerEntry[])
    : [];
  const newWalletEntries = buildWalletLedgerEntries(currentAge, income).filter(
    (entry) => !currentWalletLedger.some(
      (existing) => existing.age === entry.age && existing.type === entry.type,
    ),
  );
  const nextWalletLedger: WalletLedgerEntry[] = [...currentWalletLedger, ...newWalletEntries];
  const creditedIncome = newWalletEntries.reduce((total, entry) => total + entry.amount, 0);

  // Influence Score — derived cache, recomputed each checkpoint from data already on the player.
  const legacyScore = computeLegacyScore({
    trophies: serverAchievements.trophies,
    seasonHistory: mergedSeasonHistory,
    ballonDorWins: serverAchievements.ballonDor,
    statsTimeline: mergedStatsTimeline,
  });
  const currentFormIndex = computeCurrentFormIndex({
    currentOvr: mergedStatsTimeline.at(-1)?.ovr ?? peakOvr,
    peakOvr,
    matchRating: matchRatingThisSeason,
    clubPrestige,
  });
  const influenceScore = computeInfluenceScore({
    legacyScore,
    currentFormIndex,
    currentAge,
    debutAge,
    careerLength,
  });

  // Shop items — mark consumed once the season they targeted has actually been
  // played (this checkpoint fires right after currentAge advances past it).
  // Server-derived only from its own DB state — never trusts a client-sent inventory.
  const seasonJustCompleted = currentAge - 1;
  const prevShopInventory = (player?.shopInventory as unknown as ShopInventoryEntry[] | undefined) ?? [];
  const nextShopInventory: ShopInventoryEntry[] = prevShopInventory.map((e) =>
    e.appliedSeason === seasonJustCompleted && !e.consumed ? { ...e, consumed: true } : e,
  );

  const updated = await prisma.careerPlayer.update({
    where: { id: playerId },
    data: {
      statsTimeline: mergedStatsTimeline,
      clubStints: mergedClubStints as unknown as Prisma.InputJsonValue,
      // The legacy client field remains accepted for compatibility but is not
      // an authority. Awards stay whatever the server already persisted.
      achievements: serverAchievements as unknown as Prisma.InputJsonValue,
      currentContinentalCup,
      seasonHistory: mergedSeasonHistory as unknown as Prisma.InputJsonValue,
      ...(contractYearsTotal !== undefined ? { contractYearsTotal } : {}),
      ...(contractYearsRemaining !== undefined ? { contractYearsRemaining } : {}),
      ...(currentWageAnnual !== undefined ? { currentWageAnnual } : {}),
      ...(marketValue !== undefined ? { marketValue } : {}),
      ...(isUnemployed !== undefined ? { isUnemployed } : {}),
      // Ledger entries are keyed by season + type. This makes retries safe:
      // the same checkpoint cannot credit the wallet twice after a refresh.
      walletBalance: { increment: creditedIncome },
      walletLedger: nextWalletLedger as unknown as Prisma.InputJsonValue,
      influenceScore,
      shopInventory: nextShopInventory as unknown as Prisma.InputJsonValue,
      currentAge,
      revision: { increment: 1 },
    },
    select: { walletBalance: true, influenceScore: true, shopInventory: true, revision: true },
  });

  return {
    walletBalance: updated.walletBalance,
    influenceScore: updated.influenceScore,
    shopInventory: updated.shopInventory as unknown as ShopInventoryEntry[],
    revision: updated.revision,
  };
}

const purchaseShopItemSchema = z.object({
  playerId: z.string(),
  itemId: z.string(),
  currentAge: z.number().int().min(15).max(50),
  // The season this purchase should take effect in — either currentAge (bought at
  // "SẴN SÀNG KHỞI ĐỘNG MÙA GIẢI", before that season's wheels have spun) or
  // currentAge + 1 (bought right after the previous season resolved, before "Next
  // Season"). Client computes this from careerSubStep; server just bounds-checks it
  // rather than re-deriving it, since it has no notion of careerSubStep. Same trust
  // level updateSeasonProgressAction already gives client-supplied currentAge.
  targetSeason: z.number().int().min(15).max(51),
});

/**
 * First interactive read-check-write transaction in this codebase — everywhere else is a
 * single update() or an unguarded findUnique()→update() (fine for low-stakes fields, not
 * for spending money). Known limitation: Prisma's default READ COMMITTED isolation leaves
 * a theoretical double-spend race between two concurrent purchases; accepted for a
 * single-player game, consistent with every other write in this codebase.
 */
export async function purchaseShopItemAction(input: unknown): Promise<{
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
}> {
  const { playerId, itemId, currentAge, targetSeason } = purchaseShopItemSchema.parse(input);
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error("Invalid item");
  // targetSeason must be either "this season" (not started) or "next season" — never
  // further out, and never a season already in progress/past.
  if (targetSeason !== currentAge && targetSeason !== currentAge + 1) {
    throw new Error("Invalid target season");
  }
  if (!isShopItemAvailableForSeason(item, targetSeason)) {
    throw new Error("Vật phẩm này chỉ mở bán ở mùa có giải đấu quốc gia");
  }

  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);

  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: playerId },
      select: {
        gameSession: { select: { userId: true } },
        checkpointVersion: true,
        walletBalance: true,
        walletLedger: true,
        shopInventory: true,
      },
    });
    if (!player || player.gameSession.userId !== userId) throw new Error("Forbidden");
    if (player.checkpointVersion >= 2) {
      throw new Error("Legacy Shop purchase không được phép ghi Career V2.");
    }

    const inventory = (player.shopInventory as unknown as ShopInventoryEntry[]) ?? [];
    if (inventory.some((e) => e.itemId === itemId && e.appliedSeason === targetSeason)) {
      throw new Error("Đã mua vật phẩm này cho mùa giải đó rồi");
    }
    if (player.walletBalance < item.priceThousands) {
      throw new Error("Không đủ số dư");
    }

    const nextLedger: WalletLedgerEntry[] = [
      ...((player.walletLedger as unknown as WalletLedgerEntry[]) ?? []),
      { age: currentAge, type: "shop_purchase", amount: -item.priceThousands, label: `Mua: ${item.name}` },
    ];
    const nextInventory: ShopInventoryEntry[] = [
      ...inventory,
      { itemId, purchasedAtAge: currentAge, appliedSeason: targetSeason, consumed: false },
    ];

    const updated = await tx.careerPlayer.update({
      where: { id: playerId },
      data: {
        walletBalance: { decrement: item.priceThousands },
      walletLedger: nextLedger as unknown as Prisma.InputJsonValue,
      shopInventory: nextInventory as unknown as Prisma.InputJsonValue,
      },
      select: { walletBalance: true, shopInventory: true },
    });

    return {
      walletBalance: updated.walletBalance,
      shopInventory: updated.shopInventory as unknown as ShopInventoryEntry[],
    };
  });
}

export async function completeGameSession(gameId: string) {
  const owner = await verifyGameOwnership(gameId);
  await checkRateLimit(owner.id);
  console.log(`[completeGameSession] Completing game session: ${gameId}...`);

  const players = await prisma.careerPlayer.findMany({
    where: {
      gameSessionId: gameId,
      slotIndex: { gte: 0, lte: 10 },
    },
    select: { peakOvr: true },
  });

  const squadRating = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.peakOvr, 0) / players.length)
    : 0;

  await prisma.gameSession.update({
    where: { id: gameId },
    data: {
      status: "completed",
      squadRating,
    },
  });

  revalidatePath(`/${gameId}`);
}
