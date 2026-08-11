import { getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import { resolveRandom, resolveRandomFloat } from "@/lib/wheel-engine/spin-resolver";
import {
  getPerAppRates,
  applyPrestigeToCsRate,
  clampCompetitionStats,
  type CompContext,
} from "@/lib/season-stat-rates";
import { estimateAppsRatio, getClubThreshold } from "@/lib/club-fit";
import { computeEffectivePositionOvr } from "@/lib/transfer-economy";
import { TRAINING_CAMP_RATING_BONUS } from "@/lib/shop-catalog";


export interface CompetitionStats {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
}

export interface PlayerSeasonInput {
  age: number;
  ovr: number;
  position: string;
  luckRating: number;
  clubPrestige: number;
  clubName: string;
  leagueName: string;
  leagueClubsCount: number;
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
}

export interface BallonDorEligibility {
  eligible: boolean;
  nominationWeight: number;  // % Yes trong Wheel 1 (0 nếu không eligible)
  rankWeights: number[];     // 10 phần tử cho Wheel 2 ([] nếu không eligible)
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
}

// ── Match counts deterministic từ outcomes ──────────────────────────────────

function getCupMatches(result: string | null | undefined): number {
  if (result === "Winner" || result === "Runner-Up") return 6;
  if (result === "Semi-Finals") return 5;
  if (result === "Quarter-Finals") return 4;
  if (result === "Round of 16") return 3;
  if (result === "Round of 32") return 2;
  if (result === "Early Exit") return 1;
  return 2; // fallback
}

function getContinentalMatches(result: string | null | undefined): number {
  if (result === "Winner" || result === "Runner-Up") return 13;
  if (result === "Semi-Finals") return 10;
  if (result === "Quarter-Finals") return 8;
  if (result === "Round of 16") return 8;
  if (result === "Group Stage" || result === "Early Exit") return 6;
  return 6; // fallback
}

function getNationalMatches(
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

function getStandingBonus(standing: number | null | undefined): number {
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

const CUP_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Round of 32": 0.30, "Early Exit": 0.25,
};
const CONTINENTAL_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Group Stage": 0.30, "Early Exit": 0.30,
};
const NATIONAL_CS_RATIO: Record<string, number> = {
  "Winner": 0.55, "Runner-Up": 0.50, "Semi-Finals": 0.45, "Quarter-Finals": 0.40,
  "Round of 16": 0.35, "Group Stage": 0.30,
};

function estimateMaxTeamCS(matches: number, ratio: number | undefined): number | undefined {
  if (matches <= 0 || ratio == null) return undefined;
  return Math.max(1, Math.round(matches * ratio));
}

// ── Goals/Assists/CleanSheets — apps × rate(position) (SoT §7.0 & §7.7 & §7.8) ────────────

function rollCompetitionOutput(
  position: string,
  ovr: number,
  clubPrestige: number,
  apps: number,
  context: CompContext,
  currentStats?: Record<string, number>,
  maxTeamCleanSheets?: number,
): { goals: number; assists: number; cleanSheets: number } {
  if (apps <= 0) return { goals: 0, assists: 0, cleanSheets: 0 };

  const rates = getPerAppRates(position, ovr, context, currentStats);
  const rateCs = applyPrestigeToCsRate(rates.cleanSheets, clubPrestige);
  const noise = () => 1 + resolveRandomFloat(-0.2, 0.2);

  let goals = Math.round(apps * rates.goals * noise());
  let assists = Math.round(apps * rates.assists * noise());
  let cleanSheets = ["GK", "CB", "LB", "RB", "CDM", "CM"].includes(position)
    ? Math.round(apps * rateCs * noise())
    : 0;

  // GK: rare assist instead of rate noise sometimes
  if (position === "GK") {
    goals = 0;
    assists = resolveRandom() > 0.97 ? 1 : 0;
  }

  // Bound player CS by Team Result Invariant (SoT §7.8)
  if (maxTeamCleanSheets !== undefined) {
    cleanSheets = Math.min(cleanSheets, maxTeamCleanSheets);
  }

  return clampCompetitionStats(position, apps, goals, assists, cleanSheets);
}

// ── Match Rating per competition ───────────────────────────────────────────

/** SoT §7.1 (Updated 2026-08-03): Superstar player contributions (G/A/CS) are preserved 100% (scale 1.0). */
function getOverqualifyPerfScale(_ovr: number, _clubPrestige: number): number {
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

function calcRating(
  position: string,
  ovr: number,
  luckRating: number,
  clubPrestige: number,
  compStats: { goals: number; assists: number; cleanSheets: number; apps: number },
  standingBonus = 0,
  /** docs/core-currency-shop-design.md §6.2 — "Training Camp" shop item, flat rating bonus. */
  perfBonus = 0,
): number {
  if (compStats.apps === 0) return 0;

  // SoT §7.3: rating relative to club environment (capped)
  const ovrVsClub = Math.max(-1.2, Math.min(1.2, (ovr - getClubThreshold(clubPrestige)) * 0.01));
  let base = 6.0 + ovrVsClub + (luckRating / 20) * 0.25 + standingBonus + perfBonus;

  const perfScale = getOverqualifyPerfScale(ovr, clubPrestige);

  const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
  const csFactor = compStats.cleanSheets / compStats.apps;
  const weights = POSITION_RATING_WEIGHTS[position] ?? { ga: 1.0, cs: 1.0 };
  base += (gaFactor * weights.ga + csFactor * weights.cs) * perfScale;

  base += resolveRandomFloat(-0.15, 0.15);
  return Math.min(9.0, Math.max(5.5, Math.round(base * 100) / 100));
}

// ── Ballon d'Or eligibility ────────────────────────────────────────────────

const ATTACKER_POSITIONS = ["ST", "LW", "RW", "CAM"];
const POSITION_MODIFIER: Record<string, number> = {
  ST: 0, LW: 0, RW: 0, CAM: 0,
  CM: -20, CDM: -20, LB: -20, RB: -20,
  CB: -25,
  GK: -30,
};

function calcTrophyScore(
  standing: number | null | undefined,
  clubPrestige: number,
  domesticCup: string | null | undefined,
  continentalResult: string | null | undefined,
  continentalType: string | null | undefined,
  nationalResult: string | null | undefined,
  nationalType: string | null | undefined,
): number {
  let score = 0;

  // League title
  if (standing === 1) {
    score += clubPrestige >= 4 ? 20 : 10;
  }

  // Domestic cup
  if (domesticCup === "Winner") score += 5;

  // Continental cup — phân biệt tier theo type
  if (continentalResult === "Winner") {
    const topCups = ["UCL", "Libertadores"];
    score += topCups.includes(continentalType ?? "") ? 40 : 25;
  }

  // National tournament — World Cup vs giải châu lục
  if (nationalResult === "Winner") {
    score += nationalType === "FIFA World Cup" ? 40 : 25;
  }

  return score;
}

function calcBallonDorEligibility(
  ovr: number,
  position: string,
  matchRating: number,
  totalGoals: number,
  standing: number | null | undefined,
  clubPrestige: number,
  domesticCup: string | null | undefined,
  continentalResult: string | null | undefined,
  continentalType: string | null | undefined,
  nationalResult: string | null | undefined,
  nationalType: string | null | undefined,
): BallonDorEligibility {
  // Individual score (OVR + Rating only — goals không tính vào gate)
  let individualScore = 0;
  if (ovr >= 96) individualScore += 45;
  else if (ovr >= 93) individualScore += 35;
  else if (ovr >= 90) individualScore += 20;
  else if (ovr >= 88) individualScore += 10;

  if (matchRating >= 8.30) individualScore += 30;
  else if (matchRating >= 8.00) individualScore += 20;
  else if (matchRating >= 7.80) individualScore += 10;

  const trophyScore = calcTrophyScore(standing, clubPrestige, domesticCup, continentalResult, continentalType, nationalResult, nationalType);
  const posModifier = POSITION_MODIFIER[position] ?? 0;
  const eligibilityScore = individualScore + trophyScore + posModifier;

  if (eligibilityScore < 75) {
    return { eligible: false, nominationWeight: 0, rankWeights: [] };
  }

  // nominationWeight — % Yes trong Wheel 1
  let nominationWeight: number;
  if (eligibilityScore >= 115) nominationWeight = 82;
  else if (eligibilityScore >= 105) nominationWeight = 70;
  else if (eligibilityScore >= 95) nominationWeight = 55;
  else if (eligibilityScore >= 85) nominationWeight = 35;
  else nominationWeight = 20;

  // rankScore — dùng cho Wheel 2 (goals tính ở đây)
  const trophyBonus = calcRankTrophyBonus(continentalResult, continentalType, nationalResult, nationalType, standing, clubPrestige);
  const goalBonus = ATTACKER_POSITIONS.includes(position)
    ? (totalGoals >= 30 ? 20 : totalGoals >= 20 ? 10 : 0)
    : 0;
  const rankScore = (ovr - 88) * 2 + (matchRating - 7.80) * 20 + trophyBonus + goalBonus;

  const rankWeights = getRankWeights(rankScore);

  return { eligible: true, nominationWeight, rankWeights };
}

function calcRankTrophyBonus(
  continentalResult: string | null | undefined,
  continentalType: string | null | undefined,
  nationalResult: string | null | undefined,
  nationalType: string | null | undefined,
  standing: number | null | undefined,
  clubPrestige: number,
): number {
  let bonus = 0;
  if (nationalResult === "Winner") bonus += nationalType === "FIFA World Cup" ? 35 : 20;
  if (continentalResult === "Winner") bonus += ["UCL", "Libertadores"].includes(continentalType ?? "") ? 30 : 15;
  if (standing === 1) bonus += clubPrestige >= 4 ? 15 : 8;
  return bonus;
}

function getRankWeights(rankScore: number): number[] {
  if (rankScore > 30) return [25, 22, 18, 12, 8, 5, 4, 3, 2, 1];
  if (rankScore > 20) return [15, 18, 17, 13, 12, 8, 7, 5, 3, 2];
  if (rankScore > 10) return [8, 12, 15, 13, 12, 10, 10, 8, 6, 6];
  return [3, 7, 10, 10, 10, 15, 15, 15, 8, 7];
}

// ── Main service ───────────────────────────────────────────────────────────

export function simulatePlayerSeasonService(input: PlayerSeasonInput): SimulatedSeasonResult {
  const {
    ovr, position, luckRating, clubPrestige, leagueClubsCount,
    hasContinentalCup, playerNationality, currentStats,
    standingResult, domesticCupResult, continentalCupResult, continentalCupType,
    nationalCallupResult, nationalTournamentResult, nationalTournamentType,
    trainingCampActive,
  } = input;

  const events: { type: string; label: string }[] = [];

  // 1. Match counts — deterministic từ outcomes
  const leagueMatches = (leagueClubsCount - 1) * 2;
  const cupMatches = getCupMatches(domesticCupResult);
  const continentalMatches = hasContinentalCup ? getContinentalMatches(continentalCupResult) : 0;
  const nationalMatches = getNationalMatches(nationalCallupResult, nationalTournamentResult);
  const maxSeasonMatches = leagueMatches + cupMatches + continentalMatches + nationalMatches;

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
  const randModifier = resolveRandomFloat(-0.05, 0.05);
  const finalAppsRatio = Math.min(
    0.95,
    Math.max(0.05, estimateAppsRatio(effPositionOvr, clubPrestige) + standingBonus + randModifier),
  );
  // Training Camp (shop item) — flat rating bonus applied uniformly below, not an apps term.
  const perfBonus = trainingCampActive ? TRAINING_CAMP_RATING_BONUS : 0;

  // 3. Per-competition apps
  const leagueApps = Math.max(1, Math.round(leagueMatches * finalAppsRatio));
  const cupApps = cupMatches > 0 ? Math.max(0, Math.round(cupMatches * finalAppsRatio * 0.90)) : 0;
  const continentalApps = continentalMatches > 0 ? Math.max(0, Math.round(continentalMatches * finalAppsRatio)) : 0;
  const nationalApps = nationalMatches > 0 ? Math.max(0, Math.round(nationalMatches * finalAppsRatio * 0.85)) : 0;
  const totalApps = leagueApps + cupApps + continentalApps + nationalApps;

  // 4. Per-competition goals/assists/CS (volume ∝ apps)
  const { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, leagueApps, "league", currentStats, maxLeagueTeamCS,
  );
  const { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, cupApps, "domestic_cup", currentStats, maxCupTeamCS,
  );
  const { goals: ctGoals, assists: ctAssists, cleanSheets: contCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, continentalApps, "continental", currentStats, maxContinentalTeamCS,
  );
  const { goals: ntGoals, assists: ntAssists, cleanSheets: natCS } = rollCompetitionOutput(
    position, effPositionOvr, clubPrestige, nationalApps, "national", currentStats, maxNationalTeamCS,
  );

  // 5. Match ratings per competition (SoT §7.3: use effPositionOvr for ovrVsClub)
  const lgRatingBonus = getStandingBonus(standingResult) * 0.8;
  const leagueRating = leagueApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, apps: leagueApps }, lgRatingBonus, perfBonus)
    : 0;
  const cupRating = cupApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, apps: cupApps }, 0, perfBonus)
    : 0;
  const contRating = continentalApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: ctGoals, assists: ctAssists, cleanSheets: contCS, apps: continentalApps }, 0, perfBonus)
    : 0;
  const natRating = nationalApps > 0
    ? calcRating(position, effPositionOvr, luckRating, clubPrestige, { goals: ntGoals, assists: ntAssists, cleanSheets: natCS, apps: nationalApps }, 0, perfBonus)
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

  // 7. Individual awards
  if (totalGoals >= 20 && ["ST", "LW", "RW"].includes(position)) {
    events.push({ type: "individual_award", label: `Đoạt chiếc giày vàng CLB với ${totalGoals} bàn thắng` });
  }
  if (totalCS >= 15 && position === "GK") {
    events.push({ type: "individual_award", label: `Đoạt Găng tay vàng với ${totalCS} trận giữ sạch lưới` });
  }
  if (totalCS >= 12 && ["CB", "LB", "RB", "CDM"].includes(position)) {
    events.push({ type: "individual_award", label: `Đoạt danh hiệu Hậu vệ xuất sắc nhất mùa giải với ${totalCS} trận sạch lưới` });
  }
  if (matchRating >= 7.60) {
    events.push({ type: "individual_award", label: `Lọt vào Đội hình tiêu biểu mùa giải với Rating ${matchRating}` });
  }

  // 8. Ballon d'Or eligibility — không còn random boolean, client sẽ spin wheels
  const ballonDor = calcBallonDorEligibility(
    ovr, position, matchRating, totalGoals,
    standingResult, clubPrestige,
    domesticCupResult, continentalCupResult, continentalCupType,
    nationalTournamentResult, nationalTournamentType,
  );

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
  };
}
