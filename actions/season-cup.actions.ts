"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { generateDomesticCupJourneyService, generateContinentalCupJourneyService, generateNationalTeamJourneyService } from "@/features/season/services/cup-journey.service";
import { evolvePlayerStatsService, type StatsEvolutionResult } from "@/features/player/services/stats-evolution.service";
import { generateCupJourneySchema, evolvePlayerStatsSchema } from "./season-action-contracts";

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


async function requireAuth() { return requireAuthenticatedUser(); }

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
