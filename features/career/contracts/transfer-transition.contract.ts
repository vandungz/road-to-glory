import { z } from "zod";

export const completeTransferCommandSchema = z.object({
  playerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  kind: z.enum(["stay", "transfer", "free_agent", "renewal"]),
  clubId: z.string().min(1).max(80).nullable().optional(),
  wageOption: z.enum(["lower", "standard", "higher"]).default("standard"),
}).strict();

export type CompleteTransferCommand = z.infer<typeof completeTransferCommandSchema>;

export interface TransferCompletionDto {
  commandId: string;
  revision: number;
  currentAge: number;
  nextStep: "resolved";
  kind: CompleteTransferCommand["kind"];
  clubId: string | null;
  clubName: string;
  leagueName: string;
  fee: number;
  contractYears: number;
  wageAnnual: number;
  walletBalance: number;
  nextAge: number;
  replayed: boolean;
}
