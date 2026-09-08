import { z } from "zod";

/**
 * Explicitly acknowledges the off-season shop gate. `completed` means the
 * player finished reviewing/purchasing; `skipped` is an intentional choice.
 * The server never infers this from navigation or a client route.
 */
export const advanceCareerSeasonCommandSchema = z.object({
  playerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  shopDecision: z.enum(["completed", "skipped"]),
}).strict();

export type AdvanceCareerSeasonCommand = z.infer<
  typeof advanceCareerSeasonCommandSchema
>;

export interface CareerSeasonAdvanceDto {
  commandId: string;
  completedSeasonId: string;
  completedAge: number;
  revision: number;
  nextAge: number | null;
  nextStep: string;
  isRetired: boolean;
  shopDecision: AdvanceCareerSeasonCommand["shopDecision"];
  /** Authoritative next-season projection returned with the transition. */
  currentContinentalCup?: string;
  contractYearsRemaining?: number;
  walletBalance?: number;
  /** Final-career projection returned so the current tab can render the same
   * authoritative record that was committed by the season transaction. */
  peakOvr?: number;
  careerTotalStats?: { apps: number; goals: number; assists: number };
  statsTimeline?: unknown[];
  clubStints?: unknown[];
  replayed: boolean;
}
