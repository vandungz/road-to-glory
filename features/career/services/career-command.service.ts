import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isShopItemAvailableForSeason,
  SHOP_CATALOG,
  type ShopInventoryEntry,
} from "@/lib/shop-catalog";
import {
  appendMissingSeasonIncomeEntries,
  type WalletLedgerEntry,
} from "@/lib/wallet";
import type {
  PurchaseShopItemCommand,
  ShopPurchaseCommandDto,
} from "@/features/career/contracts/career-command.contract";

export type CareerCommandErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS"
  | "INVALID_ITEM"
  | "INSUFFICIENT_FUNDS";

export class CareerCommandError extends Error {
  constructor(public readonly code: CareerCommandErrorCode, message: string) {
    super(message);
    this.name = "CareerCommandError";
  }
}

type PublicShopResult = {
  commandId: string;
  revision: number;
  walletBalance: number;
  shopInventory: unknown[];
  itemId: string;
  appliedSeason: number;
};

const playerPurchaseSelect = {
  id: true,
  revision: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  currentWageAnnual: true,
  isUnemployed: true,
  clubStints: true,
  walletBalance: true,
  walletLedger: true,
  shopInventory: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

function asInventory(value: unknown): ShopInventoryEntry[] {
  return Array.isArray(value) ? value as ShopInventoryEntry[] : [];
}

function asLedger(value: unknown): WalletLedgerEntry[] {
  return Array.isArray(value) ? value as WalletLedgerEntry[] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function expectedShopSeason(currentAge: number, currentStep: string): number | null {
  if (currentStep === "idle") return currentAge;
  if (currentStep === "transfer" || currentStep === "resolved") return currentAge + 1;
  return null;
}

function parseReplayResult(value: unknown): ShopPurchaseCommandDto {
  const result = value as PublicShopResult;
  if (!result || typeof result !== "object" ||
      typeof result.commandId !== "string" ||
      typeof result.revision !== "number" ||
      typeof result.walletBalance !== "number" ||
      !Array.isArray(result.shopInventory) ||
      typeof result.itemId !== "string" ||
      typeof result.appliedSeason !== "number") {
    throw new CareerCommandError("COMMAND_EXISTS", "Idempotency record không hợp lệ");
  }
  return { ...result, replayed: true };
}

/** Server-authoritative Shop purchase command; legacy UI is not wired to it yet. */
export async function purchaseShopItemCommand(params: {
  input: PurchaseShopItemCommand;
  userId: string;
}): Promise<ShopPurchaseCommandDto> {
  const { input, userId } = params;
  const item = SHOP_CATALOG.find((entry) => entry.id === input.itemId);
  if (!item) throw new CareerCommandError("INVALID_ITEM", "Vật phẩm không tồn tại");

  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: input.playerId },
      select: playerPurchaseSelect,
    });
    if (!player || player.gameSession.userId !== userId) {
      throw new CareerCommandError("FORBIDDEN", "Career không thuộc user hiện tại");
    }

    const replay = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: player.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { commandType: true, input: true, result: true },
    });
    if (replay) {
      const replayInput = replay.input as { itemId?: string; appliedSeason?: number } | null;
      if (replay.commandType !== "shop_purchase" ||
          replayInput?.itemId !== input.itemId ||
          (input.targetSeason !== undefined && replayInput.appliedSeason !== input.targetSeason)) {
        throw new CareerCommandError("COMMAND_EXISTS", "Idempotency key đã được dùng cho command khác");
      }
      return parseReplayResult(replay.result);
    }

    if (player.checkpointVersion < 2 || player.currentAge === null || player.currentStep === null) {
      throw new CareerCommandError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }

    const appliedSeason = expectedShopSeason(player.currentAge, player.currentStep);
    if (appliedSeason === null ||
        (input.targetSeason !== undefined && input.targetSeason !== appliedSeason)) {
      throw new CareerCommandError("INVALID_TRANSITION", "Cửa hàng không mở ở bước hiện tại");
    }
    if (!isShopItemAvailableForSeason(item, appliedSeason)) {
      throw new CareerCommandError("INVALID_ITEM", "Vật phẩm chưa mở bán ở mùa này");
    }

    // The purchase command is also a recovery boundary for an older tab that
    // reached the Shop before the season-income command completed. Credit the
    // target season first, then spend from the resulting server balance.
    const lastStint = asRecord(
      Array.isArray(player.clubStints) ? player.clubStints.at(-1) : null,
    );
    const wallet = appendMissingSeasonIncomeEntries({
      age: appliedSeason,
      currentWageAnnual: player.isUnemployed ? 0 : player.currentWageAnnual,
      transferFeeThisSeason: lastStint.startAge === appliedSeason && typeof lastStint.feePaid === "number"
        ? lastStint.feePaid
        : 0,
      ledger: asLedger(player.walletLedger),
    });

    const inventory = asInventory(player.shopInventory);
    if (inventory.some((entry) => entry.itemId === item.id && entry.appliedSeason === appliedSeason)) {
      throw new CareerCommandError("COMMAND_EXISTS", "Vật phẩm đã được mua cho mùa này");
    }
    const availableBalance = player.walletBalance + wallet.creditedIncome;
    if (availableBalance < item.priceThousands) {
      throw new CareerCommandError("INSUFFICIENT_FUNDS", "Không đủ số dư");
    }

    const reserved = await tx.careerPlayer.updateMany({
      where: { id: player.id, revision: input.expectedRevision },
      data: { revision: { increment: 1 } },
    });
    if (reserved.count !== 1) {
      throw new CareerCommandError("STALE_REVISION", "Career đã có thay đổi mới hơn");
    }

    const nextInventory = [
      ...inventory,
      {
        itemId: item.id,
        purchasedAtAge: player.currentAge,
        appliedSeason,
        consumed: false,
      },
    ] satisfies ShopInventoryEntry[];
    const nextLedger: WalletLedgerEntry[] = [
      ...wallet.ledger,
      {
        age: player.currentAge,
        type: "shop_purchase",
        amount: -item.priceThousands,
        label: `Mua: ${item.name}`,
      },
    ];

    const updated = await tx.careerPlayer.updateMany({
      where: { id: player.id, revision: input.expectedRevision + 1 },
      data: {
        walletBalance: { increment: wallet.creditedIncome - item.priceThousands },
        walletLedger: nextLedger as unknown as Prisma.InputJsonValue,
        shopInventory: nextInventory as unknown as Prisma.InputJsonValue,
      },
    });
    if (updated.count !== 1) {
      throw new CareerCommandError("STALE_REVISION", "Không thể commit giao dịch Shop");
    }

    const commandId = randomUUID();
    const result: PublicShopResult = {
      commandId,
      revision: input.expectedRevision + 1,
      walletBalance: availableBalance - item.priceThousands,
      shopInventory: nextInventory,
      itemId: item.id,
      appliedSeason,
    };
    const command = await tx.careerCommand.create({
      data: {
        id: commandId,
        careerPlayerId: player.id,
        commandType: "shop_purchase",
        idempotencyKey: input.idempotencyKey,
        input: { itemId: item.id, appliedSeason } as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        revisionBefore: input.expectedRevision,
        revisionAfter: input.expectedRevision + 1,
      },
    });

    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        type: "shop_item_purchased",
        label: `Đã mua ${item.name}`,
        payload: {
          commandId: command.id,
          itemId: item.id,
          appliedSeason,
          revisionBefore: input.expectedRevision,
          revisionAfter: input.expectedRevision + 1,
        },
      },
    });

    return { ...result, replayed: false };
  });
}
