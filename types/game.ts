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
