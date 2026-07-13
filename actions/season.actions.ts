"use server";

import { z } from "zod";
import { revalidatePath, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
import { generateTransferOfferService, type TransferOfferResult } from "@/features/transfer/services/transfer.service";
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
}

interface SaveProgressParams {
  gameId: string;
  playersUpdate: PlayerUpdateInput[];
}

interface SeasonProgressUpdate {
  playerId: string;
  statsTimeline: any[];
  clubStints: any[];
  events: any[];
  currentContinentalCup: string;
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
  debutOvr: z.number().int(),
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

const generateTransferOfferSchema = z.object({
  currentClubId: z.string(),
  currentClubPrestige: z.number().int(),
  currentOvr: z.number().int(),
  matchRating: z.number().min(0),
  goals: z.number().int(),
  assists: z.number().int(),
  cleanSheets: z.number().int(),
  position: z.string(),
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { userId: true },
  });
  if (session?.userId !== user.id) throw new Error("Forbidden");
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
        },
      })
    )
  );

  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}

export async function updateSeasonProgressAction(params: SeasonProgressUpdate): Promise<void> {
  const { playerId, statsTimeline, clubStints, events, currentContinentalCup } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
      events,
      currentContinentalCup,
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
  });
}

export async function generateLeagueTableAction(input: unknown): Promise<TableRow[]> {
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

  const dbClub = await prisma.club.findUnique({
    where: { id: validated.clubId },
    select: { prestige: true, continentalType: true },
  });

  return startPlayerCareerService(
    validated,
    dbClub?.prestige ?? 3,
    dbClub?.continentalType ?? "none"
  );
}

export async function generateTransferOfferAction(input: unknown): Promise<TransferOfferResult> {
  const validated = generateTransferOfferSchema.parse(input);

  // Compute prestige range server-side to avoid full table scan (~292 clubs)
  const expectedPrestige = Math.min(5, Math.max(1, Math.round((validated.currentOvr - 50) / 8)));
  const minPrestige = Math.max(1, expectedPrestige - 1);
  const maxPrestige = Math.min(5, expectedPrestige + 1);

  const dbClubs = await prisma.club.findMany({
    where: {
      prestige: { gte: minPrestige, lte: maxPrestige },
      id: { not: validated.currentClubId },
    },
    select: {
      id: true,
      name: true,
      leagueId: true,
      prestige: true,
      league: { select: { name: true } },
    },
  });

  return generateTransferOfferService({
    currentClubId: validated.currentClubId,
    currentClubPrestige: validated.currentClubPrestige,
    currentOvr: validated.currentOvr,
    matchRating: validated.matchRating,
    goals: validated.goals,
    assists: validated.assists,
    cleanSheets: validated.cleanSheets,
    position: validated.position,
    clubs: dbClubs.map((c) => ({ ...c, leagueName: c.league?.name })),
  });
}

export async function generateCupJourneyAction(input: unknown): Promise<string[]> {
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
    } else if (cupType === "Libertadores") {
      allowedTypes = ["Libertadores"];
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
  const validated = evolvePlayerStatsSchema.parse(input);
  return evolvePlayerStatsService(validated);
}
