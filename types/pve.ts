import type { Formation } from "./game";
import type { SlotConfig } from "./squad";

export const PVE_LINEUP_SIZE = 11;

export const PVE_ROUNDS = [
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
] as const;

export type PveRound = (typeof PVE_ROUNDS)[number];
export type PveStatus = PveRound | "champion" | "eliminated";

export const PVE_FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "3-4-2-1", "3-4-1-2", "3-4-3"] as const;
export type PveFormation = (typeof PVE_FORMATIONS)[number];

export const PVE_FORMATION_SLOTS: Record<PveFormation, SlotConfig[]> = {
  "4-3-3": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "LB", x: 12, y: 71 }, { index: 2, position: "CB", x: 35, y: 71 }, { index: 3, position: "CB", x: 65, y: 71 }, { index: 4, position: "RB", x: 88, y: 71 },
    { index: 5, position: "CM", x: 22, y: 48 }, { index: 6, position: "CDM", x: 50, y: 55 }, { index: 7, position: "CM", x: 78, y: 48 }, { index: 8, position: "LW", x: 14, y: 19 }, { index: 9, position: "ST", x: 50, y: 14 }, { index: 10, position: "RW", x: 86, y: 19 },
  ],
  "4-4-2": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "LB", x: 12, y: 71 }, { index: 2, position: "CB", x: 35, y: 71 }, { index: 3, position: "CB", x: 65, y: 71 }, { index: 4, position: "RB", x: 88, y: 71 },
    { index: 5, position: "LM", x: 12, y: 50 }, { index: 6, position: "CM", x: 38, y: 50 }, { index: 7, position: "CM", x: 62, y: 50 }, { index: 8, position: "RM", x: 88, y: 50 }, { index: 9, position: "ST", x: 35, y: 17 }, { index: 10, position: "ST", x: 65, y: 17 },
  ],
  "3-5-2": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "CB", x: 22, y: 71 }, { index: 2, position: "CB", x: 50, y: 71 }, { index: 3, position: "CB", x: 78, y: 71 },
    { index: 4, position: "LM", x: 10, y: 50 }, { index: 5, position: "CM", x: 30, y: 50 }, { index: 6, position: "CM", x: 50, y: 50 }, { index: 7, position: "CM", x: 70, y: 50 }, { index: 8, position: "RM", x: 90, y: 50 }, { index: 9, position: "ST", x: 35, y: 17 }, { index: 10, position: "ST", x: 65, y: 17 },
  ],
  "4-2-3-1": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "LB", x: 12, y: 71 }, { index: 2, position: "CB", x: 35, y: 71 }, { index: 3, position: "CB", x: 65, y: 71 }, { index: 4, position: "RB", x: 88, y: 71 },
    { index: 5, position: "CDM", x: 37, y: 54 }, { index: 6, position: "CM", x: 63, y: 54 }, { index: 7, position: "LW", x: 18, y: 34 }, { index: 8, position: "CAM", x: 50, y: 34 }, { index: 9, position: "RW", x: 82, y: 34 }, { index: 10, position: "ST", x: 50, y: 14 },
  ],
  "3-4-2-1": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "CB", x: 22, y: 71 }, { index: 2, position: "CB", x: 50, y: 71 }, { index: 3, position: "CB", x: 78, y: 71 },
    { index: 4, position: "LM", x: 12, y: 50 }, { index: 5, position: "CM", x: 38, y: 50 }, { index: 6, position: "CM", x: 62, y: 50 }, { index: 7, position: "RM", x: 88, y: 50 }, { index: 8, position: "CAM", x: 35, y: 30 }, { index: 9, position: "CAM", x: 65, y: 30 }, { index: 10, position: "ST", x: 50, y: 14 },
  ],
  "3-4-1-2": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "CB", x: 22, y: 71 }, { index: 2, position: "CB", x: 50, y: 71 }, { index: 3, position: "CB", x: 78, y: 71 },
    { index: 4, position: "LM", x: 12, y: 50 }, { index: 5, position: "CM", x: 38, y: 50 }, { index: 6, position: "CM", x: 62, y: 50 }, { index: 7, position: "RM", x: 88, y: 50 }, { index: 8, position: "CAM", x: 50, y: 30 }, { index: 9, position: "ST", x: 35, y: 14 }, { index: 10, position: "ST", x: 65, y: 14 },
  ],
  "3-4-3": [
    { index: 0, position: "GK", x: 50, y: 87 }, { index: 1, position: "CB", x: 22, y: 71 }, { index: 2, position: "CB", x: 50, y: 71 }, { index: 3, position: "CB", x: 78, y: 71 },
    { index: 4, position: "LM", x: 12, y: 50 }, { index: 5, position: "CM", x: 38, y: 50 }, { index: 6, position: "CM", x: 62, y: 50 }, { index: 7, position: "RM", x: 88, y: 50 }, { index: 8, position: "LW", x: 18, y: 19 }, { index: 9, position: "ST", x: 50, y: 14 }, { index: 10, position: "RW", x: 82, y: 19 },
  ],
};

export interface PvePlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PveCatalogPlayer {
  id: string;
  clubId: string;
  clubName: string;
  name: string;
  nationality: string;
  position: string;
  eraStart: number;
  eraEnd: number;
  overall: number;
  stats: PvePlayerStats;
}

export interface PveUserLineupPlayer {
  slotIndex: number;
  name: string;
  position: string;
  overall?: number;
}

export interface PveClubInput {
  id: string;
  name: string;
  prestige: number;
  formation: PveFormation;
}

export interface PveOpponentPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  overall: number;
  stats: PvePlayerStats;
}

export interface PveOpponentTeam {
  id: string;
  clubId: string;
  name: string;
  formation: PveFormation;
  clubPrestige: number;
  squadOvr: number;
  players: PveOpponentPlayer[];
}

export interface PveMatchMoment {
  index: number;
  label: string;
  userFocus: string;
  opponentFocus: string;
  winner: "user" | "opponent";
  story: string;
}

export interface PveLeagueTableRow {
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  isUser: boolean;
}

export interface PveRoundRecord {
  round: PveRound;
  opponent: PveOpponentTeam;
  userScore: number;
  opponentScore: number;
  result: "win" | "loss";
  moments: PveMatchMoment[];
}

export interface PveGroupStage {
  passed: boolean;
  rank: number;
  table: PveLeagueTableRow[];
  summary: string;
}

export interface PveTournamentState {
  version: 1 | 2 | 3;
  formation: Formation;
  status: PveStatus;
  group: PveGroupStage;
  rounds: PveRoundRecord[];
  pendingOpponent?: PveOpponentTeam;
}

export interface PveSessionCard {
  gameId: string;
  name: string;
  formation: Formation;
  squadRating: number | null;
  playerCount: number;
  tournamentStatus: PveStatus | null;
}
