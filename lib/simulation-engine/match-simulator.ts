// ============================================================
// MATCH & SEASON SIMULATOR
// ============================================================

export interface PlayerSeasonInput {
  age: number;
  ovr: number;
  position: string;
  luckRating: number; // 1-20
  clubPrestige: number; // 1-5
  clubName: string;
  leagueName: string;
}

export interface SimulatedSeasonResult {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  matchRating: number;
  events: { type: string; label: string }[];
}

/**
 * Mô phỏng kết quả một mùa giải cho cầu thủ dựa trên thuộc tính cá nhân và CLB.
 * Chỉ mô phỏng stats cá nhân và các milestones/danh hiệu cá nhân.
 */
export function simulatePlayerSeason(input: PlayerSeasonInput): SimulatedSeasonResult {
  const { age, ovr, position, luckRating, clubPrestige, clubName, leagueName } = input;
  const events: { type: string; label: string }[] = [];

  // 1. Tính toán vai trò và số trận ra sân (Apps)
  const threshold = 55 + (clubPrestige * 6); 
  const ovrDifference = ovr - threshold;

  let baseApps = 30;
  if (ovrDifference > 10) baseApps = 45;
  else if (ovrDifference < -10) baseApps = 15;
  else baseApps = 30 + Math.round(ovrDifference * 1.5);

  const randModifier = Math.floor(Math.random() * 9) - 4;
  const apps = Math.min(55, Math.max(5, baseApps + randModifier));

  // 2. Tính số Bàn thắng (Goals), Kiến tạo (Assists) và Sạch lưới (Clean Sheets) TRƯỚC
  let goals = 0;
  let assists = 0;
  let cleanSheets = 0;

  const playFactor = apps / 55; // Tỷ lệ trận ra sân

  if (position === "GK") {
    goals = 0;
    assists = Math.random() > 0.95 ? 1 : 0;
    const csBase = 6 + clubPrestige * 3 + (ovr - 60) * 0.2;
    cleanSheets = Math.round(Math.min(25, Math.max(2, csBase * playFactor + (Math.random() * 4 - 2))));
  } else if (position === "CB") {
    goals = Math.round((Math.random() > 0.7 ? 2 : 0) + (Math.random() * 3) * playFactor);
    assists = Math.round((Math.random() > 0.8 ? 1 : 0) + (Math.random() * 2) * playFactor);
    const csBase = 5 + clubPrestige * 3 + (ovr - 60) * 0.18;
    cleanSheets = Math.round(Math.min(25, Math.max(2, csBase * playFactor + (Math.random() * 4 - 2))));
  } else if (position === "LB" || position === "RB") {
    goals = Math.round((Math.random() > 0.8 ? 1 : 0) + (Math.random() * 2) * playFactor);
    assists = Math.round((Math.random() * 6 + 1) * playFactor);
    const csBase = 5 + clubPrestige * 3 + (ovr - 60) * 0.15;
    cleanSheets = Math.round(Math.min(25, Math.max(2, csBase * playFactor + (Math.random() * 4 - 2))));
  } else if (position === "CDM") {
    goals = Math.round((Math.random() * 4) * playFactor);
    assists = Math.round((Math.random() * 6 + 1) * playFactor);
    const csBase = 4 + clubPrestige * 2 + (ovr - 60) * 0.1;
    cleanSheets = Math.round(Math.min(20, Math.max(1, csBase * playFactor + (Math.random() * 3 - 1))));
  } else if (position === "CM") {
    goals = Math.round((Math.random() * 8 + 1) * playFactor);
    assists = Math.round((Math.random() * 10 + 2) * playFactor);
  } else if (position === "CAM") {
    goals = Math.round((Math.random() * 12 + 2) * playFactor);
    assists = Math.round((Math.random() * 14 + 3) * playFactor);
  } else if (position === "LW" || position === "RW") {
    goals = Math.round((Math.random() * 16 + 3) * playFactor);
    assists = Math.round((Math.random() * 12 + 2) * playFactor);
  } else if (position === "ST") {
    goals = Math.round((Math.random() * 26 + 6) * playFactor + (ovr - 60) * 0.15);
    assists = Math.round((Math.random() * 8 + 1) * playFactor);
  }

  goals = Math.max(0, goals);
  assists = Math.max(0, assists);

  // 3. Điểm đánh giá trung bình (Match Rating) dựa trên hiệu suất thi đấu thực tế
  let performanceRating = 6.0 + (ovr - 55) * 0.015 + (luckRating / 20) * 0.25;

  if (["ST", "LW", "RW", "CAM", "CM"].includes(position)) {
    // Vị trí tấn công: đánh giá qua G/A trên số trận
    const gaFactor = (goals + assists) / apps;
    performanceRating += gaFactor * 2.5;
  } else if (position === "CDM") {
    // CDM: đánh giá qua cả sạch lưới lẫn G/A
    const csFactor = cleanSheets / apps;
    const gaFactor = (goals + assists) / apps;
    performanceRating += csFactor * 1.5 + gaFactor * 1.0;
  } else {
    // Vị trí phòng thủ & GK (CB, LB, RB, GK): đánh giá qua tỷ lệ giữ sạch lưới
    const csFactor = cleanSheets / apps;
    performanceRating += csFactor * 2.8;
  }

  // Cộng biến thiên ngẫu nhiên nhỏ phong độ từng mùa
  performanceRating += (Math.random() * 0.4 - 0.2);
  const matchRating = Math.min(9.0, Math.max(5.5, Math.round(performanceRating * 100) / 100));

  // 4. Thêm các milestones/danh hiệu cá nhân nổi bật
  if (apps >= 40) {
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
