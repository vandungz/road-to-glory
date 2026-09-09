import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { evaluateBallonDor } from "./ballon-dor.service";
import {
  AWARD_LABELS,
  AWARD_MODEL_VERSION,
  AWARD_RESOLUTION_VERSION,
  type AwardHonourInput,
  type AwardKey,
  type AwardRankingEntry,
  type AwardRankingSnapshotInput,
  type AwardSimulationResult,
} from "@/types/awards";
import {
  generateSyntheticLeagueCandidates,
  type SyntheticAwardCandidate,
  type SyntheticCompetitionStats,
  type SyntheticLeagueClubInput,
} from "./synthetic-league.service";

export interface AwardSimulatorInput {
  seasonId?: string;
  age: number;
  formation?: string;
  leagueTier?: number;
  player: {
    id?: string;
    name: string;
    position: string;
    ovr: number;
    currentStats?: Record<string, number>;
    luckRating?: number;
    professionalism?: number;
    clubId?: string | null;
    clubName: string;
    leagueId?: string | null;
    leagueName: string;
    leaguePrestige: number;
    leagueClubsCount: number;
    leagueClubs: SyntheticLeagueClubInput[];
    standing?: number | null;
    domesticCupResult?: string | null;
    continentalResult?: string | null;
    continentalType?: string | null;
    nationalResult?: string | null;
    nationalType?: string | null;
    leagueStats: SyntheticCompetitionStats;
    domesticCupStats: SyntheticCompetitionStats;
    continentalStats?: SyntheticCompetitionStats;
    nationalStats?: SyntheticCompetitionStats;
    expectedMatches?: number;
  };
  randomSource?: RandomSource;
}

interface Candidate extends AwardRankingEntry {
  ovr: number;
  leagueStats: SyntheticCompetitionStats;
  seasonStats: SyntheticCompetitionStats;
  teamSuccess: number;
}

