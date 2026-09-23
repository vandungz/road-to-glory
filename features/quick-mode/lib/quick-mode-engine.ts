import { getClubThreshold } from "@/lib/club-fit";
import { DEBUT_AGE_POOL } from "@/lib/wheel-engine/weight-calculator";
import type { WeightedItem } from "@/lib/wheel-engine/spin-resolver";
import { getTraitPool } from "./traits";
import type { QuickClubOption, QuickConfederation, QuickCountValue, QuickInternationalCupType, QuickLeagueOption, QuickPosition, QuickStatKey, QuickStats } from "../types";

export const QUICK_STAT_KEYS: Record<QuickPosition, readonly QuickStatKey[]> = {
  GK: ["div", "han", "kic", "ref", "spd", "pos", "iq"],
  LB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  CB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  RB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  CDM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  CM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  CAM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  LW: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  RW: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  LM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  RM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
  ST: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
};

const STAT_LABELS: Record<QuickStatKey, string> = {
  pac: "Pace", sho: "Shooting", dri: "Dribbling", pas: "Passing", str: "Strength", def: "Defending", iq: "Football IQ",
  div: "Diving", han: "Handling", kic: "Kicking", ref: "Reflexes", spd: "Speed", pos: "Positioning",
};

export function getQuickStatKeys(position: QuickPosition): readonly QuickStatKey[] {
  return QUICK_STAT_KEYS[position];
}

export function getQuickStatLabel(key: QuickStatKey): string {
  return STAT_LABELS[key];
}

export function getQuickOverall(stats: QuickStats): number {
  const values = Object.values(stats).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return 55;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.min(99, Math.max(55, Math.round(43 + average * 5.7)));
}

export function quickClubGate(prestige: number): number {
  return getClubThreshold(prestige);
}

export function isQuickClubEligible(club: QuickClubOption, stats: QuickStats): boolean {
  const overall = getQuickOverall(stats);
  return club.prestige >= quickClubPrestigeGate(overall);
}

export function quickLeaguePrestigeGate(overall: number): number {
  if (overall >= 83) return 5;
  if (overall >= 76) return 4;
  if (overall >= 69) return 3;
  if (overall >= 62) return 2;
  return 1;
}

/**
 * Remove clubs below the player's level inside a league.
 * A high OVR must still be able to choose the strongest clubs.
 */
export function quickClubPrestigeGate(overall: number): number {
  if (overall >= 86) return 5;
  if (overall >= 77) return 4;
  if (overall >= 69) return 3;
  if (overall >= 62) return 2;
  return 1;
}

export function isQuickLeagueEligible(league: QuickLeagueOption, stats: QuickStats, clubs: QuickClubOption[]): boolean {
  const overall = getQuickOverall(stats);
  return league.prestige >= quickLeaguePrestigeGate(overall)
    && clubs.some((club) => club.leagueId === league.id && isQuickClubEligible(club, stats));
}

export function getStatPool(): WeightedItem<number>[] {
  return Array.from({ length: 10 }, (_, index) => ({ value: index + 1, weight: 1 }));
}

export function getClubCountPool(): WeightedItem<number>[] {
  return [1, 2, 3, 4, 5].map((value) => ({ value, weight: 1 }));
}

export function getQuickCareerLengthPool(): WeightedItem<number>[] {
  return Array.from({ length: 16 }, (_, index) => ({ value: index + 10, weight: 1 }));
}

export function getImprovementCountPool(max: number): WeightedItem<number>[] {
  const safeMax = Math.max(0, Math.floor(max));
  return Array.from({ length: safeMax }, (_, index) => ({ value: index + 1, weight: 1 }));
}

export function getSeasonCountPool(max = 5): WeightedItem<number>[] {
  const safeMax = Math.max(1, Math.min(30, Math.floor(max)));
  return Array.from({ length: safeMax }, (_, index) => {
    const value = index + 1;
    return { value, weight: value === safeMax ? 8 : Math.max(8, 36 - value * 5) };
  });
}

