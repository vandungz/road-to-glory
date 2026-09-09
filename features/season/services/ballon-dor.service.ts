/**
 * Ballon d'Or evaluation is deliberately kept server-side and pure.
 * The same evaluation produces both wheel weights, so the preview and the
 * authoritative resolver cannot disagree about the player's case.
 */

type OutputMetric = "goals" | "assists" | "cleanSheets";

interface BallonPositionProfile {
  role: string;
  attributes: Record<string, number>;
  output: Record<OutputMetric, number>;
  targets: Record<OutputMetric, number>;
}

export interface BallonDorEvaluationInput {
  ovr: number;
  position: string;
  currentStats?: Record<string, number>;
  apps: number;
  expectedMatches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  matchRating: number;
  luckRating?: number;
  professionalism?: number;
  standing?: number | null;
  leagueSize: number;
  clubPrestige: number;
  domesticCup?: string | null;
  continentalResult?: string | null;
  continentalType?: string | null;
  nationalResult?: string | null;
  nationalType?: string | null;
}

export interface BallonDorEvaluationBreakdown {
  score: number;
  ovrScore: number;
  positionScore: number;
  roleOutputScore: number;
  performanceScore: number;
  availabilityScore: number;
  teamSuccessScore: number;
  hiddenStatsScore: number;
  effectivePositionRating: number;
  role: string;
}

export interface BallonDorEligibility {
  eligible: boolean;
  nominationWeight: number;
  rankWeights: number[];
  /** Present for new season simulations; optional for legacy empty-season snapshots. */
  evaluation?: BallonDorEvaluationBreakdown;
}

const POSITION_PROFILES: Record<string, BallonPositionProfile> = {
  ST: {
    role: "Tiền đạo cắm",
    attributes: { sho: 0.34, pac: 0.16, dri: 0.18, phy: 0.16, pas: 0.11, def: 0.05 },
    output: { goals: 0.75, assists: 0.20, cleanSheets: 0.05 },
    targets: { goals: 24, assists: 8, cleanSheets: 1 },
  },
  LW: {
    role: "Tiền đạo cánh trái",
    attributes: { dri: 0.25, pac: 0.22, sho: 0.22, pas: 0.16, phy: 0.10, def: 0.05 },
    output: { goals: 0.52, assists: 0.40, cleanSheets: 0.08 },
    targets: { goals: 19, assists: 12, cleanSheets: 1 },
  },
  RW: {
    role: "Tiền đạo cánh phải",
    attributes: { dri: 0.25, pac: 0.22, sho: 0.22, pas: 0.16, phy: 0.10, def: 0.05 },
    output: { goals: 0.52, assists: 0.40, cleanSheets: 0.08 },
    targets: { goals: 19, assists: 12, cleanSheets: 1 },
  },
  CAM: {
    role: "Tiền vệ công",
    attributes: { pas: 0.28, dri: 0.25, sho: 0.18, pac: 0.12, phy: 0.10, def: 0.07 },
    output: { goals: 0.35, assists: 0.55, cleanSheets: 0.10 },
    targets: { goals: 14, assists: 18, cleanSheets: 2 },
  },
  LM: {
    role: "Tiền vệ cánh trái",
    attributes: { pas: 0.24, pac: 0.23, dri: 0.20, def: 0.13, sho: 0.12, phy: 0.08 },
    output: { goals: 0.30, assists: 0.55, cleanSheets: 0.15 },
    targets: { goals: 10, assists: 14, cleanSheets: 4 },
  },
  RM: {
    role: "Tiền vệ cánh phải",
    attributes: { pas: 0.24, pac: 0.23, dri: 0.20, def: 0.13, sho: 0.12, phy: 0.08 },
    output: { goals: 0.30, assists: 0.55, cleanSheets: 0.15 },
    targets: { goals: 10, assists: 14, cleanSheets: 4 },
  },
  CM: {
    role: "Tiền vệ trung tâm",
    attributes: { pas: 0.28, def: 0.20, dri: 0.18, phy: 0.14, sho: 0.12, pac: 0.08 },
    output: { goals: 0.30, assists: 0.50, cleanSheets: 0.20 },
    targets: { goals: 8, assists: 16, cleanSheets: 10 },
  },
  CDM: {
    role: "Tiền vệ phòng ngự",
    attributes: { def: 0.30, pas: 0.24, phy: 0.18, dri: 0.12, pac: 0.10, sho: 0.06 },
    output: { goals: 0.20, assists: 0.30, cleanSheets: 0.50 },
    targets: { goals: 5, assists: 12, cleanSheets: 13 },
  },
  LB: {
    role: "Hậu vệ trái",
    attributes: { def: 0.30, pac: 0.22, pas: 0.18, phy: 0.13, dri: 0.12, sho: 0.05 },
    output: { goals: 0.10, assists: 0.25, cleanSheets: 0.65 },
    targets: { goals: 5, assists: 10, cleanSheets: 15 },
  },
  RB: {
    role: "Hậu vệ phải",
    attributes: { def: 0.30, pac: 0.22, pas: 0.18, phy: 0.13, dri: 0.12, sho: 0.05 },
    output: { goals: 0.10, assists: 0.25, cleanSheets: 0.65 },
    targets: { goals: 5, assists: 10, cleanSheets: 15 },
  },
  CB: {
    role: "Trung vệ",
    attributes: { def: 0.38, phy: 0.22, pac: 0.13, pas: 0.12, dri: 0.08, sho: 0.07 },
    output: { goals: 0.10, assists: 0.15, cleanSheets: 0.75 },
    targets: { goals: 6, assists: 5, cleanSheets: 17 },
  },
  GK: {
    role: "Thủ môn",
    attributes: { ref: 0.30, pos: 0.22, div: 0.18, han: 0.15, kic: 0.10, spd: 0.05 },
    output: { goals: 0.05, assists: 0.10, cleanSheets: 0.85 },
    targets: { goals: 0.5, assists: 2, cleanSheets: 19 },
  },
};