const DEFENSIVE_POSITIONS = new Set(["CB", "LB", "RB", "CDM"]);
const BEST_XI_FORMATION = "4-3-3";
const BEST_XI_SLOTS: Record<string, string[]> = {
  "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CM", "CDM", "CM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "CM", "RM", "ST", "ST"],
};
const BEST_XI_POSITION_OPTIONS: Record<string, string[]> = {
  GK: ["GK"],
  LB: ["LB", "LM", "LW", "CB"],
  CB: ["CB", "CDM", "LB", "RB"],
  RB: ["RB", "RM", "RW", "CB"],
  CDM: ["CDM", "CM", "CB"],
  CM: ["CM", "CDM", "CAM", "LM", "RM"],
  LM: ["LM", "LW", "CM", "CAM"],
  RM: ["RM", "RW", "CM", "CAM"],
  LW: ["LW", "LM", "CAM", "ST"],
  RW: ["RW", "RM", "CAM", "ST"],
  ST: ["ST", "CAM", "LW", "RW"],
};
const MIN_APPS = { league_golden_boot: 18, league_top_assist: 18, league_golden_glove: 18 } as const;
const BEST_XI_MIN_APPS = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function combineStats(statsList: SyntheticCompetitionStats[]): SyntheticCompetitionStats {
  const apps = statsList.reduce((sum, stats) => sum + stats.apps, 0);
  if (apps <= 0) return { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
  return {
    apps,
    goals: statsList.reduce((sum, stats) => sum + stats.goals, 0),
    assists: statsList.reduce((sum, stats) => sum + stats.assists, 0),
    cleanSheets: statsList.reduce((sum, stats) => sum + stats.cleanSheets, 0),
    rating: round(statsList.reduce((sum, stats) => sum + stats.rating * stats.apps, 0) / apps),
  };
}

function teamSuccess(standing: number | null | undefined, clubPrestige: number): number {
  if (standing === 1) return 18 + clubPrestige;
  if (standing !== null && standing !== undefined && standing <= 4) return 12;
  if (standing !== null && standing !== undefined && standing <= 10) return 7;
  return 3;
}

function fromSynthetic(candidate: SyntheticAwardCandidate): Candidate {
  return {
    candidateKey: candidate.candidateKey,
    rank: 0,
    name: candidate.name,
    clubName: candidate.clubName,
    position: candidate.position,
    isCareerPlayer: false,
    metrics: {},
    score: 0,
    weight: 0,
    result: "ranked",
    ovr: candidate.ovr,
    leagueStats: candidate.leagueStats,
    seasonStats: candidate.seasonStats,
    teamSuccess: candidate.teamSuccess,
  };
}

function bestXiScore(candidate: Candidate): number {
  const stats = candidate.leagueStats;
  const position = candidate.position;
  if (position === "GK") return stats.rating * 12 + stats.cleanSheets * 0.8 + candidate.ovr * 0.08;
  if (DEFENSIVE_POSITIONS.has(position)) {
    return stats.rating * 11 + stats.cleanSheets * 0.55 + stats.goals * 0.35 + stats.assists * 0.25 + candidate.ovr * 0.08;
  }
  if (["ST", "LW", "RW"].includes(position)) {
    return stats.rating * 10 + stats.goals * 1.25 + stats.assists * 0.85 + candidate.ovr * 0.08;
  }
  return stats.rating * 11 + stats.goals * 0.8 + stats.assists * 0.75 + stats.cleanSheets * 0.2 + candidate.ovr * 0.08;
}

function makeCandidates(input: AwardSimulatorInput, source: RandomSource): Candidate[] {
  const player = input.player;
  const playerSeasonStats = combineStats([
    player.leagueStats,
    player.domesticCupStats,
    ...(player.continentalStats ? [player.continentalStats] : []),
    ...(player.nationalStats ? [player.nationalStats] : []),
  ]);
  const playerCandidate: Candidate = {
    candidateKey: `career:${player.id ?? "player"}`,
    rank: 0,
    name: player.name,
    clubName: player.clubName,
    position: player.position,
    isCareerPlayer: true,
    metrics: {},
    score: 0,
    weight: 0,
    result: "ranked",
    ovr: clamp(player.ovr, 1, 99),
    leagueStats: player.leagueStats,
    seasonStats: playerSeasonStats,
    teamSuccess: teamSuccess(player.standing, player.leaguePrestige),
  };
  const generated = generateSyntheticLeagueCandidates({
    seasonId: input.seasonId,
    leagueTier: input.leagueTier,
    clubs: player.leagueClubs,
    randomSource: source,
  });
  return [playerCandidate, ...generated.map(fromSynthetic)];
}

function metricScore(key: AwardKey, candidate: Candidate): number {
  const stats = candidate.leagueStats;
  switch (key) {
    case "league_golden_boot": return stats.goals;
    case "league_top_assist": return stats.assists;
    case "league_golden_glove": return candidate.position === "GK" ? stats.cleanSheets * 2 + stats.rating : -1;
    case "league_best_xi": return bestXiScore(candidate);
    case "ballon_dor": return candidate.seasonStats.rating * 9 + candidate.seasonStats.goals * 1.25 + candidate.seasonStats.assists * 1.15 + candidate.teamSuccess * 0.85 + candidate.ovr * 0.14;
    default: return 0;
  }
}

function isEligibleForAward(key: AwardKey, candidate: Candidate): boolean {
  const minimumApps = MIN_APPS[key as keyof typeof MIN_APPS];
  if (minimumApps !== undefined && candidate.leagueStats.apps < minimumApps) return false;
  if (key === "league_golden_glove") return candidate.position === "GK";
  return true;
}

function weightedPick<T extends { weight: number }>(values: T[], source: RandomSource): T {
  const total = values.reduce((sum, value) => sum + Math.max(1, value.weight), 0);
  let cursor = source() * total;
  for (const value of values) {
    cursor -= Math.max(1, value.weight);
    if (cursor <= 0) return value;
  }
  return values.at(-1)!;
}

function rankedEntries(key: AwardKey, candidates: Candidate[], source: RandomSource, limit = 10): Candidate[] {
  const scored = candidates.map((candidate) => ({ ...candidate, score: round(metricScore(key, candidate)) }));
  const ordered: Candidate[] = [];
  const remaining = [...scored];
  while (remaining.length > 0) {
    const highest = Math.max(...remaining.map((candidate) => candidate.score));
    const group = remaining.filter((candidate) => candidate.score === highest);
    const groupWeight = group.map((candidate) => ({ ...candidate, weight: Math.max(1, candidate.score + candidate.ovr * 0.1) }));
    while (groupWeight.length > 0) {
      const picked = weightedPick(groupWeight, source);
      ordered.push(picked);
      groupWeight.splice(groupWeight.indexOf(picked), 1);
      const pickedIndex = remaining.findIndex((candidate) => candidate.candidateKey === picked.candidateKey);
      if (pickedIndex >= 0) remaining.splice(pickedIndex, 1);
    }
  }
  return ordered.slice(0, limit).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    weight: Math.max(1, round(candidate.score)),
    metrics: {
      apps: candidate.leagueStats.apps,
      goals: candidate.leagueStats.goals,
      assists: candidate.leagueStats.assists,
      cleanSheets: candidate.leagueStats.cleanSheets,
      rating: candidate.leagueStats.rating,
      ovr: candidate.ovr,
    },
    result: index === 0 ? "winner" : "ranked",
  }));
}

