import { getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import { resolveRandom, resolveRandomFloat } from "@/lib/wheel-engine/spin-resolver";

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
  if (result === "Semi-Finals") return 4;
  if (result === "Early Exit") return 2;
  return 2; // fallback
}

function getContinentalMatches(result: string | null | undefined): number {
  if (result === "Winner") return 13;
  if (result === "Runner-Up") return 12;
  if (result === "Semi-Finals") return 10;
  if (result === "Group Stage" || result === "Early Exit") return 6;
  return 6; // fallback
}

function getNationalMatches(
  callup: string | null | undefined,
  result: string | null | undefined
): number {
  if (callup !== "called_up") return 0;
  if (result === "Winner" || result === "Runner-Up") return 7;
  if (result === "Semi-Finals") return 5;
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

// ── Goals/Assists/CleanSheets per position ─────────────────────────────────

function calcAttackStats(
  position: string,
  ovr: number,
  playFactor: number,
  apps: number
): { goals: number; assists: number; cleanSheets: number } {
  let goals = 0;
  let assists = 0;
  const cleanSheets = 0;

  if (position === "GK") {
    assists = resolveRandom() > 0.97 ? 1 : 0;
  } else if (position === "CB") {
    goals = Math.round((resolveRandom() > 0.75 ? 2 : 0) + resolveRandomFloat(0, 3) * playFactor);
    assists = Math.round((resolveRandom() > 0.85 ? 1 : 0) + resolveRandomFloat(0, 2) * playFactor);
  } else if (position === "LB" || position === "RB") {
    goals = Math.round((resolveRandom() > 0.85 ? 1 : 0) + resolveRandomFloat(0, 2) * playFactor);
    assists = Math.round(resolveRandomFloat(1, 6) * playFactor);
  } else if (position === "CDM") {
    goals = Math.round(resolveRandomFloat(0, 3) * playFactor);
    assists = Math.round(resolveRandomFloat(1, 6) * playFactor);
  } else if (position === "CM") {
    goals = Math.round(resolveRandomFloat(1, 8) * playFactor);
    assists = Math.round(resolveRandomFloat(2, 11) * playFactor);
  } else if (position === "CAM") {
    goals = Math.round(resolveRandomFloat(2, 13) * playFactor);
    assists = Math.round(resolveRandomFloat(3, 16) * playFactor);
  } else if (position === "LW" || position === "RW") {
    goals = Math.round(resolveRandomFloat(3, 18) * playFactor);
    assists = Math.round(resolveRandomFloat(2, 13) * playFactor);
  } else if (position === "ST") {
    goals = Math.round(resolveRandomFloat(5, 29) * playFactor + (ovr - 60) * 0.12);
    assists = Math.round(resolveRandomFloat(1, 8) * playFactor);
  }

  return { goals: Math.max(0, goals), assists: Math.max(0, assists), cleanSheets };
}

function calcCleanSheets(
  position: string,
  ovr: number,
  clubPrestige: number,
  baseLeagueMatches: number,
  playFactor: number
): number {
  if (!["GK", "CB", "LB", "RB", "CDM"].includes(position)) return 0;

  let csBase: number;
  if (position === "GK") {
    csBase = (baseLeagueMatches * 0.15) + (clubPrestige * 1.5) + (ovr - 60) * 0.1;
  } else if (position === "CB") {
    csBase = (baseLeagueMatches * 0.14) + (clubPrestige * 1.5) + (ovr - 60) * 0.08;
  } else if (position === "LB" || position === "RB") {
    csBase = (baseLeagueMatches * 0.13) + (clubPrestige * 1.3) + (ovr - 60) * 0.07;
  } else {
    csBase = (baseLeagueMatches * 0.11) + (clubPrestige * 1.0) + (ovr - 60) * 0.05;
  }

  return Math.round(Math.min(999, Math.max(0, csBase * playFactor + resolveRandomFloat(-1.5, 1.5))));
}

// ── Match Rating per competition ───────────────────────────────────────────

function calcRating(
  position: string,
  ovr: number,
  luckRating: number,
  compStats: { goals: number; assists: number; cleanSheets: number; apps: number },
  standingBonus = 0
): number {
  if (compStats.apps === 0) return 0;

  let base = 6.0 + (ovr - 55) * 0.015 + (luckRating / 20) * 0.25 + standingBonus;

  if (["ST", "LW", "RW", "CAM", "CM"].includes(position)) {
    const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
    base += gaFactor * 2.5;
  } else if (position === "CDM") {
    const csFactor = compStats.cleanSheets / compStats.apps;
    const gaFactor = (compStats.goals + compStats.assists) / compStats.apps;
    base += csFactor * 1.5 + gaFactor * 1.0;
  } else {
    const csFactor = compStats.cleanSheets / compStats.apps;
    base += csFactor * 2.8;
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
    hasContinentalCup, playerNationality,
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

  // 2. Apps ratio — high impact từ standing
  const clubThreshold = 55 + clubPrestige * 6;
  const ovrDifference = ovr - clubThreshold;
  let baseAppsRatio = 0.55;
  if (ovrDifference > 10) baseAppsRatio = 0.85;
  else if (ovrDifference < -10) baseAppsRatio = 0.25;
  else baseAppsRatio = 0.55 + ovrDifference * 0.03;

  // CLB càng nhỏ (prestige thấp) càng ít phương án thay thế cùng vị trí → cầu thủ
  // đạt chuẩn tối thiểu có xu hướng đá chính nhiều hơn, độc lập với khoảng cách OVR
  // so với chuẩn CLB. CLB top (prestige 5) không được cộng thêm vì vốn đã có
  // nhiều lựa chọn xoay tua.
  const squadDepthBonus = (5 - clubPrestige) * 0.03;

  const standingBonus = getStandingBonus(standingResult);
  const randModifier = resolveRandomFloat(-0.05, 0.05); // giảm từ ±0.08
  const finalAppsRatio = Math.min(0.95, Math.max(0.05, baseAppsRatio + squadDepthBonus + standingBonus + randModifier));

  // 3. Per-competition apps
  const leagueApps = Math.max(1, Math.round(leagueMatches * finalAppsRatio));
  const cupApps = cupMatches > 0 ? Math.max(0, Math.round(cupMatches * finalAppsRatio * 0.90)) : 0;
  const continentalApps = continentalMatches > 0 ? Math.max(0, Math.round(continentalMatches * finalAppsRatio)) : 0;
  const nationalApps = nationalMatches > 0 ? Math.max(0, Math.round(nationalMatches * finalAppsRatio * 0.85)) : 0;
  const totalApps = leagueApps + cupApps + continentalApps + nationalApps;

  // 4. Per-competition goals/assists
  const leaguePf = leagueApps / leagueMatches;
  const { goals: lgGoals, assists: lgAssists } = calcAttackStats(position, ovr, leaguePf, leagueApps);
  const leagueCS = Math.min(leagueApps, calcCleanSheets(position, ovr, clubPrestige, leagueMatches, leaguePf));

  const cupPf = cupMatches > 0 ? cupApps / cupMatches : 0;
  const { goals: cpGoals, assists: cpAssists } = calcAttackStats(position, ovr, cupPf, cupApps);
  const cupCS = cupApps > 0
    ? Math.min(cupApps, calcCleanSheets(position, ovr, clubPrestige, cupMatches, cupPf))
    : 0;

  const contPf = continentalMatches > 0 ? continentalApps / continentalMatches : 0;
  const { goals: ctGoals, assists: ctAssists } = calcAttackStats(position, ovr, contPf, continentalApps);
  const contCS = continentalApps > 0
    ? Math.min(continentalApps, calcCleanSheets(position, ovr, clubPrestige, continentalMatches, contPf))
    : 0;

  const natPf = nationalMatches > 0 ? nationalApps / nationalMatches : 0;
  const { goals: ntGoals, assists: ntAssists } = calcAttackStats(position, ovr, natPf, nationalApps);
  const natCS = nationalApps > 0
    ? Math.min(nationalApps, calcCleanSheets(position, ovr, clubPrestige, nationalMatches, natPf))
    : 0;

  // 5. Match ratings per competition
  const lgRatingBonus = getStandingBonus(standingResult) * 0.8; // standing ảnh hưởng league rating
  const leagueRating = leagueApps > 0
    ? calcRating(position, ovr, luckRating, { goals: lgGoals, assists: lgAssists, cleanSheets: leagueCS, apps: leagueApps }, lgRatingBonus)
    : 0;
  const cupRating = cupApps > 0
    ? calcRating(position, ovr, luckRating, { goals: cpGoals, assists: cpAssists, cleanSheets: cupCS, apps: cupApps })
    : 0;
  const contRating = continentalApps > 0
    ? calcRating(position, ovr, luckRating, { goals: ctGoals, assists: ctAssists, cleanSheets: contCS, apps: continentalApps })
    : 0;
  const natRating = nationalApps > 0
    ? calcRating(position, ovr, luckRating, { goals: ntGoals, assists: ntAssists, cleanSheets: natCS, apps: nationalApps })
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
