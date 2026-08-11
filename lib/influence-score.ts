/**
 * Player Influence Score — career-legacy reputation, derived (not stored as raw input).
 * SoT: docs/core-currency-shop-design.md §3. Pure TypeScript — no React/Prisma.
 *
 * legacyScore (permanent, from achievements/statsTimeline) blended with
 * currentFormIndex (recomputed fresh every checkpoint) via legacyWeight — this
 * replaces a literal "decay" mechanic: nothing earned is ever erased, but current
 * relevance still pulls the blended score up/down season to season.
 */

import { getCareerProgress } from "@/features/wheel/lib/simulation-helpers";

// Verified persisted value (features/wheel/hooks/useCompetitionFlow.ts) — NOT the
// raw wheel sentinel "called_up", which only exists transiently in client flow
// state before being overwritten with this Vietnamese display label.
export const CALLUP_LABEL_CALLED_UP = "Được triệu tập";

const GOOD_TOURNAMENT_RESULTS = new Set(["Semi-Finals", "Winner"]);

// Only trophy.name carries the tier signal — achievements.trophies[].type is a
// coarse bucket ("continental") that doesn't distinguish UCL-tier vs UEL-tier.
const TOP_TIER_CONTINENTAL_NAMES = new Set([
  "UEFA Champions League",
  "Copa Libertadores",
  "AFC Champions League Elite",
  "CONCACAF Champions Cup",
  "CAF Champions League",
]);

export interface TrophyEntry {
  type: "league" | "cup" | "continental" | "international";
  name: string;
  club: string;
  age: number;
}

export interface NationalTeamSeasonEntry {
  type: string;
  callup: string;
  result: string | null;
}

export interface StatsTimelineEntryLite {
  age: number;
  ovr: number;
}

/** 0–35. Diminishing return after ~6 trophies of the same type (no infinite linear stacking). */
export function computeTrophyScore(trophies: TrophyEntry[] | undefined): number {
  if (!trophies || trophies.length === 0) return 0;

  const countByType: Record<string, number> = {};
  let score = 0;

  for (const trophy of trophies) {
    const seen = countByType[trophy.type] ?? 0;
    countByType[trophy.type] = seen + 1;
    // Diminishing weight after the 6th trophy of a given type.
    const decay = seen < 6 ? 1 : 6 / (seen + 1);

    let weight: number;
    if (trophy.type === "league") weight = 1;
    else if (trophy.type === "cup") weight = 0.7;
    else if (trophy.type === "international") weight = 3;
    else weight = TOP_TIER_CONTINENTAL_NAMES.has(trophy.name) ? 2.5 : 1.3;

    score += weight * decay;
  }

  return Math.max(0, Math.min(35, Math.round(score)));
}

/** 0–25. Counts international caps (called-up seasons) + bonus for deep tournament runs. */
export function computeInternationalScore(
  seasonHistory: Record<number, NationalTeamSeasonEntry | { nationalTeam?: NationalTeamSeasonEntry | null } | null | undefined> | undefined,
): number {
  if (!seasonHistory) return 0;

  let caps = 0;
  let goodResults = 0;

  for (const raw of Object.values(seasonHistory)) {
    const nationalTeam = raw && "nationalTeam" in (raw as object) ? (raw as { nationalTeam?: NationalTeamSeasonEntry | null }).nationalTeam : (raw as NationalTeamSeasonEntry | null);
    if (!nationalTeam) continue;
    if (nationalTeam.callup === CALLUP_LABEL_CALLED_UP) {
      caps += 1;
      if (nationalTeam.result && GOOD_TOURNAMENT_RESULTS.has(nationalTeam.result)) {
        goodResults += 1;
      }
    }
  }

  const score = caps * 1.5 + goodResults * 3;
  return Math.max(0, Math.min(25, Math.round(score)));
}

/**
 * 0–20. Win-count only — a `ballonDorNominations` field exists in client code but is
 * dropped by a pre-existing bug before persistence, so nomination/rank tiering isn't
 * reliable data. Do not attempt to read it.
 */
export function computeBallonDorScore(ballonDorWins: number | undefined): number {
  const wins = Math.max(0, ballonDorWins ?? 0);
  return Math.max(0, Math.min(20, wins * 10));
}

/** 0–20. Rewards holding PRIME (ovr >= 85, per core-growth-balance.md §1.1) across many seasons over a single spike. */
export function computeLongevityScore(statsTimeline: StatsTimelineEntryLite[] | undefined): number {
  if (!statsTimeline || statsTimeline.length === 0) return 0;
  const primeSeasons = statsTimeline.filter((s) => s.ovr >= 85).length;
  return Math.max(0, Math.min(20, primeSeasons * 3));
}

export function computeLegacyScore(params: {
  trophies: TrophyEntry[] | undefined;
  seasonHistory: Record<number, unknown> | undefined;
  ballonDorWins: number | undefined;
  statsTimeline: StatsTimelineEntryLite[] | undefined;
}): number {
  const total =
    computeTrophyScore(params.trophies) +
    computeInternationalScore(params.seasonHistory as Record<number, NationalTeamSeasonEntry | { nationalTeam?: NationalTeamSeasonEntry | null } | null> | undefined) +
    computeBallonDorScore(params.ballonDorWins) +
    computeLongevityScore(params.statsTimeline);

  return Math.max(0, Math.min(100, Math.round(total)));
}

/** 0–100, recomputed fresh every checkpoint — never persisted as an input, only the final blend is cached. */
export function computeCurrentFormIndex(params: {
  currentOvr: number;
  peakOvr: number;
  matchRating: number;
  /** 1–5. Unemployed players should pass a neutral fallback (e.g. 2), mirroring transfer.service.ts's effective-prestige fallback. */
  clubPrestige: number;
}): number {
  const peakOvr = Math.max(1, params.peakOvr);
  const ovrRatio = Math.max(0, Math.min(1, params.currentOvr / peakOvr));
  const ratingScore = Math.max(0, Math.min(1, (params.matchRating - 5.5) / (9.0 - 5.5)));
  const prestigeScore = Math.max(0, Math.min(1, (params.clubPrestige - 1) / 4));

  const score = ovrRatio * 55 + ratingScore * 30 + prestigeScore * 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeInfluenceScore(params: {
  legacyScore: number;
  currentFormIndex: number;
  currentAge: number;
  debutAge: number;
  careerLength: number;
}): number {
  const careerProgress = getCareerProgress(params.currentAge, params.debutAge, params.careerLength);
  const legacyWeight = 0.3 + 0.5 * careerProgress;
  const score = legacyWeight * params.legacyScore + (1 - legacyWeight) * params.currentFormIndex;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Small, capped top-up added onto Scout/Approach — SoT §5. Never feeds MV/wage/growth. */
export function influenceTopUp(influenceScore: number | undefined): number {
  if (!influenceScore || influenceScore <= 0) return 0;
  return Math.min(8, Math.round(influenceScore * 0.08));
}
