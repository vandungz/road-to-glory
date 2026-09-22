import { CLUBS } from "@/prisma/data/clubs";
import { LEAGUES } from "@/prisma/data/leagues";
import type { QuickClubOption, QuickConfederation, QuickLeagueOption } from "../types";

export function getQuickModeOptions(): { leagues: QuickLeagueOption[]; clubs: QuickClubOption[] } {
  const topLeagues = LEAGUES.filter((league) => league.tier === 1);
  const leagues: QuickLeagueOption[] = topLeagues.map((league) => ({
    id: league.id,
    name: league.name,
    country: league.country,
    tier: league.tier,
    prestige: league.prestige,
    domesticCupName: league.domesticCupName,
    confederation: league.confederation as QuickConfederation,
  }));
  const clubs: QuickClubOption[] = CLUBS
    .map((club) => {
      const league = topLeagues.find((item) => item.id === club.leagueId);
      return {
        id: club.id,
        name: club.name,
        leagueId: club.leagueId,
        leagueName: league?.name ?? club.leagueId,
        leagueTier: league?.tier ?? 99,
        prestige: club.prestige,
        continentalType: club.continentalType,
      };
    })
    .filter((club) => club.leagueTier === 1);
  return { leagues, clubs };
}
