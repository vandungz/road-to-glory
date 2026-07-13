import { resolveRandomFloat, resolveRandomInt } from "@/lib/wheel-engine/spin-resolver";

export interface ClubInfo {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  continentalType: string;
}

export interface TableRow {
  clubId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

export function simulateDynamicLeagueTableService(
  playerStanding: number,
  playerClubName: string,
  currentLeagueClubs: ClubInfo[]
): TableRow[] {
  const sorted = [...currentLeagueClubs].sort((a, b) => b.prestige - a.prestige);
  const playerClubIndex = sorted.findIndex(c => c.name.toLowerCase() === playerClubName.toLowerCase());
  let playerClubObj = sorted[playerClubIndex];
  if (!playerClubObj) {
    playerClubObj = { id: "player", name: playerClubName, prestige: 4, continentalType: "none", leagueId: "GENERIC" };
  }

  const tempClubs = sorted.filter(c => c.name.toLowerCase() !== playerClubName.toLowerCase());
  const size = sorted.length;
  const finalTable: TableRow[] = [];

  let tempIdx = 0;
  const played = (size - 1) * 2;
  
  // Hạng 1 có khoảng 85-92% số điểm tối đa (thực tế và hấp dẫn hơn)
  const maxPossiblePoints = played * 3;
  let currentPoints = Math.round(maxPossiblePoints * (0.75 + resolveRandomFloat(0, 0.1)));

  const step = Math.max(1.5, currentPoints / (size * 1.25));

  for (let pos = 1; pos <= size; pos++) {
    const isPlayer = pos === playerStanding;
    let teamName = "";
    let teamId = "";

    if (isPlayer) {
      teamName = playerClubObj.name;
      teamId = playerClubObj.id;
    } else {
      const opponent = tempClubs[tempIdx] || { id: `opp_${pos}`, name: `Opponent ${pos}` };
      tempIdx++;
      teamName = opponent.name;
      teamId = opponent.id;
    }

    const maxDrawn = Math.floor(played * 0.25);
    const drawn = Math.min(maxDrawn, resolveRandomInt(3, 7));
    const won = Math.max(0, Math.floor((currentPoints - drawn) / 3));
    const lost = Math.max(0, played - won - drawn);
    const points = won * 3 + (played - won - lost);

    finalTable.push({
      clubId: teamId,
      name: teamName,
      played,
      won,
      drawn: played - won - lost,
      lost,
      points,
    });

    currentPoints = Math.max(0, Math.round(currentPoints - (step + resolveRandomFloat(0, 2))));
  }

  return finalTable;
}
