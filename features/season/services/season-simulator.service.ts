import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { estimateAppsRatio } from "@/lib/club-fit";
import { computeEffectivePositionOvr } from "@/lib/transfer-economy";
import {
  EXTRA_APPEARANCES_BONUS,
  TRAINING_CAMP_RATING_BONUS,
} from "@/lib/shop-catalog";
import type { BallonDorEligibility } from "./ballon-dor.service";
import { simulateAwardSeason } from "./award-simulator.service";
import type { SyntheticLeagueClubInput } from "./synthetic-league.service";
import type { AwardSimulationResult } from "@/types/awards";
import {
  getCupMatches,
  getContinentalMatches,
  getNationalMatches,
  getStandingBonus,
  CUP_CS_RATIO,
  CONTINENTAL_CS_RATIO,
  NATIONAL_CS_RATIO,
  estimateMaxTeamCS,
  rollCompetitionOutput,
  calcRating,
} from "./season-simulator-calculations";

export type { BallonDorEligibility } from "./ballon-dor.service";


export interface CompetitionStats {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
}

export interface PlayerSeasonInput {
  seasonId?: string;
  playerId?: string;
  playerName?: string;
  formation?: string;
  age: number;
  ovr: number;
  position: string;
  luckRating: number;
  professionalism?: number;
  clubPrestige: number;
  clubName: string;
  leagueName: string;
  leagueTier?: number;
  leagueClubsCount: number;
  leagueClubs: SyntheticLeagueClubInput[];
  hasContinentalCup: boolean;
  playerNationality: string;
  currentStats?: Record<string, number>;
  // Outcomes từ wheels — truyền vào sau khi tất cả wheels xong
  standingResult?: number | null;
  domesticCupResult?: string | null;
  continentalCupResult?: string | null;
  continentalCupType?: string | null;        // "UCL" | "Libertadores" | ...
  nationalCallupResult?: string | null;
  nationalTournamentResult?: string | null;
  nationalTournamentType?: string | null;    // "FIFA World Cup" | "Copa América" | ...
  /** docs/core-currency-shop-design.md §6.2 — "Training Camp" shop item. */
  trainingCampActive?: boolean;
  /** Shop item that adds deterministic appearance opportunities this season. */
  appearancePackActive?: boolean;
  /** Server commands inject a cryptographically secure source; tests may inject a seeded source. */
  randomSource?: RandomSource;
}

export interface SimulatedSeasonResult {
  // Tổng toàn mùa
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  matchRating: number;
  events: { type: string; label: string }[];
  // Per-competition — server tính, FE chỉ hiển thị
  leagueStats: CompetitionStats;
  domesticCupStats: CompetitionStats;
  continentalStats?: CompetitionStats;
  nationalStats?: CompetitionStats;
  // Ballon d'Or eligibility — thay thế random boolean cũ
  ballonDor: BallonDorEligibility;
  awardSimulation: AwardSimulationResult;
}


// ── Main service ───────────────────────────────────────────────────────────

