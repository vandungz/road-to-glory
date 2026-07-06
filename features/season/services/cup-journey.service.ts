export interface ClubCupInfo {
  id: string;
  name: string;
  prestige: number;
  leagueId: string;
  leagueCountry?: string;
  continentalType: string;
}

export function generateCupScore(isWinner: boolean, playerPrestige: number, oppPrestige: number): string {
  const prestigeDiff = playerPrestige - oppPrestige;
  
  if (isWinner) {
    // Thắng
    if (prestigeDiff >= 2) {
      // Hủy diệt
      const goals = [3, 4, 5][Math.floor(Math.random() * 3)];
      const oppGoals = [0, 1][Math.floor(Math.random() * 2)];
      return `Thắng ${goals}-${oppGoals}`;
    } else {
      // Thắng sít sao
      const goals = [1, 2, 3][Math.floor(Math.random() * 3)];
      const oppGoals = goals - (Math.random() > 0.6 ? 2 : 1);
      return `Thắng ${goals}-${Math.max(0, oppGoals)}`;
    }
  } else {
    // Thua
    if (prestigeDiff <= -2) {
      // Thua đậm
      const goals = [0, 1][Math.floor(Math.random() * 2)];
      const oppGoals = [3, 4][Math.floor(Math.random() * 2)];
      return `Thua ${goals}-${oppGoals}`;
    } else {
      // Thua sít sao
      const oppGoals = [1, 2, 3][Math.floor(Math.random() * 3)];
      const goals = oppGoals - 1;
      return `Thua ${goals}-${oppGoals}`;
    }
  }
}

export function generateDomesticCupJourneyService(params: {
  result: string;
  playerClubId: string;
  playerClubPrestige: number;
  opponents: ClubCupInfo[];
}): string[] {
  const { result, playerClubId, playerClubPrestige, opponents } = params;

  // Lọc đối thủ hợp lệ (khác CLB hiện tại)
  let pool = opponents.filter((c) => c.id !== playerClubId);
  if (pool.length === 0) {
    pool = [{ id: "mock_opp", name: "Đối Thủ Khác", prestige: 3, leagueId: "GENERIC", continentalType: "none" }];
  }

  const getRandomOpp = () => pool[Math.floor(Math.random() * pool.length)];

  const journey: string[] = [];

  if (result === "Early Exit") {
    const opp = getRandomOpp();
    const score = generateCupScore(false, playerClubPrestige, opp.prestige);
    journey.push(`Vòng 32: ${score} trước CLB ${opp.name} (Bị loại sớm) ❌`);
    return journey;
  }

  // Vòng 32
  let opp = getRandomOpp();
  let score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Vòng 32: ${score} trước CLB ${opp.name}`);

  // Vòng 16
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Vòng 16: ${score} trước CLB ${opp.name}`);

  // Tứ Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Tứ Kết: ${score} trước CLB ${opp.name}`);

  if (result === "Semi-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige);
    journey.push(`Bán Kết: ${score} trước CLB ${opp.name} (Dừng bước) 🥉`);
    return journey;
  }

  // Bán Kết (nếu vào chung kết)
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Bán Kết: ${score} trước CLB ${opp.name}`);

  // Chung Kết
  opp = getRandomOpp();
  const isWin = result === "Winner";
  score = generateCupScore(isWin, playerClubPrestige, opp.prestige);
  if (isWin) {
    journey.push(`Chung Kết: ${score} trước CLB ${opp.name} 🏆 VÔ ĐỊCH!`);
  } else {
    journey.push(`Chung Kết: ${score} trước CLB ${opp.name} 🥈 Á QUÂN`);
  }

  return journey;
}

export function generateContinentalCupJourneyService(params: {
  result: string;
  playerClubId: string;
  playerClubPrestige: number;
  cupName: string;
  opponents: ClubCupInfo[];
}): string[] {
  const { result, playerClubId, playerClubPrestige, cupName, opponents } = params;

  let pool = opponents.filter((c) => c.id !== playerClubId);
  if (pool.length === 0) {
    pool = [{ id: "mock_cont", name: "Đối Thủ Châu Lục", prestige: 4, leagueId: "GENERIC", continentalType: "none" }];
  }

  const getRandomOpp = () => pool[Math.floor(Math.random() * pool.length)];

  const journey: string[] = [];

  // Vòng Bảng
  if (result === "Group Stage") {
    const opp = getRandomOpp();
    journey.push(`Vòng Bảng: Xếp hạng 4 bảng đấu (Bị loại sau vòng bảng) ❌`);
    return journey;
  }

  journey.push("Vòng Bảng: Đi tiếp (Đứng nhì bảng đấu)");

  // Vòng 16
  let opp = getRandomOpp();
  let score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Vòng 16: ${score} trước CLB ${opp.name}`);

  // Tứ Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Tứ Kết: ${score} trước CLB ${opp.name}`);

  if (result === "Semi-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige);
    journey.push(`Bán Kết: ${score} trước CLB ${opp.name} (Dừng bước ở Bán kết) 🥉`);
    return journey;
  }

  // Bán Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige);
  journey.push(`Bán Kết: ${score} trước CLB ${opp.name}`);

  // Chung Kết
  opp = getRandomOpp();
  const isWin = result === "Winner";
  score = generateCupScore(isWin, playerClubPrestige, opp.prestige);
  if (isWin) {
    journey.push(`Chung Kết ${cupName}: ${score} trước CLB ${opp.name} 🏆 VÔ ĐỊCH!`);
  } else {
    journey.push(`Chung Kết ${cupName}: ${score} trước CLB ${opp.name} 🥈 Á QUÂN`);
  }

  return journey;
}

