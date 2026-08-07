"use server";

import { z } from "zod";
import { revalidatePath, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

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
} from "@/lib/transfer-economy";
import { estimateAppsRatio } from "@/lib/club-fit";
import { 
  generateDomesticCupJourneyService, 
  generateContinentalCupJourneyService, 
  generateNationalTeamJourneyService 
} from "@/features/season/services/cup-journey.service";
import { evolvePlayerStatsService, type StatsEvolutionResult } from "@/features/player/services/stats-evolution.service";

// ============================================================
// TYPES & SCHEMAS
// ============================================================

interface PlayerUpdateInput {
  id: string;
  statsTimeline: any[];
  clubStints: any[];
  events: any[];
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
  statsTimeline: any[];
  clubStints: any[];
  achievements: any;
  currentContinentalCup: string;
  seasonHistory: Record<number, any>;
  contractYearsTotal?: number;
  contractYearsRemaining?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  isUnemployed?: boolean;
}

const simulatePlayerSeasonSchema = z.object({
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
});

const generateLeagueTableSchema = z.object({
  leagueId: z.string(),
  playerClubId: z.string(),
  playerClubName: z.string(),
  playerStanding: z.number().int().min(1),
});

const startPlayerCareerSchema = z.object({
  nationality: z.string(),
  debutAge: z.number().int(),
  /** Optional / ignored — server recomputes from stats. */
  debutOvr: z.number().int().optional(),
  careerLength: z.number().int(),
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
});

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

async function verifyGameOwnership(gameId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await checkRateLimit(user.id);
      const session = await prisma.gameSession.findUnique({
        where: { id: gameId },
        select: { userId: true },
      });
      if (session?.userId && session.userId !== user.id) {
        throw new Error("Forbidden");
      }
    }
  } catch (err: any) {
    if (err.message === "Forbidden") throw err;
    // Allow guest play / local dev mode when no user is logged in
  }
}

// Dùng cho action tính toán thuần (không ghi DB gắn với gameId cụ thể, nên
// không check ownership) — chỉ cần chặn truy cập ẩn danh, tránh bot/script gọi
async function requireAuth(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await checkRateLimit(user.id);
    }
  } catch (err) {
    // In local dev mode or guest play without active Supabase session, fail gracefully without throwing Unauthorized
  }
}

export async function saveSeasonProgress(params: SaveProgressParams) {
  const { gameId, playersUpdate } = params;
  await verifyGameOwnership(gameId);

  await prisma.$transaction(
    playersUpdate.map((player) =>
      prisma.careerPlayer.update({
        where: { id: player.id },
        data: {
          statsTimeline: player.statsTimeline,
          clubStints: player.clubStints,
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

export async function updateSeasonProgressAction(params: SeasonProgressUpdate): Promise<void> {
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
  } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await checkRateLimit(user.id);

  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: { gameSession: { select: { userId: true } } },
  });
  if (player?.gameSession.userId !== user.id) throw new Error("Forbidden");

  await prisma.careerPlayer.update({
    where: { id: playerId },
    data: {
      statsTimeline,
      clubStints,
      achievements,
      currentContinentalCup,
      seasonHistory,
      ...(contractYearsTotal !== undefined ? { contractYearsTotal } : {}),
      ...(contractYearsRemaining !== undefined ? { contractYearsRemaining } : {}),
      ...(currentWageAnnual !== undefined ? { currentWageAnnual } : {}),
      ...(marketValue !== undefined ? { marketValue } : {}),
      ...(isUnemployed !== undefined ? { isUnemployed } : {}),
    },
  });
}

export async function completeGameSession(gameId: string) {
  await verifyGameOwnership(gameId);
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
  await requireAuth();
  const validated = startPlayerCareerSchema.parse(input);

  const dbClub = await prisma.club.findUnique({
    where: { id: validated.clubId },
    select: {
      prestige: true,
      continentalType: true,
      league: { select: { tier: true } },
    },
  });

  return startPlayerCareerService(
    validated,
    dbClub?.prestige ?? 3,
    dbClub?.continentalType ?? "none",
    dbClub?.league?.tier ?? 1,
  );
}

export async function generateTransferMarketAction(input: unknown): Promise<TransferMarketResult> {
  await requireAuth();
  const validated = generateTransferMarketSchema.parse(input);
  const isUnemployed = validated.isUnemployed || !validated.currentClubId;

  const expectedPrestige = Math.min(5, Math.max(1, Math.round((validated.currentOvr - 50) / 8)));
  const minPrestige = Math.max(1, expectedPrestige - 2);
  const maxPrestige = Math.min(5, expectedPrestige + 2);

  const dbClubs = await prisma.club.findMany({
    where: isUnemployed
      ? { prestige: { gte: minPrestige, lte: maxPrestige } }
      : {
          OR: [
            { id: validated.currentClubId! },
            { prestige: { gte: minPrestige, lte: maxPrestige } },
          ],
        },
    select: {
      id: true,
      name: true,
      leagueId: true,
      prestige: true,
      league: { select: { name: true, tier: true } },
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
    clubs: dbClubs.map((c) => ({
      id: c.id,
      name: c.name,
      leagueId: c.leagueId,
      prestige: c.prestige,
      leagueName: c.league?.name,
      leagueTier: c.league?.tier ?? 1,
      leagueSize: leagueSizeById.get(c.leagueId) ?? 20,
    })),
  });
}

export async function resolveProactiveRenewalAction(input: unknown): Promise<ResolveProactiveRenewalResult> {
  await requireAuth();
  const validated = resolveProactiveRenewalSchema.parse(input);
  return resolveProactiveRenewalService(validated);
}

export async function searchClubsForApproachAction(input: unknown): Promise<{
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}> {
  await requireAuth();
  const validated = searchClubsForApproachSchema.parse(input);

  const where: any = {};
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
        league: { select: { name: true, tier: true } },
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
    const wage = proposeWageAnnual({
      ovr: validated.currentOvr,
      age: validated.currentAge,
      currentWage: 500,
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      matchRating: validated.matchRating,
      stepUpPrestige: 0,
      acceptLowerWage: true,
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
  return resolveApproachService(validated);
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
