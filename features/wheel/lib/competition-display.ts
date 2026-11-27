import { getContinentalCupLabel,getDomesticCupNameByLeagueId,getDomesticCupNameFromLeagueName } from "@/lib/competitions";
export {getContinentalCupLabel};
/** Resolve domestic cup label — prefer leagueId when available. */
export function getDomesticCupName(
  leagueNameOrId: string,
  leagueId?: string | null,
): string {
  if (leagueId) {
    const byId = getDomesticCupNameByLeagueId(leagueId);
    if (byId !== "Cup Quốc Gia") return byId;
  }
  const asId = getDomesticCupNameByLeagueId(leagueNameOrId);
  if (asId !== "Cup Quốc Gia") return asId;
  return getDomesticCupNameFromLeagueName(leagueNameOrId);
}

/** Calendar year of a career season (debutAge → 2026). Shared by preview + resolve. */
export function getSeasonCalendarYear(currentAge: number, debutAge: number): number {
  return 2026 + (currentAge - debutAge);
}

/**
 * National tournament display name for a season.
 * World Cup years: calendarYear % 4 === 2 (2026, 2030, …) — matches sim/journey.
 */
export function getNationalTournamentName(
  nationality: string,
  currentAge: number,
  debutAge: number,
  getContinentalCup: (nationality: string) => string,
): string {
  const year = getSeasonCalendarYear(currentAge, debutAge);
  return year % 4 === 2 ? "FIFA World Cup" : getContinentalCup(nationality);
}

export function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

