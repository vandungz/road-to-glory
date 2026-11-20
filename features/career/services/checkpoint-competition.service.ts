import type { Prisma } from "@/app/generated/prisma/client";
import { secureRandom } from "@/lib/secure-random";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getContinentalCupLabel, getNationalTournamentName } from "@/features/wheel/lib/simulation-helpers";
import { simulateDynamicLeagueTableService } from "@/features/season/services/table-simulator.service";
import {
  generateContinentalCupJourneyService,
  generateDomesticCupJourneyService,
  generateNationalTeamJourneyService,
} from "@/features/season/services/cup-journey.service";
import { continentalOpponentTypes, tournamentConfederation } from "@/features/season/services/competition-opponents";
import type { CheckpointJson, WheelCheckpointResolverContext, WheelResolution } from "./checkpoint-helpers";

const clubSelect = { id: true, name: true, prestige: true, leagueId: true, continentalType: true, league: { select: { prestige: true } } } as const;

export async function attachCompetitionDetails(
  tx: Prisma.TransactionClient,
  context: WheelCheckpointResolverContext,
  stepKey: string,
  resolution: WheelResolution,
): Promise<WheelResolution> {
  const { currentClub: club, player, season } = context;
  const { outcome } = resolution;
  const runtime = resolution.seasonRuntimeState as Record<string, CheckpointJson> | undefined;
  let details;
  if (stepKey === "standing" && club && typeof outcome === "number") {
    const clubs = await tx.club.findMany({ where: { leagueId: club.leagueId }, select: clubSelect });
    details = { leagueTable: simulateDynamicLeagueTableService(outcome, club.name, clubs, { randomSource: secureRandom }) };
  } else if (stepKey === "domestic_cup" && club && typeof outcome === "string") {
    const opponents = await tx.club.findMany({ where: { league: { country: club.leagueCountry } }, select: clubSelect });
    details = { domesticCupJourney: generateDomesticCupJourneyService({
      result: outcome, playerClubId: club.id, playerClubPrestige: club.prestige, opponents, randomSource: secureRandom,
    }) };
  } else if (stepKey === "continental_cup" && club && typeof outcome === "string") {
    const type = typeof runtime?.continentalCupType === "string" ? runtime.continentalCupType : player.currentContinentalCup;
    const opponents = await tx.club.findMany({ where: { continentalType: { in: continentalOpponentTypes(type) } }, select: clubSelect });
    details = { continentalCupJourney: generateContinentalCupJourneyService({
      result: outcome, playerClubId: club.id, playerClubPrestige: club.prestige, cupName: getContinentalCupLabel(type), opponents, randomSource: secureRandom,
    }) };
  } else if (stepKey === "national_callup" || (stepKey === "national_tournament" && typeof outcome === "string")) {
    const tournament = getNationalTournamentName(player.nationality, season.age, player.debutAge, getNationalContinentalCup);
    if (stepKey === "national_tournament" && typeof outcome === "string") {
      const confederation = tournamentConfederation(tournament);
      const opponents = await tx.nationalTeam.findMany({
        where: confederation ? { confederation } : undefined,
        select: { id: true, name: true, nationality: true, confederation: true, tier: true },
      });
      details = {
        nationalTournamentType: tournament,
        nationalTeamJourney: generateNationalTeamJourneyService({
          result: outcome, tourneyName: tournament, playerNationality: player.nationality, opponents, randomSource: secureRandom,
        }),
      };
    } else {
      details = { nationalTournamentType: tournament };
    }
  }
  if (!details) return resolution;

  return {
    ...resolution,
    publicResult: { label: resolution.publicResult ?? String(outcome), ...details } as CheckpointJson,
    seasonRuntimeState: { ...runtime, ...details } as CheckpointJson,
  };
}
