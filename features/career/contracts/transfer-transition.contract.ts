import { z } from "zod";
import type { WageDealOption } from "@/lib/salary-negotiation";

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

export type TransferNegotiationFailureCode =
  | "WAGE_NEGOTIATION_FAILED"
  | "WAGE_OPTION_UNAVAILABLE"
  | "TRANSFER_DEAL_CANCELLED";

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

export type TransferCommandResult =
  | {
      status: "accepted";
      transfer: TransferCompletionDto;
    }
  | {
      status: "rejected";
      code: "WAGE_NEGOTIATION_FAILED" | "WAGE_OPTION_UNAVAILABLE";
      message: string;
      failedWageOptions: WageDealOption[];
      cancelled: false;
    }
  | {
      status: "cancelled";
      code: "TRANSFER_DEAL_CANCELLED";
      message: string;
      failedWageOptions: WageDealOption[];
      cancelled: true;
    };
