import { z } from "zod";

const transferContextSchema = {
  playerId: z.string().uuid(),
  seasonId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
};

export const getTransferMarketSchema = z.object({
  ...transferContextSchema,
  willingToMove: z.boolean().default(true),
}).strict();

export const searchTransferClubsSchema = z.object({
  ...transferContextSchema,
  query: z.string().max(80).optional(),
  leagueId: z.string().max(80).optional(),
  prestigeMin: z.number().int().min(1).max(5).optional(),
  prestigeMax: z.number().int().min(1).max(5).optional(),
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(24).default(8),
}).strict();

export const setTransferOfferSelectionSchema = z.object({
  ...transferContextSchema,
  clubId: z.string().min(1).max(80).nullable(),
}).strict();

export const resolveTransferNegotiationSchema = z.object({
  ...transferContextSchema,
  kind: z.enum(["approach", "renewal"]),
  clubId: z.string().min(1).max(80).nullable().optional(),
  feeOption: z.enum(["discount", "standard", "premium"]).default("standard"),
  wageOption: z.enum(["lower", "standard", "higher"]).default("standard"),
}).strict();

export type GetTransferMarketInput = z.infer<typeof getTransferMarketSchema>;
export type SearchTransferClubsInput = z.infer<typeof searchTransferClubsSchema>;
export type SetTransferOfferSelectionInput = z.infer<typeof setTransferOfferSelectionSchema>;
export type ResolveTransferNegotiationInput = z.infer<typeof resolveTransferNegotiationSchema>;
