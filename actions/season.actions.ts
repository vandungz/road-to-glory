"use server";

import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { revalidatePath, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeSeasonWalletIncome, buildWalletLedgerEntries, type WalletLedgerEntry } from "@/lib/wallet";
import { computeLegacyScore, computeCurrentFormIndex, computeInfluenceScore } from "@/lib/influence-score";
import {
  isShopItemActiveForSeason,
  isShopItemAvailableForSeason,
  SHOP_CATALOG,
  type ShopInventoryEntry,
} from "@/lib/shop-catalog";

// ── Cup opponents caches (data thay đổi chỉ khi re-seed) ──────────────────

const getCachedDomesticOpponents = unstable_cache(
  async (country: string) =>
    prisma.club.findMany({
      where: { league: { country } },
      select: { id: true, name: true, prestige: true, leagueId: true, continentalType: true },
    }),
  ["domestic-cup-opponents"],
  { revalidate: 3600 }
);

const getCachedContinentalOpponents = unstable_cache(
  async (allowedTypes: string[]) =>
    prisma.club.findMany({
      where: { continentalType: { in: allowedTypes } },
      select: { id: true, name: true, prestige: true, leagueId: true, continentalType: true },
    }),
  ["continental-cup-opponents"],
  { revalidate: 3600 }
);

const getCachedNationalTeams = unstable_cache(
  async (confederation: string | undefined) =>
    prisma.nationalTeam.findMany({
      where: confederation ? { confederation } : undefined,
      select: { id: true, name: true, nationality: true, confederation: true, tier: true },
    }),
  ["national-teams"],
  { revalidate: 3600 }
);