export function getBoundedCountPool(max: number): WeightedItem<number>[] {
  const safeMax = Math.max(0, Math.floor(max));
  if (safeMax === 0) return [{ value: 0, weight: 1 }];
  return Array.from({ length: safeMax + 1 }, (_, value) => ({ value, weight: value === 0 ? 38 : Math.max(8, 30 - value * 5) }));
}

function getClubAchievementStrength(prestige: number, stats: QuickStats): number {
  const clubStrength = clampUnit((prestige - 1) / 4);
  const playerStrength = clampUnit((getQuickOverall(stats) - 50) / 50);
  return clampUnit(clubStrength * 0.65 + playerStrength * 0.35);
}

function getAchievementCountPool(max: number, expectedRate: number): WeightedItem<number>[] {
  const safeMax = Math.max(0, Math.floor(max));
  if (safeMax === 0) return [{ value: 0, weight: 1 }];
  const expected = safeMax * expectedRate;
  const deviation = Math.max(1.2, Math.sqrt(safeMax * expectedRate * (1 - expectedRate)) * 1.35);
  return Array.from({ length: safeMax + 1 }, (_, value) => ({
    value,
    weight: Math.max(1, Math.round(100 * Math.exp(-((value - expected) ** 2) / (2 * deviation * deviation)))),
  }));
}

export function getLeagueTitlePool(seasons: number, prestige: number, stats: QuickStats): WeightedItem<number>[] {
  const strength = getClubAchievementStrength(prestige, stats);
  const expectedRate = 0.04 + strength * 0.54;
  return getAchievementCountPool(seasons, expectedRate);
}

export function getDomesticCupPool(seasons: number, prestige: number, stats: QuickStats): WeightedItem<number>[] {
  const strength = getClubAchievementStrength(prestige, stats);
  const expectedRate = 0.1 + strength * 0.62;
  return getAchievementCountPool(seasons, expectedRate);
}

export function getInternationalCountPool(max: number): WeightedItem<number>[] {
  const safeMax = Math.max(0, Math.floor(max));
  if (safeMax === 0) return [{ value: 0, weight: 1 }];
  return Array.from({ length: safeMax }, (_, index) => ({ value: index + 1, weight: Math.max(8, 32 - index * 6) }));
}

const INTERNATIONAL_CUP_POOLS: Record<QuickConfederation, QuickInternationalCupType[]> = {
  UEFA: ["Champions League", "Europa League", "Conference League"],
  CONMEBOL: ["Libertadores", "Sudamericana"],
  CONCACAF: ["CONCACAF Champions Cup"],
  AFC: ["AFC Champions League"],
  CAF: ["CAF Champions League"],
};

export function getInternationalCupTypePool(confederation: QuickConfederation, prestige: number, forceHighest = false): WeightedItem<QuickInternationalCupType>[] {
  const pool = INTERNATIONAL_CUP_POOLS[confederation];
  if (forceHighest) return [{ value: pool[0], weight: 1 }];
  return pool.map((value, index) => ({
    value,
    weight: Math.max(1, prestige * 3 - index * 2),
  }));
}

export interface QuickCareerOutcomeContext {
  stats: QuickStats;
  careerLength: number;
  leagueTitles: number;
  domesticCups: number;
  internationalCups: number;
}

const GOAL_ROLE_FACTOR: Record<QuickPosition, number> = {
  GK: 0.02, LB: 0.12, CB: 0.08, RB: 0.12, CDM: 0.15, CM: 0.22, CAM: 0.36,
  LW: 0.4, RW: 0.4, LM: 0.3, RM: 0.3, ST: 0.55,
};

const ASSIST_ROLE_FACTOR: Record<QuickPosition, number> = {
  GK: 0.04, LB: 0.2, CB: 0.1, RB: 0.2, CDM: 0.35, CM: 0.5, CAM: 0.55,
  LW: 0.4, RW: 0.4, LM: 0.43, RM: 0.43, ST: 0.22,
};