const DEFAULT_PROFILE = POSITION_PROFILES.CM;
const ELIGIBILITY_SCORE = 58;
const MAX_EVALUATION_SCORE = 122;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreRange(value: number, min: number, max: number, points: number): number {
  return clamp((value - min) / (max - min), 0, 1) * points;
}

function getEffectivePositionRating(
  position: string,
  currentStats: Record<string, number> | undefined,
  ovr: number,
): number {
  const profile = POSITION_PROFILES[position.toUpperCase()] ?? DEFAULT_PROFILE;
  return Object.entries(profile.attributes).reduce(
    (sum, [attribute, weight]) => sum + clamp(finite(currentStats?.[attribute], ovr), 0, 100) * weight,
    0,
  );
}

function getTournamentScore(
  result: string | null | undefined,
  type: string | null | undefined,
  kind: "continental" | "national",
): number {
  if (!result) return 0;
  const isTopTier = kind === "continental"
    ? ["UCL", "Libertadores"].includes(type ?? "")
    : type === "FIFA World Cup";
  const multiplier = isTopTier ? 1 : 0.7;
  const points: Record<string, number> = {
    Winner: 24,
    "Runner-Up": 15,
    "Semi-Finals": 10,
    "Quarter-Finals": 6,
    "Round of 16": 3,
    "Group Stage": 1,
    "Round of 32": 1,
    "Early Exit": 0,
  };
  return (points[result] ?? 0) * multiplier;
}

function getTeamSuccessScore(input: BallonDorEvaluationInput): number {
  const standing = input.standing ?? null;
  const leagueSize = Math.max(1, input.leagueSize);
  let score = 0;

  if (standing === 1) score += 16 + clamp(input.clubPrestige, 1, 5);
  else if (standing !== null && standing <= 4) score += 12;
  else if (standing !== null && standing <= Math.ceil(leagueSize * 0.25)) score += 8;
  else if (standing !== null && standing <= Math.ceil(leagueSize * 0.5)) score += 3;

  if (input.domesticCup === "Winner") score += 7;
  else if (input.domesticCup === "Runner-Up") score += 4;
  else if (input.domesticCup === "Semi-Finals") score += 2;
  else if (input.domesticCup === "Quarter-Finals") score += 1;

  score += getTournamentScore(input.continentalResult, input.continentalType, "continental");
  score += getTournamentScore(input.nationalResult, input.nationalType, "national");
  return clamp(score, 0, 36);
}

