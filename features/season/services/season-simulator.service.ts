import { getNationalTier } from "@/lib/wheel-engine/weight-calculator";

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
}

export interface SimulatedSeasonResult {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  matchRating: number;
  events: { type: string; label: string }[];
}

export function simulatePlayerSeasonService(input: PlayerSeasonInput): SimulatedSeasonResult {
  const {
    age,
    ovr,
    position,
    luckRating,
    clubPrestige,
    clubName,
    leagueName,
    leagueClubsCount,
    hasContinentalCup,
    playerNationality,
  } = input;
  
  const events: { type: string; label: string }[] = [];

  // 1. Tính toán số trận đấu tối đa tiềm năng (Max Season Matches)
  const leagueMatches = (leagueClubsCount - 1) * 2;
  
  // Domestic Cup: CLB prestige cao thì có khả năng tiến xa hơn (giả lập 1 đến 6 trận)
  const cupProgressChance = Math.random() * 5 + clubPrestige;
  const domesticCupMatches = cupProgressChance > 8 ? 6 : cupProgressChance > 6 ? 5 : cupProgressChance > 4 ? 3 : 1;

  // Continental Cup: Nếu được đá cúp châu lục (giả lập 6 đến 13 trận)
  let continentalMatches = 0;
  if (hasContinentalCup) {
    const contChance = Math.random() * 5 + clubPrestige;
    continentalMatches = contChance > 8 ? 13 : contChance > 6 ? 12 : 6;
  }

  // ĐTQG: Nếu đủ OVR gọi lên tuyển (OVR >= threshold theo tier quốc gia) và vào năm chẵn ĐTQG thi đấu
  let nationalMatches = 0;
  if (age % 2 === 0) {
    const tier = getNationalTier(playerNationality);
    const threshold = tier === 1 ? 80 : tier === 2 ? 75 : 70;
    if (ovr >= threshold) {
      const ntChance = Math.random() * 6 + (luckRating / 4);
      nationalMatches = ntChance > 8 ? 7 : ntChance > 5 ? 6 : 3;
    }
  }

  const maxSeasonMatches = leagueMatches + domesticCupMatches + continentalMatches + nationalMatches;

  // 2. Tính số trận ra sân (Apps) của Player dựa trên thực lực so với chất lượng CLB
  const clubThreshold = 55 + clubPrestige * 6;
  const ovrDifference = ovr - clubThreshold;

  let baseAppsRatio = 0.55; // Mặc định đá khoảng 55% số trận
  if (ovrDifference > 10) baseAppsRatio = 0.85; // Ngôi sao đá chính 85%
  else if (ovrDifference < -10) baseAppsRatio = 0.25; // Dự bị đá 25%
  else baseAppsRatio = 0.55 + (ovrDifference * 0.03); // Scale tuyến tính

  const randModifier = (Math.random() * 0.16) - 0.08; // Biến thiên phong độ/chấn thương +-8%
  const finalAppsRatio = Math.min(0.95, Math.max(0.05, baseAppsRatio + randModifier));
  
  const apps = Math.min(maxSeasonMatches, Math.max(1, Math.round(maxSeasonMatches * finalAppsRatio)));

  // 3. Tính số Bàn thắng (Goals), Kiến tạo (Assists) và Sạch lưới (Clean Sheets)
  let goals = 0;
  let assists = 0;
  let cleanSheets = 0;

  const playFactor = apps / maxSeasonMatches; // Tỷ lệ trận ra sân thực tế

  if (position === "GK") {
    goals = 0;
    assists = Math.random() > 0.97 ? 1 : 0;
    const csBase = (leagueMatches * 0.15) + (clubPrestige * 1.5) + (ovr - 60) * 0.1;
    cleanSheets = Math.round(Math.min(apps, Math.max(0, csBase * playFactor + (Math.random() * 3 - 1.5))));
  } else if (position === "CB") {
    goals = Math.round((Math.random() > 0.75 ? 2 : 0) + (Math.random() * 3) * playFactor);
    assists = Math.round((Math.random() > 0.85 ? 1 : 0) + (Math.random() * 2) * playFactor);
    const csBase = (leagueMatches * 0.14) + (clubPrestige * 1.5) + (ovr - 60) * 0.08;
    cleanSheets = Math.round(Math.min(apps, Math.max(0, csBase * playFactor + (Math.random() * 3 - 1.5))));
  } else if (position === "LB" || position === "RB") {
    goals = Math.round((Math.random() > 0.85 ? 1 : 0) + (Math.random() * 2) * playFactor);
    assists = Math.round((Math.random() * 5 + 1) * playFactor);
    const csBase = (leagueMatches * 0.13) + (clubPrestige * 1.3) + (ovr - 60) * 0.07;
    cleanSheets = Math.round(Math.min(apps, Math.max(0, csBase * playFactor + (Math.random() * 3 - 1.5))));
  } else if (position === "CDM") {
    goals = Math.round((Math.random() * 3) * playFactor);
    assists = Math.round((Math.random() * 5 + 1) * playFactor);
    const csBase = (leagueMatches * 0.11) + (clubPrestige * 1.0) + (ovr - 60) * 0.05;
    cleanSheets = Math.round(Math.min(apps, Math.max(0, csBase * playFactor + (Math.random() * 2 - 1))));
  } else if (position === "CM") {
    goals = Math.round((Math.random() * 7 + 1) * playFactor);
    assists = Math.round((Math.random() * 9 + 2) * playFactor);
  } else if (position === "CAM") {
    goals = Math.round((Math.random() * 11 + 2) * playFactor);
    assists = Math.round((Math.random() * 13 + 3) * playFactor);
  } else if (position === "LW" || position === "RW") {
    goals = Math.round((Math.random() * 15 + 3) * playFactor);
    assists = Math.round((Math.random() * 11 + 2) * playFactor);
  } else if (position === "ST") {
    goals = Math.round((Math.random() * 24 + 5) * playFactor + (ovr - 60) * 0.12);
    assists = Math.round((Math.random() * 7 + 1) * playFactor);
  }

  goals = Math.max(0, goals);
  assists = Math.max(0, assists);

  // 4. Tính toán Match Rating
  let performanceRating = 6.0 + (ovr - 55) * 0.015 + (luckRating / 20) * 0.25;

  if (["ST", "LW", "RW", "CAM", "CM"].includes(position)) {
    const gaFactor = (goals + assists) / apps;
    performanceRating += gaFactor * 2.5;
  } else if (position === "CDM") {
    const csFactor = cleanSheets / apps;
    const gaFactor = (goals + assists) / apps;
    performanceRating += csFactor * 1.5 + gaFactor * 1.0;
  } else {
    const csFactor = cleanSheets / apps;
    performanceRating += csFactor * 2.8;
  }

  performanceRating += (Math.random() * 0.4 - 0.2);
  const matchRating = Math.min(9.0, Math.max(5.5, Math.round(performanceRating * 100) / 100));

  // 5. Thêm các milestones/danh hiệu cá nhân nổi bật
  if (apps >= Math.round(maxSeasonMatches * 0.8)) {
    events.push({ type: "milestone", label: `Cầu thủ then chốt thi đấu ${apps} trận trong mùa giải` });
  }
  if (goals >= 20 && ["ST", "LW", "RW"].includes(position)) {
    events.push({ type: "individual_award", label: `Đoạt chiếc giày vàng CLB với ${goals} bàn thắng` });
  }
  if (cleanSheets >= 15 && ["GK", "CB"].includes(position)) {
    events.push({ type: "individual_award", label: `Đoạt Găng tay vàng với ${cleanSheets} trận giữ sạch lưới` });
  }
  if (matchRating >= 7.60) {
    events.push({ type: "individual_award", label: `Lọt vào Đội hình tiêu biểu mùa giải với Rating ${matchRating}` });
  }

  return {
    apps,
    goals,
    assists,
    cleanSheets,
    matchRating,
    events,
  };
}