function snapshot(input: AwardSimulatorInput, key: AwardKey, entries: Candidate[], scopeKey = "league"): AwardRankingSnapshotInput {
  const publicEntries = entries.map((entry) => Object.fromEntries(Object.entries(entry).filter(([field]) => field !== "ovr" && field !== "teamSuccess")) as AwardRankingEntry);
  return {
    snapshotKey: `${input.seasonId ?? "season"}:${key}:${scopeKey}`,
    awardKey: key,
    category: key === "ballon_dor" ? "ballon_dor" : "individual_award",
    scope: key === "ballon_dor" ? "career" : "league",
    scopeKey,
    age: input.age,
    seasonLabel: `Tuổi ${input.age}`,
    entries: publicEntries,
    status: "generated",
    revealStage: key === "ballon_dor" ? "ballon_dor_result" : "season_recap",
    formation: input.formation ?? BEST_XI_FORMATION,
    resolution: { candidateUniverseSize: entries.length, resolver: AWARD_RESOLUTION_VERSION },
  };
}

function makeHonour(input: AwardSimulatorInput, key: AwardKey, entry: AwardRankingEntry, slotKey?: string): AwardHonourInput {
  return {
    awardInstanceKey: `${input.seasonId ?? "season"}:${key}:${slotKey ?? "winner"}`,
    awardKey: key,
    category: key === "ballon_dor" ? "ballon_dor" : "individual_award",
    scope: key === "ballon_dor" ? "career" : "league",
    scopeKey: "league",
    slotKey,
    rank: entry.rank,
    result: slotKey ? "selected" : "winner",
    label: AWARD_LABELS[key],
    metrics: entry.metrics,
    modelVersion: AWARD_MODEL_VERSION,
    resolutionVersion: AWARD_RESOLUTION_VERSION,
    source: key === "ballon_dor" ? "ballon_dor_wheel" : "season_simulation",
  };
}

