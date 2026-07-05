// features/wheel/lib/simulation-helpers.ts

export function calculateContinentalQualification(leagueId: string, standing: number): string {
  if (!leagueId) return "none";
  
  const id = leagueId.toUpperCase();
  
  // 1. Nhóm giải siêu cấp châu Âu (Top 4 leagues: Anh, Tây Ban Nha, Đức, Ý)
  if (["ENG1", "ESP1", "GER1", "ITA1"].includes(id)) {
    if (standing <= 4) return "UCL";
    if (standing <= 6) return "UEL";
    if (standing === 7) return "UECL";
  }
  
  // 2. Nhóm giải cấp 2 châu Âu (Pháp, Bồ Đào Nha, Hà Lan, Thổ Nhĩ Kỳ, Bỉ)
  if (["FRA1", "POR1", "NED1", "TUR1", "BEL1"].includes(id)) {
    if (standing <= 2) return "UCL";
    if (standing <= 4) return "UEL";
    if (standing === 5) return "UECL";
  }
  
  // 3. Nhóm giải cấp 3 châu Âu (Scotland...)
  if (["SCO1"].includes(id)) {
    if (standing === 1) return "UCL";
    if (standing === 2) return "UEL";
    if (standing === 3) return "UECL";
  }
  
  // 4. Nhóm Nam Mỹ (Brazil, Argentina)
  if (["BRA1", "ARG1"].includes(id)) {
    if (standing <= 6) return "Libertadores";
  }
  if (["COL1", "ECU1", "URU1", "CHI1"].includes(id)) {
    if (standing <= 2) return "Libertadores";
  }
  
  // 5. Nhóm Châu Á (Nhật Bản, Hàn Quốc, Saudi Arabia...)
  if (["JPN1", "KOR1", "KSA1"].includes(id)) {
    if (standing <= 3) return "AFC_CL";
  }
  if (["QAT1", "UAE1", "AUS1", "IND1", "CHN1"].includes(id)) {
    if (standing === 1) return "AFC_CL";
  }
  
  // 6. Nhóm Bắc Mỹ (Mỹ, Mexico)
  if (["USA1", "MEX1"].includes(id)) {
    if (standing <= 3) return "CONCACAF_CC";
  }
  
  return "none";
}

export function getContinentalCupLabel(cupType: string): string {
  switch (cupType) {
    case "UCL": return "UEFA Champions League";
    case "UEL": return "UEFA Europa League";
    case "UECL": return "UEFA Conference League";
    case "Libertadores": return "Copa Libertadores";
    case "AFC_CL": return "AFC Champions League";
    case "CONCACAF_CC": return "CONCACAF Champions Cup";
    default: return "Cúp Châu Lục CLB";
  }
}

