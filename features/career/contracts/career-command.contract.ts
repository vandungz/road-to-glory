import { z } from "zod";

export const purchaseShopItemCommandSchema = z.object({
  playerId: z.string().uuid(),
  itemId: z.string().min(1).max(80),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  /** Optional intent; the server still derives and verifies the allowed season. */
  targetSeason: z.number().int().min(15).max(70).optional(),
}).strict();

export type PurchaseShopItemCommand = z.infer<typeof purchaseShopItemCommandSchema>;

export interface ShopPurchaseCommandDto {
  commandId: string;
  revision: number;
  walletBalance: number;
  shopInventory: unknown[];
  itemId: string;
  appliedSeason: number;
  replayed: boolean;
}
