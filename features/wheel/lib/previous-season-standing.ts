/**
 * Return the previous season's standing only when it belongs to the same
 * club and league as the active season. Legacy records without both IDs are
 * intentionally ignored so an old/stale standing cannot influence a new
 * competition context.
 */
export function getPriorClubStanding(
  seasonHistory: unknown,
  currentAge: number,
  debutAge: number,
  currentClubId: string | null | undefined,
  currentLeagueId: string | null | undefined,
): number | null {
  if (currentAge <= debutAge || !currentClubId || !currentLeagueId) return null;
  if (seasonHistory === null || typeof seasonHistory !== "object" || Array.isArray(seasonHistory)) {
    return null;
  }

  const previous = (seasonHistory as Record<string, unknown>)[String(currentAge - 1)];
  if (previous === null || typeof previous !== "object" || Array.isArray(previous)) return null;
  const record = previous as Record<string, unknown>;
  if (record.clubId !== currentClubId || record.leagueId !== currentLeagueId) return null;

  const standing = record.standing;
  return typeof standing === "number" && Number.isInteger(standing) && standing > 0
    ? standing
    : null;
}