export function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function getMockOpponentsByLeagueName(leagueName: string, leagueId?: string): string[] {
  const name = leagueName.toLowerCase();
  const id = leagueId?.toUpperCase() ?? "";

  if (name.includes("la liga 2") || name.includes("la liga 2") || id === "ESP2") {
    return ["Granada", "Málaga", "Cádiz", "Elche", "Almería", "Deportivo La Coruña", "Huesca", "Burgos", "Mirandés", "Albacete", "Castellón", "Racing Santander"];
  }
  if (name.includes("championship") || id === "ENG2") {
    return ["Leeds United", "Norwich City", "Sunderland", "Coventry City", "Burnley", "Watford", "Middlesbrough", "West Brom", "Sheffield Utd", "Luton Town", "Blackburn", "Hull City"];
  }
  if (name.includes("2. bundesliga") || id === "GER2") {
    return ["Hamburger SV", "Schalke 04", "Hertha BSC", "FC Köln", "Hannover 96", "Fortuna Düsseldorf", "Kaiserslautern", "Paderborn", "Karlsruher SC", "Nürnberg"];
  }
  if (name.includes("serie b") || id === "ITA2") {
    return ["Palermo", "Sampdoria", "Bari", "Cremonese", "Sassuolo", "Salernitana", "Frosinone", "Spezia", "Pisa", "Brescia"];
  }
  if (name.includes("ligue 2") || id === "FRA2") {
    return ["Bordeaux", "Paris FC", "Caen", "Troyes", "Metz", "Lorient", "Clermont", "Guingamp", "Grenoble", "Amiens"];
  }

  if (name.includes("premier league") || name.includes("england") || name.includes("anh")) {
    return ["Arsenal", "Man City", "Liverpool", "Man United", "Chelsea", "Tottenham", "Aston Villa", "Newcastle", "Everton", "Brighton", "West Ham", "Leicester"];
  }
  if (name.includes("bundesliga") || name.includes("germany") || name.includes("đức")) {
    return ["Bayern München", "Dortmund", "Leverkusen", "RB Leipzig", "Stuttgart", "Frankfurt", "Freiburg", "Mönchengladbach", "Hoffenheim", "Werder Bremen"];
  }
  if (name.includes("la liga") || name.includes("spain") || name.includes("tây ban nha")) {
    return ["Real Madrid", "Barcelona", "Atlético Madrid", "Real Sociedad", "Real Betis", "Villarreal", "Sevilla", "Athletic Bilbao", "Girona", "Valencia"];
  }
  if (name.includes("serie a") || name.includes("italy") || name.includes("ý")) {
    return ["Inter Milan", "AC Milan", "Juventus", "Napoli", "Lazio", "AS Roma", "Atalanta", "Fiorentina", "Bologna", "Torino"];
  }
  if (name.includes("ligue 1") || name.includes("france") || name.includes("pháp")) {
    return ["PSG", "Marseille", "Monaco", "Lille", "Lens", "Rennes", "Lyon", "Nice", "Reims", "Strasbourg"];
  }
  if (name.includes("stars league") || name.includes("qatar")) {
    return ["Al-Sadd", "Al-Duhail", "Al-Rayyan", "Al-Gharafa", "Al-Arabi", "Al-Wakra", "Umm Salal", "Qatar SC", "Al-Ahli", "Al-Khor"];
  }
  if (name.includes("série a") || name.includes("série b") || name.includes("brazil")) {
    return ["Palmeiras", "Flamengo", "Atlético Mineiro", "Fluminense", "Grêmio", "São Paulo", "Botafogo", "Red Bull Bragantino", "Athletico Paranaense", "Coritiba"];
  }
  return ["FC United", "City FC", "Rangers", "Athletic", "Real Club", "FC Dynamo", "Rovers", "Town FC", "Sporting", "Inter FC"];
}

export function getStandingWheelPool(clubPrestige: number, ovr: number, leagueSize: number, apps: number = 38) {
  const targetOvr = 55 + clubPrestige * 6;
  const diff = ovr - targetOvr;
  const influenceFactor = Math.min(1.0, Math.max(0.0, apps / 55));

  const pool = Array.from({ length: leagueSize }, (_, i) => {
    const pos = i + 1;
    let baseWeight = 10;

    const expectedPos = Math.max(1, Math.min(leagueSize, Math.round(leagueSize - clubPrestige * (leagueSize / 5) + 1)));
    const dist = Math.abs(pos - expectedPos);
    baseWeight = Math.max(1, 40 - dist * (35 / leagueSize));

    let ovrModifier = 0;
    if (diff > 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.5 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.2 * influenceFactor;
    } else if (diff < 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.2 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.5 * influenceFactor;
    }

    const finalWeight = Math.max(1, Math.round(baseWeight + ovrModifier));
    return {
      value: pos,
      weight: finalWeight,
    };
  });

  return pool;
}

export function generateDomesticCupJourney(result: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng 32: Thắng 3-0", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 1-0", "Bán Kết: Thắng 2-0", "Chung Kết: Thắng 2-1 🏆 VÔ ĐỊCH!"];
    case "Runner-Up":
      return ["Vòng 32: Thắng 2-0", "Vòng 16: Thắng 3-1", "Tứ Kết: Thắng 1-0 (H.Phụ)", "Bán Kết: Thắng 2-1", "Chung Kết: Thua 0-1 🥈 Á QUÂN"];
    case "Semi-Finals":
      return ["Vòng 32: Thắng 4-1", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 1-0", "Bán Kết: Thua 1-2 🥉 Hạng 3/4"];
    default:
      return ["Vòng 32: Thua 0-1 (Bị loại sớm) ❌"];
  }
}