const getCachedClubCountry = unstable_cache(
  async (clubId: string) =>
    prisma.club.findUnique({
      where: { id: clubId },
      select: { league: { select: { country: true } } },
    }),
  ["club-country"],
  { revalidate: 3600 }
);
import { simulatePlayerSeasonService, type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { simulateDynamicLeagueTableService, type TableRow } from "@/features/season/services/table-simulator.service";
import { startPlayerCareerService, type CareerSetupResult } from "@/features/career/services/career-setup.service";
import { createCareerSetupToken } from "@/features/career/services/career-setup-token.service";
import {
  generateTransferMarketService,
  resolveApproachService,
  resolveProactiveRenewalService,
  type TransferMarketResult,
  type ResolveApproachResult,
  type ResolveProactiveRenewalResult,
  type ShortlistClubCard,
} from "@/features/transfer/services/transfer.service";
import {
  clubCanAffordBuyout,
  computeApproachAcceptChance,
  computeEffectivePositionOvr,
  computeMandatoryBuyout,
  computeMarketValue,
  expectedAppsAtClub,
  proposeContractYears,
  proposeWageAnnual,
  randomizeWageAnnual,
} from "@/lib/transfer-economy";
import { secureRandom } from "@/lib/secure-random";
import { estimateAppsRatio } from "@/lib/club-fit";
import { 
  generateDomesticCupJourneyService, 
  generateContinentalCupJourneyService, 
  generateNationalTeamJourneyService 
} from "@/features/season/services/cup-journey.service";
import { evolvePlayerStatsService, type StatsEvolutionResult } from "@/features/player/services/stats-evolution.service";
import type { AchievementRecord, ClubStint, SeasonHistory, StatSnapshot } from "@/types/domain";
import type { SeasonRecord } from "@/types/game";

// ============================================================
// TYPES & SCHEMAS
// ============================================================

interface PlayerUpdateInput {
  id: string;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  events: Array<Record<string, string | number>>;
  slotIndex: number;
  currentContinentalCup?: string;
  contractYearsTotal?: number;
  contractYearsRemaining?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  isUnemployed?: boolean;
}

interface SaveProgressParams {
  gameId: string;
  playersUpdate: PlayerUpdateInput[];
}

interface SeasonProgressUpdate {
  playerId: string;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: AchievementRecord;
  currentContinentalCup: string;
  seasonHistory: SeasonHistory;
  contractYearsTotal?: number;
  contractYearsRemaining?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  isUnemployed?: boolean;
  // Wallet & Influence (docs/core-currency-shop-design.md §4/§3)
  currentAge: number;
  peakOvr: number;
  debutAge: number;
  careerLength: number;
  clubPrestige: number;
  matchRatingThisSeason: number;
  /** € thousands, GROSS fee — only set in the season a real transfer completed. */
  transferFeeThisSeason?: number;
}

const seasonProgressUpdateSchema = z.object({
  playerId: z.string().uuid(),
  statsTimeline: z.array(
    z.object({
      age: z.number().int().min(10).max(70),
      ovr: z.number().int().min(1).max(99),
    }).catchall(z.number()),
  ),
  clubStints: z.array(z.object({
    clubId: z.string(),
    clubName: z.string(),
    leagueId: z.string(),
    leagueName: z.string(),
    startAge: z.number().int(),
    endAge: z.number().int(),
    yearsAtClub: z.number().int(),
    ovrAtJoining: z.number().int(),
    ovrAtLeaving: z.number().int(),
    wageAtJoining: z.number().int().optional(),
    feePaid: z.number().int().optional(),
  })),
  achievements: z.unknown(),
  currentContinentalCup: z.string(),
  seasonHistory: z.record(z.string(), z.any()),
  contractYearsTotal: z.number().int().min(0).max(10).optional(),
  contractYearsRemaining: z.number().int().min(0).max(10).optional(),
  currentWageAnnual: z.number().int().min(0).optional(),
  marketValue: z.number().int().min(0).optional(),
  isUnemployed: z.boolean().optional(),
  currentAge: z.number().int().min(15).max(70),
  peakOvr: z.number().int().min(1).max(99),
  debutAge: z.number().int().min(10).max(35),
  careerLength: z.number().int().min(1).max(30),
  clubPrestige: z.number().int().min(1).max(5),
  matchRatingThisSeason: z.number().min(0).max(10),
  transferFeeThisSeason: z.number().int().min(0).optional(),
});

const simulatePlayerSeasonSchema = z.object({
  playerId: z.string().optional().nullable(),
  age: z.number().int().min(15).max(50),
  ovr: z.number().int().min(10).max(99),
  position: z.string(),
  luckRating: z.number().int().min(1).max(20),
  clubPrestige: z.number().int().min(1).max(5),
  clubName: z.string(),
  leagueName: z.string(),
  leagueId: z.string(),
  hasContinentalCup: z.boolean(),
  playerNationality: z.string(),
  currentStats: z.record(z.string(), z.number()).optional(),
  // Outcomes từ wheels — optional, truyền sau khi tất cả wheels xong
  standingResult: z.number().int().min(1).max(30).nullable().optional(),
  domesticCupResult: z.string().nullable().optional(),
  continentalCupResult: z.string().nullable().optional(),
  continentalCupType: z.string().nullable().optional(),
  nationalCallupResult: z.string().nullable().optional(),
  nationalTournamentResult: z.string().nullable().optional(),
  nationalTournamentType: z.string().nullable().optional(),
  trainingCampActive: z.boolean().optional().default(false),
});

async function getShopItemActiveForSeason(
  playerId: string,
  itemId: string,
  season: number,
): Promise<boolean> {
  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: { shopInventory: true },
  });
  const inventory = (player?.shopInventory as unknown as ShopInventoryEntry[]) ?? [];
  return isShopItemActiveForSeason(inventory, itemId, season);
}

const generateLeagueTableSchema = z.object({
  leagueId: z.string(),
  playerClubId: z.string(),
  playerClubName: z.string(),
  playerStanding: z.number().int().min(1),
});

const startPlayerCareerSchema = z.object({
  gameId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  nationality: z.string(),
  debutAge: z.number().int(),
  /** Optional / ignored — server recomputes from stats. */
  debutOvr: z.number().int().optional(),
  careerLength: z.number().int(),
  height: z.number().int().min(100).max(230),
  weight: z.number().int().min(30).max(200),
  clubId: z.string(),
  clubName: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  position: z.string(),
  // Field player stats (null for GK, undefined never sent)
  pac: z.number().int().nullish(),
  sho: z.number().int().nullish(),
  pas: z.number().int().nullish(),
  dri: z.number().int().nullish(),
  def: z.number().int().nullish(),
  phy: z.number().int().nullish(),
  // GK stats (null for field players, undefined never sent)
  div: z.number().int().nullish(),
  han: z.number().int().nullish(),
  kic: z.number().int().nullish(),
  ref: z.number().int().nullish(),
  spd: z.number().int().nullish(),
  pos: z.number().int().nullish(),
}).strict();