export function simulateAwardSeason(input: AwardSimulatorInput): AwardSimulationResult {
  const source = input.randomSource ?? resolveRandom;
  const candidates = makeCandidates(input, source);
  const snapshots: AwardRankingSnapshotInput[] = [];
  const honours: AwardHonourInput[] = [];
  const keys: AwardKey[] = ["league_golden_boot", "league_top_assist", "league_golden_glove"];
  for (const key of keys) {
    const eligible = candidates.filter((candidate) => isEligibleForAward(key, candidate));
    if (eligible.length === 0) continue;
    const entries = rankedEntries(key, eligible, source);
    const current = entries.find((entry) => entry.isCareerPlayer);
    const rankingSnapshot = snapshot(input, key, entries);
    rankingSnapshot.status = "resolved";
    rankingSnapshot.resolution = { candidateUniverseSize: eligible.length, resolver: AWARD_RESOLUTION_VERSION, winnerKey: entries[0]?.candidateKey };
    snapshots.push(rankingSnapshot);
    if (current?.isCareerPlayer && current.rank === 1) honours.push(makeHonour(input, key, current));
  }

  const formation = input.formation && BEST_XI_SLOTS[input.formation] ? input.formation : BEST_XI_FORMATION;
  const xiEntries: Candidate[] = [];
  const selectedCandidateKeys = new Set<string>();
  BEST_XI_SLOTS[formation].forEach((position, slotIndex) => {
    const available = candidates.filter((candidate) => !selectedCandidateKeys.has(candidate.candidateKey));
    const preferred = available.filter((candidate) => candidate.leagueStats.apps >= BEST_XI_MIN_APPS);
    const exactPool = preferred.filter((candidate) => candidate.position === position);
    const adjacentPool = preferred.filter((candidate) => (BEST_XI_POSITION_OPTIONS[position] ?? [position]).includes(candidate.position));
    const fallbackExactPool = available.filter((candidate) => candidate.position === position);
    const fallbackAdjacentPool = available.filter((candidate) => (BEST_XI_POSITION_OPTIONS[position] ?? [position]).includes(candidate.position));
    const pool = exactPool.length > 0
      ? exactPool
      : adjacentPool.length > 0
        ? adjacentPool
        : fallbackExactPool.length > 0
          ? fallbackExactPool
          : fallbackAdjacentPool;
    if (pool.length === 0) return;
    const selected = rankedEntries("league_best_xi", pool, source, 1)[0];
    selectedCandidateKeys.add(selected.candidateKey);
    xiEntries.push({ ...selected, slotKey: `${position}:${slotIndex}`, result: "selected" });
    if (selected.isCareerPlayer) honours.push(makeHonour(input, "league_best_xi", selected, `${position}:${slotIndex}`));
  });
  if (xiEntries.length > 0) {
    snapshots.push({ ...snapshot(input, "league_best_xi", xiEntries), status: "resolved", entries: xiEntries.map((entry) => Object.fromEntries(Object.entries(entry).filter(([field]) => field !== "ovr" && field !== "teamSuccess")) as AwardRankingEntry), resolution: { candidateUniverseSize: xiEntries.length, resolver: AWARD_RESOLUTION_VERSION } });
  }

  const ballonEntries = rankedEntries("ballon_dor", candidates, source, 10);
  const playerBallonEntry = ballonEntries.find((entry) => entry.isCareerPlayer);
  const player = input.player;
  const evaluation = evaluateBallonDor({
    ovr: player.ovr,
    position: player.position,
    currentStats: player.currentStats,
    apps: player.leagueStats.apps + player.domesticCupStats.apps + (player.continentalStats?.apps ?? 0) + (player.nationalStats?.apps ?? 0),
    expectedMatches: Math.max(1, player.expectedMatches ?? player.leagueStats.apps + player.domesticCupStats.apps + (player.continentalStats?.apps ?? 0) + (player.nationalStats?.apps ?? 0)),
    goals: player.leagueStats.goals + player.domesticCupStats.goals + (player.continentalStats?.goals ?? 0) + (player.nationalStats?.goals ?? 0),
    assists: player.leagueStats.assists + player.domesticCupStats.assists + (player.continentalStats?.assists ?? 0) + (player.nationalStats?.assists ?? 0),
    cleanSheets: player.leagueStats.cleanSheets + player.domesticCupStats.cleanSheets + (player.continentalStats?.cleanSheets ?? 0) + (player.nationalStats?.cleanSheets ?? 0),
    matchRating: player.leagueStats.rating,
    luckRating: player.luckRating,
    professionalism: player.professionalism,
    standing: player.standing,
    leagueSize: player.leagueClubsCount,
    clubPrestige: player.leaguePrestige,
    domesticCup: player.domesticCupResult,
    continentalResult: player.continentalResult,
    continentalType: player.continentalType,
    nationalResult: player.nationalResult,
    nationalType: player.nationalType,
  });
  snapshots.push(snapshot(input, "ballon_dor", ballonEntries, "global-candidate-universe"));
  const eligibleBallon = Boolean(evaluation.eligible && playerBallonEntry && playerBallonEntry.rank <= 10);
  return {
    modelVersion: AWARD_MODEL_VERSION,
    resolutionVersion: AWARD_RESOLUTION_VERSION,
    candidateUniverseSize: candidates.length,
    snapshots,
    honours,
    ballonDor: {
      eligible: eligibleBallon,
      nominationWeight: eligibleBallon ? evaluation.nominationWeight : 0,
      rankWeights: eligibleBallon ? evaluation.rankWeights : [],
      evaluation: evaluation.evaluation as unknown as Record<string, unknown>,
      snapshotKey: `${input.seasonId ?? "season"}:ballon_dor:global-candidate-universe`,
    },
  };
}