function statValue(stats: QuickStats, key: QuickStatKey): number {
  return stats[key] ?? 5;
}

interface QuickAchievementProfile {
  leagueRate: number;
  domesticCupRate: number;
  internationalRate: number;
  prestigeScore: number;
}

function getAchievementProfile(context: QuickCareerOutcomeContext): QuickAchievementProfile {
  const seasons = Math.max(1, context.careerLength);
  const leagueRate = clampUnit(context.leagueTitles / seasons);
  const domesticCupRate = clampUnit(context.domesticCups / seasons);
  const internationalRate = clampUnit(context.internationalCups / seasons);
  return {
    leagueRate,
    domesticCupRate,
    internationalRate,
    prestigeScore: clampUnit(leagueRate * 0.4 + domesticCupRate * 0.15 + internationalRate * 0.45),
  };
}

function getCareerCountWeights(values: (number | "1000+")[], expected: number, prestigeScore: number): WeightedItem<number | "1000+">[] {
  const deviation = Math.max(42, expected * 0.42);
  return values.map((value) => {
    if (value === "1000+") {
      const openEndedWeight = expected > 650 ? (expected - 500) / 10 : 1;
      return { value, weight: Math.max(1, Math.round(openEndedWeight * (1 + prestigeScore * 0.4))) };
    }
    const distance = value - expected;
    const baseWeight = 100 * Math.exp(-(distance * distance) / (2 * deviation * deviation));
    const relativeOutput = value / Math.max(75, expected);
    const highOutputBias = 1 + prestigeScore * Math.max(0, relativeOutput - 0.8) * 0.35;
    return { value, weight: Math.max(1, Math.round(baseWeight * highOutputBias)) };
  });
}

export function getGoalPool(position: QuickPosition, context: QuickCareerOutcomeContext): WeightedItem<number | "1000+">[] {
  const scoringSkill = statValue(context.stats, "sho") * 0.42
    + statValue(context.stats, "dri") * 0.18
    + statValue(context.stats, "pac") * 0.15
    + statValue(context.stats, "iq") * 0.12
    + statValue(context.stats, "str") * 0.08
    + statValue(context.stats, "pas") * 0.05;
  const achievement = getAchievementProfile(context);
  const level = 0.3 + (scoringSkill / 10) * 1.05;
  const achievementMultiplier = 1
    + achievement.leagueRate * 0.12
    + achievement.domesticCupRate * 0.04
    + achievement.internationalRate * 0.18;
  const expected = context.careerLength * 24 * GOAL_ROLE_FACTOR[position] * level * achievementMultiplier;
  const values: (number | "1000+")[] = [0, 25, 50, 75, 100, 150, 200, 300, 400, 500, 700, 1000, "1000+"];
  return getCareerCountWeights(values, expected, achievement.prestigeScore);
}

export function getAssistPool(position: QuickPosition, context: QuickCareerOutcomeContext): WeightedItem<number | "1000+">[] {
  const creativeSkill = statValue(context.stats, "pas") * 0.42
    + statValue(context.stats, "iq") * 0.28
    + statValue(context.stats, "dri") * 0.18
    + statValue(context.stats, "pac") * 0.07
    + statValue(context.stats, "sho") * 0.05;
  const achievement = getAchievementProfile(context);
  const level = 0.3 + (creativeSkill / 10) * 1.05;
  const achievementMultiplier = 1
    + achievement.leagueRate * 0.1
    + achievement.domesticCupRate * 0.06
    + achievement.internationalRate * 0.15;
  const expected = context.careerLength * 18 * ASSIST_ROLE_FACTOR[position] * level * achievementMultiplier;
  const values: (number | "1000+")[] = [0, 25, 50, 75, 100, 150, 200, 300, 400, 500, 700, 1000, "1000+"];
  return getCareerCountWeights(values, expected, achievement.prestigeScore);
}

export interface QuickBallonDorContext extends QuickCareerOutcomeContext {
  position: QuickPosition;
  goals: QuickCountValue | null;
  assists: QuickCountValue | null;
}