const generateTransferMarketSchema = z.object({
  currentClubId: z.string().nullable(),
  currentClubPrestige: z.number().int(),
  currentClubLeagueTier: z.number().int().min(1).max(2).default(1),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  potential: z.number().int().optional(),
  playerNation: z.string().optional(),
  currentAge: z.number().int().min(14).max(50),
  retireAge: z.number().int().min(15).max(60),
  matchRating: z.number().min(0),
  goals: z.number().int(),
  assists: z.number().int(),
  cleanSheets: z.number().int(),
  position: z.string(),
  contractYearsRemaining: z.number().int().min(0).max(10),
  contractYearsTotal: z.number().int().min(0).max(10),
  currentWageAnnual: z.number().int().min(0),
  willingToMove: z.boolean().optional().default(false),
  isUnemployed: z.boolean().optional().default(false),
  influenceScore: z.number().min(0).max(100).optional(),
});

const resolveProactiveRenewalSchema = z.object({
  currentClubId: z.string(),
  currentClubName: z.string(),
  currentClubLeagueId: z.string(),
  currentClubLeagueName: z.string(),
  currentClubPrestige: z.number().int().min(1).max(5),
  currentClubLeagueTier: z.number().int().min(1).max(2).default(1),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  position: z.string(),
  currentAge: z.number().int(),
  retireAge: z.number().int(),
  matchRating: z.number(),
  goals: z.number().int(),
  assists: z.number().int(),
  cleanSheets: z.number().int(),
  contractYearsRemaining: z.number().int(),
  currentWageAnnual: z.number().int(),
  wageOption: z.enum(["lower", "standard", "higher"]).optional(),
});

const searchClubsForApproachSchema = z.object({
  currentClubId: z.string().nullable().optional(),
  query: z.string().optional(),
  leagueId: z.string().optional(),
  prestigeMin: z.number().int().optional(),
  prestigeMax: z.number().int().optional(),
  page: z.number().int().default(1),
  pageSize: z.number().int().default(8),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  currentAge: z.number().int(),
  retireAge: z.number().int(),
  matchRating: z.number(),
  position: z.string(),
  contractYearsRemaining: z.number().int(),
  isUnemployed: z.boolean().optional(),
  influenceScore: z.number().min(0).max(100).optional(),
});

const resolveShortlistApproachSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  prestige: z.number().int().min(1).max(5),
  leagueTier: z.number().int().min(1).max(2),
  leagueSize: z.number().int().min(2).max(40).optional(),
  previewFee: z.number().int().min(0),
  previewWage: z.number().int().min(0),
  previewYears: z.number().int().min(0).max(10),
  wageOption: z.enum(["lower", "standard", "higher"]).optional().default("standard"),
  clientAcceptChance: z.number().min(0).max(1),
  currentOvr: z.number().int().min(10).max(99),
  effPositionOvr: z.number().optional(),
  currentAge: z.number().int().min(14).max(50),
  matchRating: z.number().min(0).max(10),
  contractYearsRemaining: z.number().int().min(0).max(10),
  isUnemployed: z.boolean().optional().default(false),
  influenceScore: z.number().min(0).max(100).optional(),
});

const completeTransferSchema = z.object({
  gameId: z.string().uuid(),
  playerId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  kind: z.enum(["transfer", "free_agent", "renewal"]),
  clubId: z.string(),
  wageAnnual: z.number().int().min(0),
  contractYears: z.number().int().min(0).max(10),
  transferFee: z.number().int().min(0),
});

const generateCupJourneySchema = z.object({
  type: z.enum(["domestic", "continental", "national"]),
  result: z.string(),
  playerClubId: z.string(),
  playerClubPrestige: z.number().int(),
  cupName: z.string().optional(),
  cupType: z.string().optional(), // e.g. "UCL", "Libertadores" — the game-state cup, not DB club field
  playerNationality: z.string().optional(),
});

const evolvePlayerStatsSchema = z.object({
  currentStats: z.record(z.string(), z.number().int().min(10).max(99)),
  position: z.string(),
  evolutions: z.array(z.object({
    stat: z.string(),
    delta: z.number().int(),
  })),
});

// ============================================================
// SERVER ACTIONS
// ============================================================