export function simulatePlayerSeasonService(input: PlayerSeasonInput): SimulatedSeasonResult {
  const {
    seasonId,
    formation,
    ovr, position, luckRating, professionalism, clubPrestige, leagueClubsCount,
    hasContinentalCup, currentStats,
    standingResult, domesticCupResult, continentalCupResult, continentalCupType,
    nationalCallupResult, nationalTournamentResult, nationalTournamentType,
    trainingCampActive,
    appearancePackActive,
  } = input;
  const randomSource = input.randomSource ?? resolveRandom;
  const randomFloat = (min: number, max: number) => min + (max - min) * randomSource();

  const events: { type: string; label: string }[] = [];

  // 1. Match counts — deterministic từ outcomes
  const leagueMatches = (leagueClubsCount - 1) * 2;
  const cupMatches = getCupMatches(domesticCupResult);
  const continentalMatches = hasContinentalCup ? getContinentalMatches(continentalCupResult) : 0;
  const nationalMatches = getNationalMatches(nationalCallupResult, nationalTournamentResult);
  const expectedMatches = leagueMatches + cupMatches + continentalMatches + nationalMatches;

  // Estimate max team clean sheets from standing result (SoT §7.8)
  const maxLeagueTeamCS = standingResult != null && leagueClubsCount > 0
    ? Math.max(1, Math.round(leagueMatches * (1 - (standingResult - 1) / Math.max(1, leagueClubsCount)) * 0.60))
    : undefined;
  // Extended to cup/continental/national via result-tier ratio (SoT §4.1) — previously only
  // league had a Team Result Invariant bound.
  const maxCupTeamCS = estimateMaxTeamCS(cupMatches, domesticCupResult ? CUP_CS_RATIO[domesticCupResult] : undefined);
  const maxContinentalTeamCS = hasContinentalCup
    ? estimateMaxTeamCS(continentalMatches, continentalCupResult ? CONTINENTAL_CS_RATIO[continentalCupResult] : undefined)
    : undefined;
  const maxNationalTeamCS = nationalCallupResult === "called_up"
    ? estimateMaxTeamCS(nationalMatches, nationalTournamentResult ? NATIONAL_CS_RATIO[nationalTournamentResult] : undefined)
    : undefined;

  // SoT §7.10 — season sim uses effPositionOvr for apps ratio, rating, and overqualify check
  const effPositionOvr = computeEffectivePositionOvr(position, currentStats, ovr);

  // 2. Apps ratio — player↔club fit (SoT §7.6) + standing
  const standingBonus = getStandingBonus(standingResult);
  const randModifier = randomFloat(-0.05, 0.05);
  const finalAppsRatio = Math.min(
    0.95,
    Math.max(0.05, estimateAppsRatio(effPositionOvr, clubPrestige) + standingBonus + randModifier),
  );
  // Training Camp (shop item) — flat rating bonus applied uniformly below, not an apps term.
  const perfBonus = trainingCampActive ? TRAINING_CAMP_RATING_BONUS : 0;

  // 3. Per-competition apps
  let remainingAppearanceBonus = appearancePackActive ? EXTRA_APPEARANCES_BONUS : 0;
  const addAppearanceBonus = (baseApps: number, maxMatches: number): number => {
    if (remainingAppearanceBonus <= 0 || maxMatches <= baseApps) return baseApps;
    const added = Math.min(maxMatches - baseApps, remainingAppearanceBonus);
    remainingAppearanceBonus -= added;
    return baseApps + added;
  };
  const leagueApps = addAppearanceBonus(Math.max(1, Math.round(leagueMatches * finalAppsRatio)), leagueMatches);
  const cupApps = addAppearanceBonus(
    cupMatches > 0 ? Math.max(0, Math.round(cupMatches * finalAppsRatio * 0.90)) : 0,
    cupMatches,
  );
  const continentalApps = addAppearanceBonus(
    continentalMatches > 0 ? Math.max(0, Math.round(continentalMatches * finalAppsRatio)) : 0,
    continentalMatches,
  );
  const nationalApps = addAppearanceBonus(
    nationalMatches > 0 ? Math.max(0, Math.round(nationalMatches * finalAppsRatio * 0.85)) : 0,
    nationalMatches,
  );
  const totalApps = leagueApps + cupApps + continentalApps + nationalApps;

  // 4. Per-competition goals/assists/CS (volume ∝ apps)
  const { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, leagueApps, "league", currentStats, maxLeagueTeamCS, randomSource,
  );
  const { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, cupApps, "domestic_cup", currentStats, maxCupTeamCS, randomSource,
  );
  const { goals: ctGoals, assists: ctAssists, cleanSheets: contCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, continentalApps, "continental", currentStats, maxContinentalTeamCS, randomSource,
  );
  const { goals: ntGoals, assists: ntAssists, cleanSheets: natCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, nationalApps, "national", currentStats, maxNationalTeamCS, randomSource,
  );

  // 5. Match ratings per competition (SoT §7.3: use effPositionOvr for ovrVsClub)
  const lgRatingBonus = getStandingBonus(standingResult) * 0.8;
  const leagueRating = leagueApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, apps: leagueApps }, lgRatingBonus, perfBonus, randomSource)
    : 0;
  const cupRating = cupApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, apps: cupApps }, 0, perfBonus, randomSource)
    : 0;
  const contRating = continentalApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: ctGoals, assists: ctAssists, cleanSheets: contCS, apps: continentalApps }, 0, perfBonus, randomSource)
    : 0;
  const natRating = nationalApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: ntGoals, assists: ntAssists, cleanSheets: natCS, apps: nationalApps }, 0, perfBonus, randomSource)
    : 0;

  // 6. Totals (weighted average rating)
  const totalGoals = Math.max(0, lgGoals + cpGoals + ctGoals + ntGoals);
  const totalAssists = Math.max(0, lgAssists + cpAssists + ctAssists + ntAssists);
  const totalCS = leagueCS + cupCS + contCS + natCS;

  const ratingWeights = [
    { r: leagueRating, a: leagueApps },
    { r: cupRating, a: cupApps },
    { r: contRating, a: continentalApps },
    { r: natRating, a: nationalApps },
  ].filter((x) => x.a > 0);
  const weightedRating = ratingWeights.length > 0
    ? ratingWeights.reduce((sum, x) => sum + x.r * x.a, 0) / ratingWeights.reduce((sum, x) => sum + x.a, 0)
    : 6.0;
  const matchRating = Math.min(9.0, Math.max(5.5, Math.round(weightedRating * 100) / 100));

  const awardSimulation = simulateAwardSeason({
    seasonId,
    age: input.age,
    formation,
    leagueTier: input.leagueTier,
    randomSource,
    player: {
      name: input.playerName ?? "Career Player",
      id: input.playerId,
      position,
      ovr,
      currentStats,
      luckRating,
      professionalism,
      clubName: input.clubName,
      leagueName: input.leagueName,
      leaguePrestige: clubPrestige,
      leagueClubsCount,
      leagueClubs: input.leagueClubs,
      standing: standingResult,
      domesticCupResult,
      continentalResult: continentalCupResult,
      continentalType: continentalCupType,
      nationalResult: nationalTournamentResult,
      nationalType: nationalTournamentType,
      expectedMatches,
      leagueStats: { apps: leagueApps, goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, rating: leagueRating },
      domesticCupStats: { apps: cupApps, goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, rating: cupRating },
      ...(continentalApps > 0 ? { continentalStats: { apps: continentalApps, goals: ctGoals, assists: ctAssists, cleanSheets: contCS, rating: contRating } } : {}),
      ...(nationalApps > 0 ? { nationalStats: { apps: nationalApps, goals: ntGoals, assists: ntAssists, cleanSheets: natCS, rating: natRating } } : {}),
    },
  });
  const ballonDor: BallonDorEligibility = {
    eligible: awardSimulation.ballonDor.eligible,
    nominationWeight: awardSimulation.ballonDor.nominationWeight,
    rankWeights: awardSimulation.ballonDor.rankWeights,
    evaluation: awardSimulation.ballonDor.evaluation as BallonDorEligibility["evaluation"],
  };
  events.push(...awardSimulation.honours.map((honour) => ({ type: "individual_award", label: honour.label })));

  return {
    apps: totalApps,
    goals: totalGoals,
    assists: totalAssists,
    cleanSheets: totalCS,
    matchRating,
    events,
    ballonDor,
    leagueStats: { apps: leagueApps, goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, rating: leagueRating },
    domesticCupStats: { apps: cupApps, goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, rating: cupRating },
    ...(continentalApps > 0 && {
      continentalStats: { apps: continentalApps, goals: ctGoals, assists: ctAssists, cleanSheets: contCS, rating: contRating },
    }),
    ...(nationalApps > 0 && {
      nationalStats: { apps: nationalApps, goals: ntGoals, assists: ntAssists, cleanSheets: natCS, rating: natRating },
    }),
    awardSimulation,
  };
}
