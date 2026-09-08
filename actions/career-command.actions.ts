"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  purchaseShopItemCommandSchema,
  type ShopPurchaseCommandDto,
} from "@/features/career/contracts/career-command.contract";
import { purchaseShopItemCommand } from "@/features/career/services/career-command.service";
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
