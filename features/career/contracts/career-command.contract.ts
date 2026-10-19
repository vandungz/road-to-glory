import { z } from "zod";

export const purchaseShopItemCommandSchema = z.object({
  playerId: z.string().uuid(),
  itemId: z.string().min(1).max(80),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  /** Optional intent; the server still derives and verifies the allowed season. */
  targetSeason: z.number().int().min(15).max(70).optional(),
}).strict();

export const purchaseAllShopItemsCommandSchema = z.object({
  playerId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
  targetSeason: z.number().int().min(15).max(70).optional(),
}).strict();

export type PurchaseShopItemCommand = z.infer<typeof purchaseShopItemCommandSchema>;
export type PurchaseAllShopItemsCommand = z.infer<typeof purchaseAllShopItemsCommandSchema>;

export interface ShopPurchaseCommandDto {
  commandId: string;
  revision: number;
  walletBalance: number;
  shopInventory: unknown[];
  itemId: string;
  appliedSeason: number;
  replayed: boolean;
}

export interface ShopPurchaseAllCommandDto {
  commandId: string;
  revision: number;
  walletBalance: number;
  shopInventory: unknown[];
  itemIds: string[];
  appliedSeason: number;
  replayed: boolean;
}
