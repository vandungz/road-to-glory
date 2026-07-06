import { z } from "zod/v4";

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

export interface SeasonRecord {
  age: number;
  clubName: string;
  leagueName: string;
  standing: number | null;
  domesticCup: string | null;
  continentalCup: { type: string; result: string } | null;
  nationalTeam: { type: string; callup: string; result: string | null } | null;
  leagueTable?: any[];
  domesticCupJourney?: string[];
  continentalCupJourney?: string[];
  nationalTeamJourney?: string[];
  apps?: number;
  goals?: number;
  assists?: number;
  matchRating?: number;
  cleanSheets?: number;
}

export const STEP_LABELS = [
  "Quốc Tịch",
  "Tuổi Ra Mắt",
  "Pace (PAC)",
  "Shooting (SHO)",
  "Passing (PAS)",
  "Dribbling (DRI)",
  "Defending (DEF)",
  "Physical (PHY)",
  "Thời Gian Thi Đấu",
  "Giải Đấu",
  "Câu Lạc Bộ",
];