function countValue(value: QuickCountValue | null): number {
  if (value === "1000+") return 1200;
  return value ?? 0;
}

interface QuickBallonRoleProfile {
  goalsPerSeason: number;
  assistsPerSeason: number;
  goalsWeight: number;
  assistsWeight: number;
  outputBaseline: number;
}

const QUICK_BALLON_ROLE_PROFILES: Record<QuickPosition, QuickBallonRoleProfile> = {
  GK: { goalsPerSeason: 0.5, assistsPerSeason: 2, goalsWeight: 0.15, assistsWeight: 0.85, outputBaseline: 0.45 },
  LB: { goalsPerSeason: 5, assistsPerSeason: 10, goalsWeight: 0.3, assistsWeight: 0.7, outputBaseline: 0.3 },
  CB: { goalsPerSeason: 6, assistsPerSeason: 5, goalsWeight: 0.45, assistsWeight: 0.55, outputBaseline: 0.25 },
  RB: { goalsPerSeason: 5, assistsPerSeason: 10, goalsWeight: 0.3, assistsWeight: 0.7, outputBaseline: 0.3 },
  CDM: { goalsPerSeason: 5, assistsPerSeason: 12, goalsWeight: 0.35, assistsWeight: 0.65, outputBaseline: 0.35 },
  CM: { goalsPerSeason: 8, assistsPerSeason: 16, goalsWeight: 0.4, assistsWeight: 0.6, outputBaseline: 0.4 },
  CAM: { goalsPerSeason: 14, assistsPerSeason: 18, goalsWeight: 0.4, assistsWeight: 0.6, outputBaseline: 0.5 },
  LW: { goalsPerSeason: 19, assistsPerSeason: 12, goalsWeight: 0.6, assistsWeight: 0.4, outputBaseline: 0.5 },
  RW: { goalsPerSeason: 19, assistsPerSeason: 12, goalsWeight: 0.6, assistsWeight: 0.4, outputBaseline: 0.5 },
  LM: { goalsPerSeason: 10, assistsPerSeason: 14, goalsWeight: 0.4, assistsWeight: 0.6, outputBaseline: 0.4 },
  RM: { goalsPerSeason: 10, assistsPerSeason: 14, goalsWeight: 0.4, assistsWeight: 0.6, outputBaseline: 0.4 },
  ST: { goalsPerSeason: 24, assistsPerSeason: 8, goalsWeight: 0.75, assistsWeight: 0.25, outputBaseline: 0.5 },
};

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getQuickBallonOutputScore(context: QuickBallonDorContext): number {
  const profile = QUICK_BALLON_ROLE_PROFILES[context.position];
  const seasons = Math.max(1, context.careerLength);
  const goalsRate = Math.min(1.25, countValue(context.goals) / (seasons * profile.goalsPerSeason));
  const assistsRate = Math.min(1.25, countValue(context.assists) / (seasons * profile.assistsPerSeason));
  const roleRate = clampUnit((goalsRate * profile.goalsWeight + assistsRate * profile.assistsWeight) / 1.25);
  return profile.outputBaseline + (1 - profile.outputBaseline) * roleRate;
}

function getQuickBallonTeamScore(context: QuickBallonDorContext): number {
  const seasons = Math.max(1, context.careerLength);
  const leagueTitleRate = clampUnit(context.leagueTitles / (seasons * 0.28));
  const domesticCupRate = clampUnit(context.domesticCups / (seasons * 0.35));
  const internationalCupRate = clampUnit(context.internationalCups / (seasons * 0.1));
  return leagueTitleRate * 0.5 + internationalCupRate * 0.35 + domesticCupRate * 0.15;
}

function poissonProbability(lambda: number, count: number): number {
  let probability = Math.exp(-lambda);
  for (let index = 1; index <= count; index += 1) probability *= lambda / index;
  return probability;
}