export function generateContinentalCupJourney(result: string, cupType: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng Bảng: Đi tiếp (Đầu bảng)", "Vòng 16: Thắng 3-2 (Tổng tỉ số)", "Tứ Kết: Thắng 4-1", "Bán Kết: Thắng 2-0", `Chung Kết ${cupType}: Thắng 1-0 🏆 VÔ ĐỊCH!`];
    case "Runner-Up":
      return ["Vòng Bảng: Đi tiếp (Nhì bảng)", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 3-0", "Bán Kết: Thắng 1-0", `Chung Kết ${cupType}: Thua 1-2 🥈 Á QUÂN`];
    case "Semi-Finals":
      return ["Vòng Bảng: Đi tiếp (Đầu bảng)", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 1-0", "Bán Kết: Thua 2-3 (Tổng tỉ số) 🥉 Dừng bước ở Bán kết"];
    default:
      return ["Vòng Bảng: Đứng thứ 4 chung cuộc (Bị loại vòng bảng) ❌"];
  }
}

export function generateNationalTeamJourney(result: string, tourneyName: string): string[] {
  switch (result) {
    case "Winner":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 2-0", "Tứ Kết: Thắng 3-1", "Bán Kết: Thắng 1-0", `Chung Kết ${tourneyName}: Thắng 2-1 🏆 VÔ ĐỊCH QUỐC TẾ!`];
    case "Runner-Up":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 1-0", "Tứ Kết: Thắng 2-0", "Bán Kết: Thắng 2-1", `Chung Kết ${tourneyName}: Thua 0-2 🥈 Á QUÂN`];
    case "Semi-Finals":
      return ["Vòng Bảng: Đi tiếp", "Vòng 16: Thắng 2-1", "Tứ Kết: Thắng 1-0", `Bán Kết ${tourneyName}: Thua 1-2 (Dừng bước ở Bán kết)`];
    default:
      return [`Vòng Bảng ${tourneyName}: Không thể vượt qua vòng bảng ❌`];
  }
}

export function generateMockLeagueTable(playerStanding: number, clubName: string, currentLeagueClubs: any[]) {
  const sorted = [...currentLeagueClubs].sort((a, b) => b.prestige - a.prestige);
  const playerClubIndex = sorted.findIndex(c => c.name.toLowerCase() === clubName.toLowerCase());
  let playerClubObj = sorted[playerClubIndex];
  if (!playerClubObj) {
    playerClubObj = { id: "player", name: clubName, prestige: 4, continentalType: "none" };
  }

  const tempClubs = sorted.filter(c => c.name.toLowerCase() !== clubName.toLowerCase());
  const targetIdx = playerStanding - 1;
  const finalTable = [];

  let tempIdx = 0;
  const size = currentLeagueClubs.length;
  for (let i = 0; i < size; i++) {
    if (i === targetIdx) {
      finalTable.push({
        clubId: playerClubObj.id,
        name: playerClubObj.name,
        played: 38,
        won: Math.max(0, Math.round(size * 1.4) - playerStanding * 2),
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: Math.max(0, playerStanding * 2 - 2),
        points: Math.max(20, Math.round(size * 4.6) - playerStanding * 4),
      });
    } else {
      const opponent = tempClubs[tempIdx] || { id: `opp_${i}`, name: `Opponent ${i}`, prestige: 3 };
      tempIdx++;
      const oppStanding = i + 1;
      finalTable.push({
        clubId: opponent.id,
        name: opponent.name,
        played: 38,
        won: Math.max(0, Math.round(size * 1.4) - oppStanding * 2),
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: Math.max(0, oppStanding * 2 - 2),
        points: Math.max(15, Math.round(size * 4.6) - oppStanding * 4),
      });
    }
  }
  return finalTable;
}
