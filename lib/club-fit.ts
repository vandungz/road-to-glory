/**
 * Player ↔ club quality fit (SoT §7.6).
 * Pure — used by season sim and wheel influence proxy.
 */

const REGULAR_ROLE_OVR_BY_PRESTIGE: Record<number, number> = {
  1: 55,
  2: 62,
  3: 69,
  4: 76,
  5: 83,
};

const ROLE_CURVE = [
  { gap: -18, ratio: 0.2 },
  { gap: -12, ratio: 0.36 },
  { gap: -6, ratio: 0.55 },
  { gap: 0, ratio: 0.72 },
  { gap: 6, ratio: 0.84 },
  { gap: 12, ratio: 0.91 },
];

function clampPrestige(prestige: number): number {
  return Math.min(5, Math.max(1, Math.round(prestige)));
}

function interpolateRoleRatio(gap: number): number {
  if (gap <= ROLE_CURVE[0].gap) return ROLE_CURVE[0].ratio;
  const last = ROLE_CURVE[ROLE_CURVE.length - 1];
  if (gap >= last.gap) return last.ratio;

  for (let i = 1; i < ROLE_CURVE.length; i++) {
    const prev = ROLE_CURVE[i - 1];
    const next = ROLE_CURVE[i];
    if (gap <= next.gap) {
      const t = (gap - prev.gap) / (next.gap - prev.gap);
      return prev.ratio + (next.ratio - prev.ratio) * t;
    }
  }

  return last.ratio;
}

export function getClubThreshold(prestige: number): number {
  return REGULAR_ROLE_OVR_BY_PRESTIGE[clampPrestige(prestige)];
}

/** Deterministic appsRatio (no noise) — fit curve + squad-depth bonus. */
export function estimateAppsRatio(ovr: number, clubPrestige: number): number {
  const prestige = clampPrestige(clubPrestige);
  const roleGap = ovr - getClubThreshold(prestige);
  const roleRatio = interpolateRoleRatio(roleGap);
  const squadDepthAdjustment = (3 - prestige) * 0.025;

  return Math.min(0.95, Math.max(0.08, roleRatio + squadDepthAdjustment));
}

export function estimateExpectedLeagueApps(
  ovr: number,
  clubPrestige: number,
  leagueSize: number,
): number {
  const leagueMatches = Math.max(1, (Math.max(2, leagueSize) - 1) * 2);
  return Math.max(1, Math.round(leagueMatches * estimateAppsRatio(ovr, clubPrestige)));
}
