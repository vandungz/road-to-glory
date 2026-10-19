"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  purchaseShopItemCommandSchema,
  purchaseAllShopItemsCommandSchema,
  type ShopPurchaseCommandDto,
  type ShopPurchaseAllCommandDto,
} from "@/features/career/contracts/career-command.contract";
import { purchaseAllShopItemsCommand, purchaseShopItemCommand } from "@/features/career/services/career-command.service";
import { withCareerCommandLogging } from "@/lib/observability/career-command-log";

/** V2 Shop command. Kept separate so the current UI contract stays untouched. */
export async function purchaseShopItemCommandAction(input: unknown): Promise<ShopPurchaseCommandDto> {
  const parsed = purchaseShopItemCommandSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    { command: "shop.purchase", actorId: userId, careerId: parsed.playerId },
    () => purchaseShopItemCommand({ input: parsed, userId }),
  );
}

export async function purchaseAllShopItemsCommandAction(input: unknown): Promise<ShopPurchaseAllCommandDto> {
  const parsed = purchaseAllShopItemsCommandSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    { command: "shop.purchase_all", actorId: userId, careerId: parsed.playerId },
    () => purchaseAllShopItemsCommand({ input: parsed, userId }),
  );
}
