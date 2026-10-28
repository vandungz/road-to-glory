import type { Formation } from "./game";

export const PVE_LINEUP_SIZE = 11;

export const PVE_ROUNDS = [
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
] as const;

export type PveRound = (typeof PVE_ROUNDS)[number];
export type PveStatus = PveRound | "champion" | "eliminated";

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
  name: string;
  nationality: string;
  position: string;
  eraStart: number;
  eraEnd: number;
  overall: number;
  stats: PvePlayerStats;
}

export interface PveOpponentPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  overall: number;
  eraLabel: string;
}

export interface PveOpponentTeam {
  id: string;
  name: string;
  formation: Formation;
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
  passChance: number;
  opponents: string[];
  summary: string;
}

export interface PveTournamentState {
  version: 1;
  formation: Formation;
  status: PveStatus;
  group: PveGroupStage;
  rounds: PveRoundRecord[];
}

export interface PveSessionCard {
  gameId: string;
  name: string;
  formation: Formation;
  squadRating: number | null;
  playerCount: number;
  tournamentStatus: PveStatus | null;
}
