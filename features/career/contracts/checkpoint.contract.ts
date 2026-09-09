import { z } from "zod";

const jsonChoiceSchema = z.union([
  z.string().max(100),
  z.number().int(),
  z.boolean(),
]);

/** Client intent for one resolved wheel. Outcome and weights are never accepted. */
export const resolveWheelCommandSchema = z.object({
  playerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  stepKey: z.string().min(1).max(80),
  wheelType: z.string().min(1).max(40),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  choice: jsonChoiceSchema.optional(),
}).strict();

export type ResolveWheelCommand = z.infer<typeof resolveWheelCommandSchema>;

export interface WheelCheckpointDto {
  checkpointId: string;
  revision: number;
  currentAge: number | null;
  currentStep: string | null;
  currentWheel: string | null;
  /** Ticket assigned to this exact season, not the player's next-season projection. */
  seasonContinentalCup: string;
  outcome: unknown;
  publicResult: unknown;
  currentOvr: number;
  currentStats: Record<string, number>;
  replayed: boolean;
}
