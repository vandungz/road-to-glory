/**
 * Player ↔ club quality fit (SoT §7.6).
 * Pure — used by season sim and wheel influence proxy.
 */

export function getClubThreshold(prestige: number): number {
  return 55 + prestige * 6;
}

/** Deterministic appsRatio (no noise) — fit curve + squad-depth bonus. */
export function estimateAppsRatio(ovr: number, clubPrestige: number): number {
  const diff = ovr - getClubThreshold(clubPrestige);

  let base: number;
  if (diff <= -12) {
    if (clubPrestige >= 5) base = 0.22;
    else if (clubPrestige >= 4) base = 0.3;
    else base = 0.38;
  } else if (diff >= -2) {
    base = Math.min(0.9, 0.7 + (diff + 2) * 0.025);
  } else {
    const t = (diff + 12) / 10;
    const floor = clubPrestige >= 5 ? 0.22 : clubPrestige >= 4 ? 0.3 : 0.38;
    base = floor + t * (0.7 - floor);
  }

  const squadDepthBonus = (5 - clubPrestige) * 0.035;
  return Math.min(0.95, Math.max(0.05, base + squadDepthBonus));
}

export function estimateExpectedLeagueApps(
  ovr: number,
  clubPrestige: number,
  leagueSize: number,
): number {
  const leagueMatches = Math.max(1, (Math.max(2, leagueSize) - 1) * 2);
  return Math.max(1, Math.round(leagueMatches * estimateAppsRatio(ovr, clubPrestige)));
}
