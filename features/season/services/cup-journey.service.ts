import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { clubJourneyStrength, drawJourneyOpponents, journeyRounds } from "./journey-opponents";

export interface ClubCupInfo {
  id: string;
  name: string;
  prestige: number;
  leagueId: string;
  leagueCountry?: string;
  league?: { prestige: number };
  continentalType: string;
}

export function generateCupScore(isWinner: boolean, playerPrestige: number, oppPrestige: number, randomSource: RandomSource = resolveRandom): string {
  const randomInt = (min: number, max: number) => Math.floor(randomSource() * (max - min + 1)) + min;
  const prestigeDiff = playerPrestige - oppPrestige;
  
  if (isWinner) {
    // Thắng
    if (prestigeDiff >= 2) {
      // Hủy diệt
      const goals = [3, 4, 5][randomInt(0, 2)];
      const oppGoals = [0, 1][randomInt(0, 1)];
      return `Thắng ${goals}-${oppGoals}`;
    } else {
      // Thắng sít sao
      const goals = [1, 2, 3][randomInt(0, 2)];
      const oppGoals = goals - (randomSource() > 0.6 ? 2 : 1);
      return `Thắng ${goals}-${Math.max(0, oppGoals)}`;
    }
  } else {
    // Thua
    if (prestigeDiff <= -2) {
      // Thua đậm
      const goals = [0, 1][randomInt(0, 1)];
      const oppGoals = [3, 4][randomInt(0, 1)];
      return `Thua ${goals}-${oppGoals}`;
    } else {
      // Thua sít sao
      const oppGoals = [1, 2, 3][randomInt(0, 2)];
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
  randomSource?: RandomSource;
}): string[] {
  const { result, playerClubId, playerClubPrestige, opponents } = params;

  const pool = opponents.filter((c) => c.id !== playerClubId);
  if (!pool.length || !journeyRounds(result, true).length) return [];
  const selected = drawJourneyOpponents(pool, journeyRounds(result, true), clubJourneyStrength, params.randomSource);
  let opponentIndex = 0;
  const getRandomOpp = () => selected[opponentIndex++];

  const journey: string[] = [];

  // Vòng 1/32 (Early Exit)
  if (result === "Early Exit") {
    const opp = getRandomOpp();
    const score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Vòng 1/32: ${score} trước CLB ${opp.name} (Bị loại sớm)`);
    return journey;
  }

  // Vòng 1/32
  let opp = getRandomOpp();
  let score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Vòng 1/32: ${score} trước CLB ${opp.name}`);

  if (result === "Round of 32") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Vòng 1/16: ${score} trước CLB ${opp.name} (Dừng bước)`);
    return journey;
  }

  // Vòng 1/16
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Vòng 1/16: ${score} trước CLB ${opp.name}`);

  if (result === "Round of 16") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Vòng 1/8: ${score} trước CLB ${opp.name} (Dừng bước)`);
    return journey;
  }

  // Vòng 1/8
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Vòng 1/8: ${score} trước CLB ${opp.name}`);

  if (result === "Quarter-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Tứ Kết: ${score} trước CLB ${opp.name} (Dừng bước ở Tứ Kết) ⚡`);
    return journey;
  }

  // Tứ Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Tứ Kết: ${score} trước CLB ${opp.name}`);

  if (result === "Semi-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Bán Kết: ${score} trước CLB ${opp.name} (Dừng bước ở Bán Kết)`);
    return journey;
  }

  // Bán Kết (nếu vào chung kết)
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Bán Kết: ${score} trước CLB ${opp.name}`);

  // Chung Kết
  opp = getRandomOpp();
  const isWin = result === "Winner";
  score = generateCupScore(isWin, playerClubPrestige, opp.prestige, params.randomSource);
  if (isWin) {
    journey.push(`Chung Kết: ${score} trước CLB ${opp.name} — VÔ ĐỊCH!`);
  } else {
    journey.push(`Chung Kết: ${score} trước CLB ${opp.name} — Á QUÂN`);
  }

  return journey;
}

export function generateContinentalCupJourneyService(params: {
  result: string;
  playerClubId: string;
  playerClubPrestige: number;
  cupName: string;
  opponents: ClubCupInfo[];
  randomSource?: RandomSource;
}): string[] {
  const { result, playerClubId, playerClubPrestige, cupName, opponents } = params;

  const pool = opponents.filter((c) => c.id !== playerClubId);
  const selected = drawJourneyOpponents(pool, journeyRounds(result, false), clubJourneyStrength, params.randomSource);
  let opponentIndex = 0;
  const getRandomOpp = () => selected[opponentIndex++];

  const journey: string[] = [];

  // Vòng Bảng
  if (result === "Group Stage" || result === "Early Exit") {
    journey.push(`Vòng Bảng: Xếp hạng 4/4 bảng đấu (Bị loại sau vòng bảng)`);
    return journey;
  }

  if (!selected.length) return [];

  journey.push("Vòng Bảng: Vượt qua vòng bảng thuyết phục!");

  if (result === "Round of 16") {
    const opp = getRandomOpp();
    const score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Vòng 1/8: ${score} trước CLB ${opp.name} (Dừng bước)`);
    return journey;
  }

  // Vòng 1/8
  let opp = getRandomOpp();
  let score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Vòng 1/8: ${score} trước CLB ${opp.name}`);

  if (result === "Quarter-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Tứ Kết: ${score} trước CLB ${opp.name} (Dừng bước ở Tứ kết) ⚡`);
    return journey;
  }

  // Tứ Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Tứ Kết: ${score} trước CLB ${opp.name}`);

  if (result === "Semi-Finals") {
    opp = getRandomOpp();
    score = generateCupScore(false, playerClubPrestige, opp.prestige, params.randomSource);
    journey.push(`Bán Kết: ${score} trước CLB ${opp.name} (Dừng bước ở Bán kết)`);
    return journey;
  }

  // Bán Kết
  opp = getRandomOpp();
  score = generateCupScore(true, playerClubPrestige, opp.prestige, params.randomSource);
  journey.push(`Bán Kết: ${score} trước CLB ${opp.name}`);

  // Chung Kết
  opp = getRandomOpp();
  const isWin = result === "Winner";
  score = generateCupScore(isWin, playerClubPrestige, opp.prestige, params.randomSource);
  if (isWin) {
    journey.push(`Chung Kết ${cupName}: ${score} trước CLB ${opp.name} — VÔ ĐỊCH!`);
  } else {
    journey.push(`Chung Kết ${cupName}: ${score} trước CLB ${opp.name} — Á QUÂN`);
  }

  return journey;
}