function getRoleOutputScore(input: BallonDorEvaluationInput, profile: BallonPositionProfile): number {
  const seasonScale = clamp(Math.max(1, input.expectedMatches) / 38, 0.75, 1.4);
  const output: Record<OutputMetric, number> = {
    goals: Math.max(0, input.goals),
    assists: Math.max(0, input.assists),
    cleanSheets: Math.max(0, input.cleanSheets),
  };
  const weightedRatio = (Object.keys(profile.output) as OutputMetric[]).reduce(
    (sum, metric) => sum + clamp(
      output[metric] / Math.max(0.1, profile.targets[metric] * seasonScale),
      0,
      1.35,
    ) * profile.output[metric],
    0,
  );
  return scoreRange(weightedRatio, 0, 1.15, 20);
}

function getHiddenStatsScore(input: BallonDorEvaluationInput): number {
  const professionalism = finite(input.professionalism, 10);
  // Luck belongs to nomination/resolution variance, not sporting merit. A
  // player's Ballon d'Or case is therefore influenced only by the hidden
  // professionalism signal, while the wheel/simulator random source still
  // provides gameplay drama.
  return scoreRange(professionalism, 1, 20, 2.5);
}

function distributeWeights(values: number[]): number[] {
  const floors = values.map((value) => Math.floor(value));
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byFraction = values
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < byFraction.length && remaining > 0; index += 1) {
    floors[byFraction[index].index] += 1;
    remaining -= 1;
  }
  return floors;
}

function getRankWeights(score: number): number[] {
  const lowScore = [4, 6, 8, 10, 12, 13, 13, 12, 11, 11];
  const highScore = [30, 20, 14, 10, 7, 5, 4, 4, 3, 3];
  const t = clamp((score - ELIGIBILITY_SCORE) / (MAX_EVALUATION_SCORE - ELIGIBILITY_SCORE), 0, 1);
  return distributeWeights(lowScore.map((value, index) => value + (highScore[index] - value) * t));
}

export function evaluateBallonDor(input: BallonDorEvaluationInput): BallonDorEligibility {
  const position = input.position.toUpperCase();
  const profile = POSITION_PROFILES[position] ?? DEFAULT_PROFILE;
  const ovr = clamp(finite(input.ovr, 0), 0, 100);
  const expectedMatches = Math.max(1, Math.round(finite(input.expectedMatches, 0)));
  const apps = clamp(Math.round(finite(input.apps, 0)), 0, expectedMatches);
  const effectivePositionRating = getEffectivePositionRating(position, input.currentStats, ovr);
  const ovrScore = ovr < 85 ? 0 : 4 + scoreRange(ovr, 85, 100, 14);
  const positionScore = scoreRange(effectivePositionRating, 65, 100, 16);
  const roleOutputScore = getRoleOutputScore({ ...input, apps, expectedMatches }, profile);
  const performanceScore = scoreRange(finite(input.matchRating, 0), 6.5, 8.8, 18);
  const availabilityScore = scoreRange(apps / expectedMatches, 0.45, 1, 10);
  const teamSuccessScore = getTeamSuccessScore(input);
  const hiddenStatsScore = getHiddenStatsScore(input);
  const score = Math.round(
    (ovrScore + positionScore + roleOutputScore + performanceScore + availabilityScore + teamSuccessScore + hiddenStatsScore) * 10,
  ) / 10;
  const minimumApps = Math.max(15, Math.ceil(expectedMatches * 0.45));
  const eligible = ovr >= 85
    && apps >= minimumApps
    && finite(input.matchRating, 0) >= 7.0
    && score >= ELIGIBILITY_SCORE;
  const evaluation: BallonDorEvaluationBreakdown = {
    score,
    ovrScore: Math.round(ovrScore * 10) / 10,
    positionScore: Math.round(positionScore * 10) / 10,
    roleOutputScore: Math.round(roleOutputScore * 10) / 10,
    performanceScore: Math.round(performanceScore * 10) / 10,
    availabilityScore: Math.round(availabilityScore * 10) / 10,
    teamSuccessScore: Math.round(teamSuccessScore * 10) / 10,
    hiddenStatsScore: Math.round(hiddenStatsScore * 10) / 10,
    effectivePositionRating: Math.round(effectivePositionRating * 10) / 10,
    role: profile.role,
  };

  if (!eligible) return { eligible: false, nominationWeight: 0, rankWeights: [], evaluation };

  const nominationWeight = Math.round(
    8 + scoreRange(score, ELIGIBILITY_SCORE, MAX_EVALUATION_SCORE, 84),
  );
  return {
    eligible: true,
    nominationWeight: clamp(nominationWeight, 8, 92),
    rankWeights: getRankWeights(score),
    evaluation,
  };
}