async function verifyGameOwnership(gameId: string) {
  return requireGameOwnership(gameId);
}

// Dùng cho action tính toán thuần (không ghi DB gắn với gameId cụ thể, nên
// không check ownership) — chỉ cần chặn truy cập ẩn danh, tránh bot/script gọi
async function requireAuth() {
  return requireAuthenticatedUser();
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
    achievements,
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
    trophies: achievements?.trophies,
    seasonHistory: mergedSeasonHistory,
    ballonDorWins: achievements?.ballonDor,
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
      achievements: achievements as unknown as Prisma.InputJsonValue,
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

export async function simulatePlayerSeasonAction(input: unknown): Promise<SimulatedSeasonResult> {
  await requireAuth();
  const validated = simulatePlayerSeasonSchema.parse(input);

  const clubsCount = await prisma.club.count({
    where: { leagueId: validated.leagueId },
  });

  return simulatePlayerSeasonService({
    age: validated.age,
    ovr: validated.ovr,
    position: validated.position,
    luckRating: validated.luckRating,
    clubPrestige: validated.clubPrestige,
    clubName: validated.clubName,
    leagueName: validated.leagueName,
    leagueClubsCount: clubsCount || 10,
    hasContinentalCup: validated.hasContinentalCup,
    playerNationality: validated.playerNationality,
    currentStats: validated.currentStats,
    standingResult: validated.standingResult,
    domesticCupResult: validated.domesticCupResult,
    continentalCupResult: validated.continentalCupResult,
    continentalCupType: validated.continentalCupType,
    nationalCallupResult: validated.nationalCallupResult,
    nationalTournamentResult: validated.nationalTournamentResult,
    nationalTournamentType: validated.nationalTournamentType,
    trainingCampActive: validated.playerId
      ? await getShopItemActiveForSeason(validated.playerId, "training_camp", validated.age)
      : validated.trainingCampActive,
    appearancePackActive: validated.playerId
      ? await getShopItemActiveForSeason(validated.playerId, "appearance_pack", validated.age)
      : false,
  });
}

export async function generateLeagueTableAction(input: unknown): Promise<TableRow[]> {
  await requireAuth();
  const validated = generateLeagueTableSchema.parse(input);

  const dbClubs = await prisma.club.findMany({
    where: { leagueId: validated.leagueId },
    select: {
      id: true,
      name: true,
      leagueId: true,
      prestige: true,
      continentalType: true,
    },
  });

  return simulateDynamicLeagueTableService(
    validated.playerStanding,
    validated.playerClubName,
    dbClubs
  );
}

export async function startPlayerCareerAction(input: unknown): Promise<CareerSetupResult> {
  const validated = startPlayerCareerSchema.parse(input);
  const user = await verifyGameOwnership(validated.gameId);
  await checkRateLimit(user.id);

  const dbClub = await prisma.club.findUnique({
    where: { id: validated.clubId },
    select: {
      id: true,
      name: true,
      prestige: true,
      continentalType: true,
      league: { select: { id: true, name: true, tier: true } },
    },
  });
  if (!dbClub) throw new Error("CLB khởi đầu không tồn tại.");

  const setup = startPlayerCareerService(
    {
      ...validated,
      clubName: dbClub.name,
      leagueId: dbClub.league.id,
      leagueName: dbClub.league.name,
    },
    dbClub.prestige,
    dbClub.continentalType,
    dbClub.league.tier,
  );
  const publicSetup: Omit<CareerSetupResult, "setupToken"> = {
    playerName: setup.playerName,
    preferredFoot: setup.preferredFoot,
    debutOvr: setup.debutOvr,
    initStint: setup.initStint,
    initStats: setup.initStats,
    initTimeline: setup.initTimeline,
    contractYearsTotal: setup.contractYearsTotal,
    contractYearsRemaining: setup.contractYearsRemaining,
    currentWageAnnual: setup.currentWageAnnual,
    marketValue: setup.marketValue,
  };
  return {
    ...publicSetup,
    setupToken: createCareerSetupToken({
      userId: user.id,
      gameId: validated.gameId,
      slotIndex: validated.slotIndex,
      position: validated.position,
      nationality: validated.nationality,
      debutAge: validated.debutAge,
      careerLength: validated.careerLength,
      height: validated.height,
      weight: validated.weight,
      currentContinentalCup: dbClub.continentalType ?? "none",
      setup: publicSetup,
    }),
  };
}

export async function generateTransferMarketAction(input: unknown): Promise<TransferMarketResult> {
  await requireAuth();
  const validated = generateTransferMarketSchema.parse(input);
  const isUnemployed = validated.isUnemployed || !validated.currentClubId;

  const dbClubs = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      leagueId: true,
      prestige: true,
      league: { select: { name: true, tier: true, prestige: true, country: true, confederation: true } },
    },
  });

  const leagueIds = [...new Set(dbClubs.map((c) => c.leagueId))];
  const leagueSizes = leagueIds.length
    ? await prisma.club.groupBy({
        by: ["leagueId"],
        where: { leagueId: { in: leagueIds } },
        _count: { _all: true },
      })
    : [];
  const leagueSizeById = new Map(
    leagueSizes.map((row) => [row.leagueId, row._count._all] as const),
  );

  const currentClubRow = validated.currentClubId
    ? dbClubs.find((c) => c.id === validated.currentClubId)
    : undefined;
  const currentClubLeagueSize =
    (currentClubRow && leagueSizeById.get(currentClubRow.leagueId)) || 20;

  return generateTransferMarketService({
    currentClubId: validated.currentClubId,
    currentClubPrestige: validated.currentClubPrestige,
    currentClubLeagueTier: validated.currentClubLeagueTier,
    currentClubLeagueSize,
    currentOvr: validated.currentOvr,
    currentStats: validated.currentStats,
    potential: validated.potential,
    playerNation: validated.playerNation,
    currentAge: validated.currentAge,
    retireAge: validated.retireAge,
    matchRating: validated.matchRating,
    goals: validated.goals,
    assists: validated.assists,
    cleanSheets: validated.cleanSheets,
    position: validated.position,
    contractYearsRemaining: validated.contractYearsRemaining,
    contractYearsTotal: validated.contractYearsTotal,
    currentWageAnnual: validated.currentWageAnnual,
    willingToMove: validated.willingToMove,
    isUnemployed,
    influenceScore: validated.influenceScore,
    randomSource: secureRandom,
    clubs: dbClubs.map((c) => ({
      id: c.id,
      name: c.name,
      leagueId: c.leagueId,
      prestige: c.prestige,
      leagueName: c.league?.name,
      leagueTier: c.league?.tier ?? 1,
      leaguePrestige: c.league?.prestige,
      leagueCountry: c.league?.country,
      confederation: c.league?.confederation,
      leagueSize: leagueSizeById.get(c.leagueId) ?? 20,
    })),
  });
}

