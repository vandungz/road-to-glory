import { z } from "zod/v4";
import type { AchievementRecord } from "./domain";

// ============================================================
// FORMATION
// ============================================================

export const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2"] as const;
export type Formation = (typeof FORMATIONS)[number];

// ============================================================
// GAME SESSION
// ============================================================

/**
 * Safe summary of a GameSession for passing from Server → Client.
 * Never includes hiddenStats or sensitive user data.
 */
export interface GameSessionSummary {
  id: string;
  name: string;
  formation: Formation;
  createdAt: Date;
  squadRating: number | null;
  status: "in_progress" | "completed";
  playerCount: number;
}

// ============================================================
// CREATE GAME INPUT — Zod Schema + Inferred Type
// ============================================================

export const createGameSchema = z.object({
  name: z
    .string()
    .min(1, "Tên squad không được để trống")
    .max(50, "Tên squad tối đa 50 ký tự")
    .trim(),
  formation: z.enum(FORMATIONS as unknown as [Formation, ...Formation[]]),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

// ============================================================
// SERVER ACTION RESPONSE
// ============================================================

export type CreateGameResult =
  | { success: true; gameId: string }
  | { success: false; error: string };

export interface CompetitionStats {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
}

export interface LeagueTableRow {
  clubId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
}

export interface SeasonRecord {
  age: number;
  clubName: string;
  leagueName: string;
  leagueId?: string;
  /** End-of-season OVR persisted for the career archive. */
  ovr?: number;
  standing: number | null;
  domesticCup: string | null;
  continentalCup: { type: string; result: string } | null;
  nationalTeam: { type: string; callup: string; result: string | null } | null;
  leagueTable?: LeagueTableRow[];
  domesticCupJourney?: string[];
  continentalCupJourney?: string[];
  nationalTeamJourney?: string[];
  // Tổng mùa
  apps?: number;
  goals?: number;
  assists?: number;
  matchRating?: number;
  cleanSheets?: number;
  // Per-competition — từ server
  leagueStats?: CompetitionStats;
  domesticCupStats?: CompetitionStats;
  continentalStats?: CompetitionStats;
  nationalStats?: CompetitionStats;
  ballonDorResult?: number | null;
  achievements?: AchievementRecord;
  honours?: Array<{
    awardKey: string;
    label: string;
    rank: number | null;
    slotKey?: string | null;
    result: string;
    metrics?: Record<string, unknown>;
  }>;
  awardModelVersion?: string | null;
}

const BASE_STEP_PREFIX = ["Quốc Tịch", "Tuổi Ra Mắt", "Chiều Cao", "Cân Nặng"];
const BASE_STEP_SUFFIX = ["Thời Gian Thi Đấu", "Giải Đấu", "Câu Lạc Bộ"];

export function getStepLabels(position: string): string[] {
  const statLabels = position === "GK"
    ? ["Diving (DIV)", "Handling (HAN)", "Kicking (KIC)", "Reflexes (REF)", "Speed (SPD)", "Positioning (POS)"]
    : ["Pace (PAC)", "Shooting (SHO)", "Passing (PAS)", "Dribbling (DRI)", "Defending (DEF)", "Physical (PHY)"];
  return [...BASE_STEP_PREFIX, ...statLabels, ...BASE_STEP_SUFFIX];
}

// Backward compat — field player labels
export const STEP_LABELS = getStepLabels("field");
