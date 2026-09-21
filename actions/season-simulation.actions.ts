"use server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { isShopItemActiveForSeason, type ShopInventoryEntry } from "@/lib/shop-catalog";
import { simulatePlayerSeasonService, type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { simulateDynamicLeagueTableService, type TableRow } from "@/features/season/services/table-simulator.service";
import { startPlayerCareerService, type CareerSetupResult } from "@/features/career/services/career-setup.service";
import { createCareerSetupToken } from "@/features/career/services/career-setup-token.service";
import { generateLeagueTableSchema, simulatePlayerSeasonSchema, startPlayerCareerSchema } from "./season-action-contracts";

async function getShopItemActiveForSeason(playerId: string, itemId: string, season: number): Promise<boolean> {
  const player = await prisma.careerPlayer.findUnique({ where: { id: playerId }, select: { shopInventory: true } });
  const inventory = (player?.shopInventory as unknown as ShopInventoryEntry[]) ?? [];
  return isShopItemActiveForSeason(inventory, itemId, season);
}

async function requireAuth() { return requireAuthenticatedUser(); }
async function verifyGameOwnership(gameId: string) { return requireGameOwnership(gameId); }

export async function simulatePlayerSeasonAction(input: unknown): Promise<SimulatedSeasonResult> {
  await requireAuth();
  const validated = simulatePlayerSeasonSchema.parse(input);

  const [leagueClubs, leagueRow] = await Promise.all([
    prisma.club.findMany({
      where: { leagueId: validated.leagueId },
      select: { id: true, name: true, prestige: true },
      orderBy: { name: "asc" },
    }),
    prisma.league.findUnique({ where: { id: validated.leagueId }, select: { tier: true } }),
  ]);

  return simulatePlayerSeasonService({
    age: validated.age,
    ovr: validated.ovr,
    position: validated.position,
    luckRating: validated.luckRating,
    clubPrestige: validated.clubPrestige,
    clubName: validated.clubName,
    leagueName: validated.leagueName,
    leagueTier: leagueRow?.tier,
    leagueClubsCount: leagueClubs.length,
    leagueClubs,
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

