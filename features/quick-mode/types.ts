export const QUICK_POSITIONS = [
  "GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "LM", "RM", "ST",
] as const;

export type QuickPosition = (typeof QUICK_POSITIONS)[number];
export type QuickPhase = "setup" | "career" | "finale" | "complete";
export type QuickStatKey = "pac" | "sho" | "dri" | "pas" | "str" | "def" | "iq" | "div" | "han" | "kic" | "ref" | "spd" | "pos";
export type QuickCountValue = number | "1000+";
export type QuickConfederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF";
export type QuickInternationalCupType = "Champions League" | "Europa League" | "Conference League" | "Libertadores" | "Sudamericana" | "CONCACAF Champions Cup" | "AFC Champions League" | "CAF Champions League";

export interface QuickLeagueOption {
  id: string;
  name: string;
  country: string;
  tier: number;
  prestige: number;
  domesticCupName: string;
  confederation: QuickConfederation;
}

export interface QuickClubOption {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
  leagueTier: number;
  prestige: number;
  continentalType: string;
}

export type QuickStats = Partial<Record<QuickStatKey, number>>;

export interface QuickTraitResult {
  id: string;
  name: string;
  description: string;
  modifiers: Partial<Record<QuickStatKey, number>>;
}

export interface QuickPlayer {
  name: string;
  nationality: string;
  position: QuickPosition;
  debutAge: number | null;
  careerLength: number | null;
  stats: QuickStats;
  trait: QuickTraitResult | null;
  clubCount: number | null;
}

export interface QuickImprovement {
  stat: QuickStatKey;
  delta: number;
}

export interface QuickClubJourney {
  clubIndex: number;
  leagueId: string;
  leagueName: string;
  clubId: string;
  clubName: string;
  prestige: number;
  seasons: number;
  leagueTitles: number;
  domesticCups: number;
  internationalCups: number;
  internationalCupTypes: QuickInternationalCupType[];
  improvements: QuickImprovement[];
}

export interface QuickClubDraft {
  leagueId: string | null;
  leagueName: string | null;
  clubId: string | null;
  clubName: string | null;
  prestige: number | null;
  seasons: number | null;
  leagueTitles: number | null;
  domesticCups: number | null;
  internationalCups: number | null;
  internationalCupTypes: QuickInternationalCupType[];
  improvements: QuickImprovement[];
  improvementCount: number | null;
  improvementTarget: QuickStatKey | null;
}

export interface QuickFinale {
  goals: QuickCountValue | null;
  assists: QuickCountValue | null;
  ballonDorWins: number | null;
  otherAwardCount: number | null;
  otherAwardTypes: string[];
}

export interface QuickModeState {
  version: 5;
  phase: QuickPhase;
  setupStep: number;
  careerClubIndex: number;
  careerStep: number;
  finaleStep: number;
  player: QuickPlayer;
  clubDraft: QuickClubDraft;
  clubs: QuickClubJourney[];
  finale: QuickFinale;
  lastResult: string | null;
}
