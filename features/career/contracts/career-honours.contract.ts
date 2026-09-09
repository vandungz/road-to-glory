import { z } from "zod";

export const getCareerHonoursSchema = z.object({
  playerId: z.string().uuid(),
  seasonId: z.string().uuid().optional(),
  awardKey: z.string().max(80).optional(),
}).strict();

export type GetCareerHonoursInput = z.infer<typeof getCareerHonoursSchema>;

export interface CareerHonourView {
  id: string;
  seasonId: string;
  age: number;
  seasonLabel: string | null;
  category: string;
  awardKey: string;
  scope: string;
  scopeKey: string | null;
  slotKey: string | null;
  rank: number | null;
  result: string;
  label: string;
  clubName: string | null;
  metrics: Record<string, unknown>;
  source: string;
}

export interface AwardRankingView {
  id: string;
  seasonId: string;
  age: number;
  seasonLabel: string | null;
  snapshotKey: string;
  awardKey: string;
  scope: string;
  scopeKey: string | null;
  modelVersion: string;
  status: string;
  entries: Array<Record<string, unknown>>;
  resolution: Record<string, unknown> | null;
  revealStage?: string;
  formation?: string;
}

export interface CareerHonoursView {
  honours: CareerHonourView[];
  rankings: AwardRankingView[];
  legacyFallback: boolean;
}