export interface NationalTeamInfo {
  id: string;
  name: string;        // tên hiển thị tiếng Việt
  nationality: string; // key tiếng Anh khớp với CareerPlayer.nationality
  confederation: string;
  tier: number;
}

export function generateNationalTeamJourneyService(params: {
  result: string;
  tourneyName: string;
  playerNationality: string;
  opponents: NationalTeamInfo[];
  randomSource?: RandomSource;
}): string[] {
  const { result, tourneyName, playerNationality, opponents } = params;

  const pool = opponents.filter((t) => t.nationality !== playerNationality);
  const selected = drawJourneyOpponents(pool, journeyRounds(result, false), (team) => 7 - 2 * team.tier, params.randomSource);
  let opponentIndex = 0;
  const getRandomNation = () => selected[opponentIndex++].name;

  const journey: string[] = [];

  if (result === "Group Stage") {
    journey.push(`Vòng Bảng ${tourneyName}: Bị loại sau vòng bảng`);
    return journey;
  }

  if (!selected.length) return [];

  journey.push(`Vòng Bảng ${tourneyName}: Vượt qua vòng bảng thuyết phục!`);

  if (result === "Round of 16") {
    const nation = getRandomNation();
    journey.push(`Vòng 1/8: Thua 1-2 trước ĐTQG ${nation} (Dừng bước)`);
    return journey;
  }

  // Vòng 1/8
  let nation = getRandomNation();
  journey.push(`Vòng 1/8: Thắng 2-1 trước ĐTQG ${nation}`);

  if (result === "Quarter-Finals") {
    nation = getRandomNation();
    journey.push(`Tứ Kết: Thua 0-1 trước ĐTQG ${nation} (Dừng bước ở Tứ Kết) ⚡`);
    return journey;
  }

  // Tứ Kết
  nation = getRandomNation();
  journey.push(`Tứ Kết: Thắng 1-0 trước ĐTQG ${nation}`);

  if (result === "Semi-Finals") {
    nation = getRandomNation();
    journey.push(`Bán Kết: Thua 0-1 trước ĐTQG ${nation} (Nhận huy chương đồng)`);
    return journey;
  }

  // Bán Kết
  nation = getRandomNation();
  journey.push(`Bán Kết: Thắng 2-1 trước ĐTQG ${nation}`);

  // Chung Kết
  nation = getRandomNation();
  const isWin = result === "Winner";
  if (isWin) {
    journey.push(`Chung Kết ${tourneyName}: Thắng 2-0 trước ĐTQG ${nation} — VÔ ĐỊCH QUỐC TẾ!`);
  } else {
    journey.push(`Chung Kết ${tourneyName}: Thua 1-2 trước ĐTQG ${nation} — Á QUÂN`);
  }

  return journey;
}