export function generateNationalTeamJourneyService(params: {
  result: string;
  tourneyName: string;
  playerNationality: string;
}): string[] {
  const { result, tourneyName, playerNationality } = params;

  // Lập danh sách các ĐTQG đối thủ
  const asianNations = ["Nhật Bản", "Hàn Quốc", "Iran", "Úc", "Saudi Arabia", "Qatar", "Iraq", "UAE", "Thái Lan"];
  const europeanNations = ["Anh", "Pháp", "Đức", "Tây Ban Nha", "Ý", "Bồ Đào Nha", "Hà Lan", "Bỉ", "Croatia"];
  const globalNations = ["Brazil", "Argentina", "Uruguay", "Mỹ", "Senegal", "Maroc", ...asianNations, ...europeanNations];

  const isAsia = ["Vietnam", "Japan", "South Korea", "China", "Saudi Arabia", "Qatar", "Thailand"].includes(playerNationality);
  
  let pool = isAsia ? asianNations : europeanNations;
  if (tourneyName === "FIFA World Cup") {
    pool = globalNations;
  }

  const getRandomNation = () => pool[Math.floor(Math.random() * pool.length)];

  const journey: string[] = [];

  if (result === "Group Stage") {
    journey.push(`Vòng Bảng ${tourneyName}: Bị loại sau 3 lượt trận (Đứng thứ 3/4 bảng đấu) ❌`);
    return journey;
  }

  journey.push(`Vòng Bảng ${tourneyName}: Vượt qua vòng bảng thuyết phục!`);

  // Vòng 16
  let nation = getRandomNation();
  journey.push(`Vòng 16: Thắng 2-1 trước ĐTQG ${nation}`);

  // Tứ Kết
  nation = getRandomNation();
  journey.push(`Tứ Kết: Thắng 1-0 trước ĐTQG ${nation}`);

  if (result === "Semi-Finals") {
    nation = getRandomNation();
    journey.push(`Bán Kết: Thua 0-1 trước ĐTQG ${nation} (Nhận huy chương đồng) 🥉`);
    return journey;
  }

  // Bán Kết
  nation = getRandomNation();
  journey.push(`Bán Kết: Thắng 2-1 trước ĐTQG ${nation}`);

  // Chung Kết
  nation = getRandomNation();
  const isWin = result === "Winner";
  if (isWin) {
    journey.push(`Chung Kết ${tourneyName}: Thắng 2-0 trước ĐTQG ${nation} 🏆 VÔ ĐỊCH QUỐC TẾ!`);
  } else {
    journey.push(`Chung Kết ${tourneyName}: Thua 1-2 trước ĐTQG ${nation} 🥈 Á QUÂN`);
  }

  return journey;
}
