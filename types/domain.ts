import type { SeasonRecord } from "./game";

export interface ClubSummary {
  id: string;
  name: string;
  leagueId: string;
  leagueName?: string;
  leagueTier?: number;
  prestige: number;
  continentalType: string;
  league?: { tier?: number };
}

export interface CurrentClub extends ClubSummary {
  leagueName: string;
}

export interface LeagueSummary {
  id: string;
  name: string;
  country?: string;
  tier?: number;
}

export interface StatSnapshot {
  age: number;
  ovr: number;
  /** Season checkpoint valuation, derived from all six position-weighted stats. */
  marketValue?: number;
  positionWeightedRating?: number;
  effectivePositionOvr?: number;
  apps?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  matchRating?: number;
  [stat: string]: number | undefined;
}

export interface ClubStint {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  startAge: number;
  endAge: number;
  yearsAtClub: number;
  ovrAtJoining: number;
  ovrAtLeaving: number;
  wageAtJoining?: number;
  feePaid?: number;
}

export interface TrophyRecord {
  type: "league" | "continental" | "cup" | "international";
  name: string;
  club: string;
  age: number;
}

export interface SeasonAwardRecord {
  type: string;
  label: string;
  age: number;
}

export interface AchievementRecord {
  ballonDor: number;
  ballonDorNominations?: number;
  trophies: TrophyRecord[];
  seasonAwards: SeasonAwardRecord[];
}

export interface HiddenStats {
  luckRating: number;
  professionalism: number;
  personality: string;
}

export type SeasonHistory = Record<number, SeasonRecord>;

export type CareerSubStep =
  | "idle" | "standing" | "domestic_cup" | "continental_cup"
  | "national_callup" | "national_tournament" | "season_stats"
  | "ballon_dor_nomination" | "ballon_dor_ranking"
  | "dir_increase" | "dir_decrease" | "count" | "selector" | "magnitude"
  | "transfer" | "resolved";
