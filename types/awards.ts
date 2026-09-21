export const AWARD_MODEL_VERSION = "awards-v5";
export const AWARD_RESOLUTION_VERSION = "weighted-random-v5";
export const TOP_TEN_LIMIT = 10;

export type AwardCategory = "team_trophy" | "individual_award" | "ballon_dor";
export type AwardScope = "league" | "domestic_cup" | "continental" | "national_team" | "club" | "career" | "unknown";
export type AwardRevealStage = "season_recap" | "ballon_dor_result";

export type AwardKey =
  | "league_golden_boot"
  | "league_top_assist"
  | "league_golden_glove"
  | "league_best_xi"
  | "ballon_dor"
  | "league_title"
  | "domestic_cup_title"
  | "continental_title"
  | "national_team_title";

export interface AwardRankingEntry {
  candidateKey: string;
  rank: number;
  name: string;
  clubName: string;
  position: string;
  isCareerPlayer: boolean;
  slotKey?: string;
  metrics: Record<string, number | string | boolean | null>;
  score: number;
  weight: number;
  result: "winner" | "selected" | "nominee" | "ranked";
}

export interface AwardRankingSnapshotInput {
  snapshotKey: string;
  awardKey: AwardKey;
  category: AwardCategory;
  scope: AwardScope;
  scopeKey: string;
  age: number;
  seasonLabel: string;
  entries: AwardRankingEntry[];
  status: "generated" | "resolved";
  revealStage?: AwardRevealStage;
  formation?: string;
  resolution?: Record<string, unknown>;
}

export interface AwardHonourInput {
  awardInstanceKey: string;
  awardKey: AwardKey;
  category: AwardCategory;
  scope: AwardScope;
  scopeKey: string;
  slotKey?: string;
  rank?: number;
  result: "winner" | "selected" | "nominee";
  label: string;
  metrics: Record<string, number | string | boolean | null>;
  modelVersion: string;
  resolutionVersion: string;
  source: "season_simulation" | "ballon_dor_wheel" | "legacy_backfill";
}

export interface AwardSimulationResult {
  modelVersion: string;
  resolutionVersion: string;
  candidateUniverseSize: number;
  snapshots: AwardRankingSnapshotInput[];
  honours: AwardHonourInput[];
  ballonDor: {
    eligible: boolean;
    nominationWeight: number;
    rankWeights: number[];
    evaluation?: Record<string, unknown>;
    snapshotKey: string;
  };
}

export const AWARD_LABELS: Record<AwardKey, string> = {
  league_golden_boot: "Chiếc giày vàng",
  league_top_assist: "Vua kiến tạo",
  league_golden_glove: "Găng tay vàng",
  league_best_xi: "Đội hình tiêu biểu",
  ballon_dor: "Quả bóng vàng",
  league_title: "Vô địch giải quốc gia",
  domestic_cup_title: "Vô địch cúp quốc gia",
  continental_title: "Vô địch cúp châu lục",
  national_team_title: "Vô địch cùng đội tuyển quốc gia",
};

export function isDeprecatedAwardKey(key: string): boolean {
  return key === "league_best_defender" || key === "league_best_player";
}

export function awardLabel(key: AwardKey, metrics: Record<string, unknown> = {}): string {
  const value = Object.values(metrics).find((entry) => typeof entry === "number");
  return typeof value === "number" ? `${AWARD_LABELS[key]} · ${value}` : AWARD_LABELS[key];
}