export async function resolveProactiveRenewalAction(input: unknown): Promise<ResolveProactiveRenewalResult> {
  await requireAuth();
  const validated = resolveProactiveRenewalSchema.parse(input);
  return resolveProactiveRenewalService({ ...validated, randomSource: secureRandom });
}

export async function searchClubsForApproachAction(input: unknown): Promise<{
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}> {
  await requireAuth();
  const validated = searchClubsForApproachSchema.parse(input);

  const where: Prisma.ClubWhereInput = {};
  if (validated.query && validated.query.trim().length > 0) {
    where.name = { contains: validated.query.trim(), mode: "insensitive" };
  }
  if (validated.leagueId && validated.leagueId !== "all") {
    where.leagueId = validated.leagueId;
  }
  if (validated.prestigeMin || validated.prestigeMax) {
    where.prestige = {
      gte: validated.prestigeMin ?? 1,
      lte: validated.prestigeMax ?? 5,
    };
  }
  if (validated.currentClubId) {
    where.id = { not: validated.currentClubId };
  }

  const [dbClubs, totalCount, allLeagues] = await Promise.all([
    prisma.club.findMany({
      where,
      skip: (validated.page - 1) * validated.pageSize,
      take: validated.pageSize,
      select: {
        id: true,
        name: true,
        leagueId: true,
        prestige: true,
      league: { select: { name: true, tier: true, prestige: true, country: true, confederation: true } },
      },
      orderBy: [{ prestige: "desc" }, { name: "asc" }],
    }),
    prisma.club.count({ where }),
    prisma.league.findMany({
      select: { id: true, name: true, tier: true },
      orderBy: [{ tier: "asc" }, { prestige: "desc" }],
    }),
  ]);

  const marketVal = computeMarketValue({
    ovr: validated.currentOvr,
    age: validated.currentAge,
    matchRating: validated.matchRating,
    contractYearsRemaining: validated.contractYearsRemaining,
    position: validated.position,
    currentStats: validated.currentStats,
  });
  const mandatoryBuyout = computeMandatoryBuyout(marketVal, validated.contractYearsRemaining);
  const canApproachGate = validated.contractYearsRemaining <= 1 || validated.isUnemployed;
  const effPositionOvr = computeEffectivePositionOvr(
    validated.position,
    validated.currentStats,
    validated.currentOvr,
  );

  const clubs: ShortlistClubCard[] = dbClubs.map((club) => {
    const apps = expectedAppsAtClub(effPositionOvr, club.prestige, 20);
    const fit = estimateAppsRatio(effPositionOvr, club.prestige);
    const canAfford = clubCanAffordBuyout(club.prestige, club.league?.tier ?? 1, mandatoryBuyout);
    const years = proposeContractYears({
      currentAge: validated.currentAge,
      retireAge: validated.retireAge,
      matchRating: validated.matchRating,
    });
    const wage = randomizeWageAnnual({
      proposedWage: proposeWageAnnual({
      ovr: effPositionOvr,
      age: validated.currentAge,
      currentWage: 500,
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      matchRating: validated.matchRating,
      stepUpPrestige: 0,
      acceptLowerWage: true,
      }),
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      randomSource: secureRandom,
    });

    const acceptChance =
      canApproachGate && canAfford && years > 0
        ? computeApproachAcceptChance({
            ovr: validated.currentOvr,
            effPositionOvr,
            age: validated.currentAge,
            matchRating: validated.matchRating,
            destPrestige: club.prestige,
            destLeagueTier: club.league?.tier ?? 1,
            expectedAppsRatio: fit,
            influenceScore: validated.influenceScore,
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
      leagueName: club.league?.name ?? "Giải đấu",
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      expectedLeagueApps: apps,
      canApproach: Boolean(canApproachGate && canAfford && years > 0),
      canAffordBuyout: canAfford,
      previewFee: validated.contractYearsRemaining <= 0 || validated.isUnemployed ? 0 : mandatoryBuyout,
      previewWage: wage,
      previewYears: years,
      blockReason,
      acceptChance,
    };
  });

  return { clubs, totalCount, leagues: allLeagues };
}

export async function resolveShortlistApproachAction(input: unknown): Promise<ResolveApproachResult> {
  await requireAuth();
  const validated = resolveShortlistApproachSchema.parse(input);
  return resolveApproachService({ ...validated, randomSource: secureRandom });
}

/** Persist the selected destination after the transfer UI has resolved an offer. */
export async function completeTransferAction(input: unknown): Promise<{
  clubName: string;
  leagueName: string;
  fee: number;
  contractYears: number;
  wageAnnual: number;
  age: number;
}> {
  const validated = completeTransferSchema.parse(input);
  await verifyGameOwnership(validated.gameId);

  const player = await prisma.careerPlayer.findFirst({
      where: { id: validated.playerId, gameSessionId: validated.gameId, slotIndex: validated.slotIndex, isRetired: false },
    select: { id: true, checkpointVersion: true, statsTimeline: true, clubStints: true },
  });
  if (!player) throw new Error("Cầu thủ không tồn tại hoặc không thuộc game này");
  if (player.checkpointVersion >= 2) {
    throw new Error("Legacy transfer completion không được phép ghi Career V2.");
  }

  const destination = await prisma.club.findUnique({
    where: { id: validated.clubId },
    select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true, league: { select: { name: true } } },
  });
  if (!destination) throw new Error("CLB đích không tồn tại");

  const timeline = (player.statsTimeline as unknown as StatSnapshot[]) ?? [];
  const snapshot = timeline.at(-1);
  if (!snapshot || typeof snapshot.age !== "number") throw new Error("Thiếu mốc mùa giải hiện tại");
  const currentAge = snapshot.age;

  const stints = [...((player.clubStints as unknown as ClubStint[]) ?? [])];
  const lastStint = stints.at(-1);
  if (validated.kind === "renewal") {
    if (!lastStint || lastStint.clubId !== destination.id) throw new Error("CLB gia hạn không khớp trạng thái hiện tại");
  } else {
    if (lastStint?.clubId === destination.id) throw new Error("Không thể chuyển đến chính CLB hiện tại");
    if (lastStint) {
      lastStint.endAge = currentAge;
      lastStint.yearsAtClub = Math.max(1, currentAge - lastStint.startAge + 1);
      lastStint.ovrAtLeaving = snapshot.ovr;
    }
    stints.push({
      clubId: destination.id,
      clubName: destination.name,
      leagueId: destination.leagueId,
      leagueName: destination.league.name,
      startAge: currentAge + 1,
      endAge: currentAge + 1,
      yearsAtClub: 1,
      ovrAtJoining: snapshot.ovr,
      ovrAtLeaving: snapshot.ovr,
      wageAtJoining: validated.wageAnnual,
      feePaid: validated.transferFee,
    });
  }

  await prisma.careerPlayer.update({
    where: { id: player.id },
    data: {
      clubStints: stints as unknown as Prisma.InputJsonValue,
      currentContinentalCup: destination.continentalType,
      contractYearsTotal: validated.contractYears,
      contractYearsRemaining: validated.contractYears,
      currentWageAnnual: validated.wageAnnual,
      isUnemployed: false,
    },
  });
  revalidatePath(`/classic/${validated.gameId}/draft/${validated.slotIndex}`);
  return { clubName: destination.name, leagueName: destination.league.name, fee: validated.transferFee, contractYears: validated.contractYears, wageAnnual: validated.wageAnnual, age: currentAge + 1 };
}

