import { getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import { resolveRandom, resolveRandomFloat } from "@/lib/wheel-engine/spin-resolver";
import {
  getPerAppRates,
  applyPrestigeToCsRate,
  clampCompetitionStats,
  type CompContext,
} from "@/lib/season-stat-rates";
import { estimateAppsRatio } from "@/lib/club-fit";

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

/** Overqualify brake: when ovr ≫ club, G/A/CS contribution to rating shrinks (SoT §7.1). */
function getOverqualifyPerfScale(ovr: number, clubPrestige: number): number {
  const threshold = 55 + clubPrestige * 6;
  const diff = ovr - threshold;
  if (diff < 8) return 1;
  if (diff >= 16) return 0.55;
  // Linear 8→16: 1.0→0.55
  return 1 - ((diff - 8) / 8) * 0.45;
}

function calcRating(
  position: string,
  ovr: number,
  luckRating: number,
  clubPrestige: number,
  compStats: { goals: number; assists: number; cleanSheets: number; apps: number },
  standingBonus = 0
): number {
  if (compStats.apps === 0) return 0;

  const clubThreshold = 55 + clubPrestige * 6;
  // SoT §7.3: rating relative to club environment (capped)
  const ovrVsClub = Math.max(-1.2, Math.min(1.2, (ovr - clubThreshold) * 0.01));
  let base = 6.0 + ovrVsClub + (luckRating / 20) * 0.25 + standingBonus;

  const perfScale = getOverqualifyPerfScale(ovr, clubPrestige);

  if (["ST", "LW", "RW", "CAM", "CM"].includes(position)) {
    const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
    base += gaFactor * 1.8 * perfScale;
  } else if (position === "CDM") {
    const csFactor = compStats.cleanSheets / compStats.apps;
    const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
    base += (csFactor * 1.3 + gaFactor * 0.9) * perfScale;
  } else {
    const csFactor = compStats.cleanSheets / compStats.apps;
    base += csFactor * 2.2 * perfScale;
  }

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

  // 2. Apps ratio — player↔club fit (SoT §7.6) + standing
  const standingBonus = getStandingBonus(standingResult);
  const randModifier = resolveRandomFloat(-0.05, 0.05);
  const finalAppsRatio = Math.min(
    0.95,
    Math.max(0.05, estimateAppsRatio(ovr, clubPrestige) + standingBonus + randModifier),
  );

  // 3. Per-competition apps
  const leagueApps = Math.max(1, Math.round(leagueMatches * finalAppsRatio));
  const cupApps = cupMatches > 0 ? Math.max(0, Math.round(cupMatches * finalAppsRatio * 0.90)) : 0;
  const continentalApps = continentalMatches > 0 ? Math.max(0, Math.round(continentalMatches * finalAppsRatio)) : 0;
  const nationalApps = nationalMatches > 0 ? Math.max(0, Math.round(nationalMatches * finalAppsRatio * 0.85)) : 0;
  const totalApps = leagueApps + cupApps + continentalApps + nationalApps;

  // 4. Per-competition goals/assists/CS (volume ∝ apps)
  const { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS } = rollCompetitionOutput(
    position, ovr, clubPrestige, leagueApps, "league", currentStats, maxLeagueTeamCS,
  );
  const { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS } = rollCompetitionOutput(
    position, ovr, clubPrestige, cupApps, "domestic_cup", currentStats,
  );
  const { goals: ctGoals, assists: ctAssists, cleanSheets: contCS } = rollCompetitionOutput(
    position, ovr, clubPrestige, continentalApps, "continental", currentStats,
  );
  const { goals: ntGoals, assists: ntAssists, cleanSheets: natCS } = rollCompetitionOutput(
    position, ovr, clubPrestige, nationalApps, "national", currentStats,
  );

  // 5. Match ratings per competition
  const lgRatingBonus = getStandingBonus(standingResult) * 0.8;
  const leagueRating = leagueApps > 0
    ? calcRating(position, ovr, luckRating, clubPrestige, { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, apps: leagueApps }, lgRatingBonus)
    : 0;
  const cupRating = cupApps > 0
    ? calcRating(position, ovr, luckRating, clubPrestige, { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, apps: cupApps })
    : 0;
  const contRating = continentalApps > 0
    ? calcRating(position, ovr, luckRating, clubPrestige, { goals: ctGoals, assists: ctAssists, cleanSheets: contCS, apps: continentalApps })
    : 0;
  const natRating = nationalApps > 0
    ? calcRating(position, ovr, luckRating, clubPrestige, { goals: ntGoals, assists: ntAssists, cleanSheets: natCS, apps: nationalApps })
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
