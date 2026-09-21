import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import {
  getPerAppRates,
  applyPrestigeToCsRate,
  clampCompetitionStats,
  type CompContext,
} from "@/lib/season-stat-rates";
import { getClubThreshold } from "@/lib/club-fit";

// ── Match counts deterministic từ outcomes ──────────────────────────────────

export function getCupMatches(result: string | null | undefined): number {
  if (result === "Winner" || result === "Runner-Up") return 6;
  if (result === "Semi-Finals") return 5;
  if (result === "Quarter-Finals") return 4;
  if (result === "Round of 16") return 3;
  if (result === "Round of 32") return 2;
  if (result === "Early Exit") return 1;
  return 2; // fallback
}

export function getContinentalMatches(result: string | null | undefined): number {
  if (result === "Winner" || result === "Runner-Up") return 13;
  if (result === "Semi-Finals") return 10;
  if (result === "Quarter-Finals") return 8;
  if (result === "Round of 16") return 8;
  if (result === "Group Stage" || result === "Early Exit") return 6;
  return 6; // fallback
}

export function getNationalMatches(
  callup: string | null | undefined,
  result: string | null | undefined
): number {
  if (callup !== "called_up") return 0;
  if (result === "Winner" || result === "Runner-Up") return 7;
  if (result === "Semi-Finals") return 6;
  if (result === "Quarter-Finals") return 5;
  if (result === "Round of 16") return 4;
  if (result === "Group Stage") return 3;
  return 3;
}

// ── Apps ratio với standing high impact ────────────────────────────────────

export function getStandingBonus(standing: number | null | undefined): number {
  if (!standing) return 0;
  if (standing === 1) return 0.12;
  if (standing <= 4) return 0.06;
  if (standing <= 10) return 0;
  if (standing <= 15) return -0.06;
  return -0.12;
}

// ── Team Clean Sheet Bound for cup/continental/national (SoT core-growth-loop-fixes-design.md
// §4.1) — result-tier → assumed team CS ratio, mirroring how league already derives its bound
// from standingResult. Kept separate from league's continuous standing-based formula since
// these 3 use discrete result strings, not a numeric standing.

export const CUP_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Round of 32": 0.30, "Early Exit": 0.25,
};
export const CONTINENTAL_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Group Stage": 0.30, "Early Exit": 0.30,
};
export const NATIONAL_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Group Stage": 0.30,
};

export function estimateMaxTeamCS(matches: number, ratio: number | undefined): number | undefined {
  if (matches <= 0 || ratio == null) return undefined;
  return Math.max(1, Math.round(matches * ratio));
}

// ── Goals/Assists/CleanSheets — apps × rate(position) (SoT §7.0 & §7.7 & §7.8) ────────────

export function rollCompetitionOutput(
  position: string,
  ovr: number,
  clubPrestige: number,
  apps: number,
  context: CompContext,
  currentStats?: Record<string, number>,
  maxTeamCleanSheets?: number,
  randomSource: RandomSource = resolveRandom,
): { goals: number; assists: number; cleanSheets: number } {
  if (apps <= 0) return { goals: 0, assists: 0, cleanSheets: 0 };

  const rates = getPerAppRates(position, ovr, context, currentStats);
  const rateCs = applyPrestigeToCsRate(rates.cleanSheets, clubPrestige);
  const noise = () => 1 + (randomSource() * 0.4 - 0.2);

  let goals = Math.round(apps * rates.goals * noise());
  let assists = Math.round(apps * rates.assists * noise());
  let cleanSheets = ["GK", "CB", "LB", "RB", "CDM", "CM"].includes(position)
    ? Math.round(apps * rateCs * noise())
    : 0;

  // GK: rare assist instead of rate noise sometimes
  if (position === "GK") {
    goals = 0;
    assists = randomSource() > 0.97 ? 1 : 0;
  }

  // Bound player CS by Team Result Invariant (SoT §7.8)
  if (maxTeamCleanSheets !== undefined) {
    cleanSheets = Math.min(cleanSheets, maxTeamCleanSheets);
  }

  return clampCompetitionStats(position, apps, goals, assists, cleanSheets);
}

// ── Match Rating per competition ───────────────────────────────────────────

/** SoT §7.1 (Updated 2026-08-03): Superstar player contributions (G/A/CS) are preserved 100% (scale 1.0). */
function getOverqualifyPerfScale(): number {
  return 1.0;
}

// Per-specific-position rating weights (SoT core-growth-loop-fixes-design.md §2.1) —
// matches the 9-bucket philosophy already locked for effectivePositionOvr
// (core-transfer-design.md §12.1). Replaces the old 3-bucket if/else which made LM/RM
// always contribute 0 to rating and silently dropped CM's already-simulated clean sheets.
const POSITION_RATING_WEIGHTS: Record<string, { ga: number; cs: number }> = {
  ST: { ga: 2.0, cs: 0 },
  LW: { ga: 1.8, cs: 0 },
  RW: { ga: 1.8, cs: 0 },
  CAM: { ga: 1.9, cs: 0 },
  LM: { ga: 1.6, cs: 0 },
  RM: { ga: 1.6, cs: 0 },
  CM: { ga: 1.2, cs: 1.0 },
  CDM: { ga: 0.9, cs: 1.3 },
  LB: { ga: 0.3, cs: 1.8 },
  RB: { ga: 0.3, cs: 1.8 },
  CB: { ga: 0, cs: 2.2 },
  GK: { ga: 0, cs: 2.2 },
};

export function calcRating(
  position: string,
  ovr: number,
  luckRating: number,
  clubPrestige: number,
  compStats: { goals: number; assists: number; cleanSheets: number; apps: number },
  standingBonus = 0,
  /** docs/core-currency-shop-design.md §6.2 — "Training Camp" shop item, flat rating bonus. */
  perfBonus = 0,
  randomSource: RandomSource = resolveRandom,
): number {
  if (compStats.apps === 0) return 0;

  // SoT §7.3: rating relative to club environment (capped)
  const ovrVsClub = Math.max(-1.2, Math.min(1.2, (ovr - getClubThreshold(clubPrestige)) * 0.01));
  let base = 6.0 + ovrVsClub + (luckRating / 20) * 0.25 + standingBonus + perfBonus;

  const perfScale = getOverqualifyPerfScale();

  const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
  const csFactor = compStats.cleanSheets / compStats.apps;
  const weights = POSITION_RATING_WEIGHTS[position] ?? { ga: 1.0, cs: 1.0 };
  base += (gaFactor * weights.ga + csFactor * weights.cs) * perfScale;

  base += randomSource() * 0.3 - 0.15;
  return Math.min(9.0, Math.max(5.5, Math.round(base * 100) / 100));
}