/** @deprecated Prefer generateTransferMarketAction */
export async function generateTransferOfferAction(input: unknown): Promise<TransferMarketResult> {
  return generateTransferMarketAction(input);
}

export async function generateCupJourneyAction(input: unknown): Promise<string[]> {
  await requireAuth();
  const validated = generateCupJourneySchema.parse(input);

  if (validated.type === "domestic") {
    const playerClub = await getCachedClubCountry(validated.playerClubId);
    const country = playerClub?.league?.country ?? "England";
    const opponents = await getCachedDomesticOpponents(country);

    return generateDomesticCupJourneyService({
      result: validated.result,
      playerClubId: validated.playerClubId,
      playerClubPrestige: validated.playerClubPrestige,
      opponents,
    });
  }

  if (validated.type === "continental") {
    const cupType = validated.cupType ?? "none";
    let allowedTypes: string[];
    if (["UCL", "UEL", "UECL"].includes(cupType)) {
      allowedTypes = ["UCL", "UEL", "UECL"];
    } else if (cupType === "Libertadores" || cupType === "Sudamericana") {
      allowedTypes = ["Libertadores", "Sudamericana"];
    } else if (cupType === "AFC_CL") {
      allowedTypes = ["AFC_CL"];
    } else if (cupType === "CONCACAF_CC") {
      allowedTypes = ["CONCACAF_CC"];
    } else if (cupType === "CAF_CL") {
      allowedTypes = ["CAF_CL"];
    } else {
      allowedTypes = ["UCL", "UEL", "UECL"];
    }

    const opponents = await getCachedContinentalOpponents(allowedTypes);

    return generateContinentalCupJourneyService({
      result: validated.result,
      playerClubId: validated.playerClubId,
      playerClubPrestige: validated.playerClubPrestige,
      cupName: validated.cupName ?? "Champions League",
      opponents,
    });
  }

  const tourneyName = validated.cupName ?? "FIFA World Cup";
  const confederationMap: Record<string, string> = {
    "UEFA Euro": "UEFA",
    "Copa América": "CONMEBOL",
    "AFC Asian Cup": "AFC",
    "CAF Africa Cup of Nations": "CAF",
    "CONCACAF Gold Cup": "CONCACAF",
  };
  const confederation = confederationMap[tourneyName];
  const opponents = await getCachedNationalTeams(confederation);

  return generateNationalTeamJourneyService({
    result: validated.result,
    tourneyName,
    playerNationality: validated.playerNationality ?? "",
    opponents,
  });
}

export async function evolvePlayerStatsAction(input: unknown): Promise<StatsEvolutionResult> {
  await requireAuth();
  const validated = evolvePlayerStatsSchema.parse(input);
  return evolvePlayerStatsService(validated);
}