export function getBallonDorPool(context: QuickBallonDorContext): WeightedItem<number>[] {
  // Ballon d'Or should be an elite-career outcome. OVR below the high-70s can
  // still win through an exceptional career, but it must not receive a broad
  // baseline chance just because the career is long or trophy-heavy.
  const overallScore = clampUnit((getQuickOverall(context.stats) - 78) / 18);
  const outputScore = getQuickBallonOutputScore(context);
  const teamScore = getQuickBallonTeamScore(context);
  const caseScore = overallScore * 0.5 + outputScore * 0.3 + teamScore * 0.2;
  const annualWinRate = 0.001 + caseScore * 0.075;
  const expectedWins = Math.min(2, Math.max(0.03, context.careerLength * annualWinRate));
  const maxWins = Math.min(6, Math.max(2, Math.ceil(expectedWins + 4 * Math.sqrt(expectedWins))));

  return Array.from({ length: maxWins + 1 }, (_, value) => ({
    value,
    weight: Math.max(1, Math.round(poissonProbability(expectedWins, value) * 100)),
  }));
}

export function getTraitGatePool(): WeightedItem<"yes" | "no">[] {
  return [{ value: "yes", weight: 42 }, { value: "no", weight: 58 }];
}

export function getImprovementGatePool(overall: number): WeightedItem<"yes" | "no">[] {
  const yesWeight = Math.min(78, Math.max(25, 62 - Math.max(0, overall - 75)));
  return [{ value: "yes", weight: yesWeight }, { value: "no", weight: 100 - yesWeight }];
}

const INDIVIDUAL_AWARDS = [
  "Golden Boot", "Playmaker of the Year", "Best XI", "Player of the Year", "Young Player of the Year",
  "Puskás Award", "Defender of the Year", "Midfielder of the Year", "Goalkeeper of the Year",
] as const;

export type QuickIndividualAwardItem = WeightedItem<string> & { active: boolean };

export function getIndividualAwardPool(position: QuickPosition, usedAwards: string[], goals: QuickCountValue | null = null, assists: QuickCountValue | null = null): QuickIndividualAwardItem[] {
  const available = INDIVIDUAL_AWARDS.filter((award) => !usedAwards.includes(award));
  return available.map((value) => ({
    value,
    weight: isIndividualAwardActive(position, value, goals, assists) ? (isPositionAward(position, value) ? 3 : 1) : 1,
    active: isIndividualAwardActive(position, value, goals, assists),
  }));
}

function isPositionAward(position: QuickPosition, award: string): boolean {
  if (award === "Goalkeeper of the Year") return position === "GK";
  if (award === "Defender of the Year") return ["LB", "CB", "RB", "CDM"].includes(position);
  if (award === "Midfielder of the Year") return ["CDM", "CM", "CAM", "LM", "RM"].includes(position);
  return false;
}

function isIndividualAwardActive(position: QuickPosition, award: string, goals: QuickCountValue | null, assists: QuickCountValue | null): boolean {
  if (award === "Goalkeeper of the Year") return position === "GK";
  if (award === "Defender of the Year") return ["LB", "CB", "RB", "CDM"].includes(position);
  if (award === "Midfielder of the Year") return ["CDM", "CM", "CAM", "LM", "RM"].includes(position);
  if (award === "Golden Boot") return position !== "GK" && countValue(goals) > 0;
  if (award === "Puskás Award") return countValue(goals) > 0;
  if (award === "Playmaker of the Year") return position !== "GK" && countValue(assists) > 0;
  return true;
}

export function getTraitItems(position: QuickPosition) {
  return getTraitPool(position).map((trait) => {
    const modifiers = Object.entries(trait.modifiers)
      .map(([key, value]) => `+${value} ${getQuickStatLabel(key as QuickStatKey)}`)
      .join(" · ");
    const isGoalkeeperTrait = trait.preferredPositions?.includes("GK") ?? false;
    const active = position === "GK" ? isGoalkeeperTrait : !isGoalkeeperTrait;
    return { label: `${trait.name} · ${modifiers} · ${trait.description}`, value: trait, weight: 1, active };
  });
}

export { DEBUT_AGE_POOL };
