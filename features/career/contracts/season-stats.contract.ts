import { z } from "zod";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

export const commitSeasonStatsCommandSchema = z.object({
  playerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
}).strict();

export type CommitSeasonStatsCommand = z.infer<typeof commitSeasonStatsCommandSchema>;

export interface SeasonStatsCommitDto {
  commandId: string;
  seasonId: string;
  revision: number;
  nextStep: string;
  seasonStats: SimulatedSeasonResult;
  replayed: boolean;
}
