"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
}

interface SaveProgressParams {
  gameId: string;
  playersUpdate: PlayerUpdateInput[];
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
  pac: z.number().int(),
  sho: z.number().int(),
  pas: z.number().int(),
  dri: z.number().int(),
  def: z.number().int(),
  phy: z.number().int(),
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
  playerNationality: z.string().optional(),
});

const evolvePlayerStatsSchema = z.object({
  currentStats: z.object({
    pac: z.number().int().min(10).max(99),
    sho: z.number().int().min(10).max(99),
    pas: z.number().int().min(10).max(99),
    dri: z.number().int().min(10).max(99),
    def: z.number().int().min(10).max(99),
    phy: z.number().int().min(10).max(99),
  }),
  position: z.string(),
  evolutions: z.array(z.object({
    stat: z.string(),
    delta: z.number().int(),
  })),
});

// ============================================================
// SERVER ACTIONS
// ============================================================

export async function saveSeasonProgress(params: SaveProgressParams) {
  const { gameId, playersUpdate } = params;

  console.log(`[saveSeasonProgress] Saving season progress for game: ${gameId}...`);

  await prisma.$transaction(
    playersUpdate.map((player) =>
      prisma.careerPlayer.update({
        where: { id: player.id },
        data: {
          statsTimeline: player.statsTimeline,
          clubStints: player.clubStints,
          events: player.events,
          slotIndex: player.slotIndex,
        },
      })
    )
  );

  console.log(`[saveSeasonProgress] Successfully saved progression for ${playersUpdate.length} players.`);

  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}

export async function completeGameSession(gameId: string) {
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

  const dbClubs = await prisma.club.findMany({
    select: { id: true, name: true, leagueId: true, prestige: true },
  });

  const dbLeagues = await prisma.league.findMany({
    select: { id: true, name: true },
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
    clubs: dbClubs,
    leagues: dbLeagues,
  });
}

export async function generateCupJourneyAction(input: unknown): Promise<string[]> {
  const validated = generateCupJourneySchema.parse(input);

  if (validated.type === "domestic") {
    const playerClub = await prisma.club.findUnique({
      where: { id: validated.playerClubId },
      select: {
        league: { select: { country: true } }
      }
    });

    const country = playerClub?.league?.country ?? "England";

    const dbClubs = await prisma.club.findMany({
      where: {
        league: { country }
      },
      select: {
        id: true,
        name: true,
        prestige: true,
        leagueId: true,
        continentalType: true,
      }
    });

    return generateDomesticCupJourneyService({
      result: validated.result,
      playerClubId: validated.playerClubId,
      playerClubPrestige: validated.playerClubPrestige,
      opponents: dbClubs,
    });
  } 
  
  if (validated.type === "continental") {
    // 1. Query lấy continentalType của CLB người chơi
    const playerClub = await prisma.club.findUnique({
      where: { id: validated.playerClubId },
      select: { continentalType: true }
    });

    const pType = playerClub?.continentalType ?? "none";

    // 2. Phân nhóm các giải đấu châu lục theo confederation địa lý
    let allowedTypes: string[] = [];
    if (["UCL", "UEL", "UECL"].includes(pType)) {
      allowedTypes = ["UCL", "UEL", "UECL"];
    } else if (pType === "Libertadores") {
      allowedTypes = ["Libertadores"];
    } else if (pType === "AFC_CL") {
      allowedTypes = ["AFC_CL"];
    } else if (pType === "CONCACAF_CC") {
      allowedTypes = ["CONCACAF_CC"];
    } else if (pType === "CAF_CL") {
      allowedTypes = ["CAF_CL"];
    } else {
      allowedTypes = pType !== "none" ? [pType] : ["UCL", "UEL", "UECL", "Libertadores", "AFC_CL", "CONCACAF_CC", "CAF_CL"];
    }

    // 3. Query các câu lạc bộ đối thủ thuộc cùng confederation địa lý
    const dbClubs = await prisma.club.findMany({
      where: {
        continentalType: { in: allowedTypes }
      },
      select: {
        id: true,
        name: true,
        prestige: true,
        leagueId: true,
        continentalType: true,
      }
    });

    return generateContinentalCupJourneyService({
      result: validated.result,
      playerClubId: validated.playerClubId,
      playerClubPrestige: validated.playerClubPrestige,
      cupName: validated.cupName ?? "Champions League",
      opponents: dbClubs,
    });
  }

  return generateNationalTeamJourneyService({
    result: validated.result,
    tourneyName: validated.cupName ?? "FIFA World Cup",
    playerNationality: validated.playerNationality ?? "Vietnam",
  });
}

export async function evolvePlayerStatsAction(input: unknown): Promise<StatsEvolutionResult> {
  const validated = evolvePlayerStatsSchema.parse(input);
  return evolvePlayerStatsService(validated);
}
