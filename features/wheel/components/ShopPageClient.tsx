"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseShopItemAction } from "@/actions/season.actions";
import { purchaseShopItemCommandAction } from "@/actions/career-command.actions";
import type { ShopInventoryEntry } from "@/lib/shop-catalog";
import { ShopModal } from "./ShopModal";

interface ShopPageClientProps {
  playerId: string;
  currentAge: number;
  targetSeason: number;
  revision: number;
  checkpointVersion: number;
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
  returnHref: string;
}

export function ShopPageClient({
  playerId,
  currentAge,
  targetSeason,
  revision: initialRevision,
  checkpointVersion,
  walletBalance: initialWalletBalance,
  shopInventory: initialShopInventory,
  returnHref,
}: ShopPageClientProps) {
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [shopInventory, setShopInventory] = useState(initialShopInventory);
  const [isProcessing, setIsProcessing] = useState(false);
  const [revision, setRevision] = useState(initialRevision);
  const pendingKeysRef = useRef(new Map<string, string>());

  async function handlePurchase(itemId: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const requestKey = playerId + ":" + itemId + ":" + targetSeason + ":" + revision;
      const idempotencyKey = pendingKeysRef.current.get(requestKey) ?? globalThis.crypto.randomUUID();
      pendingKeysRef.current.set(requestKey, idempotencyKey);
      const result = checkpointVersion >= 2
        ? await purchaseShopItemCommandAction({
            playerId,
            itemId,
            targetSeason,
            expectedRevision: revision,
            idempotencyKey,
          })
        : await purchaseShopItemAction({
            playerId,
            itemId,
            currentAge,
            targetSeason,
          });
      pendingKeysRef.current.delete(requestKey);
      setWalletBalance(result.walletBalance);
      setShopInventory(result.shopInventory as ShopInventoryEntry[]);
      if ("revision" in result) setRevision(result.revision);
      // The shop balance is local for immediate feedback, while the shell
      // header is rendered by the server. Revalidate the route so both
      // surfaces read the same persisted wallet balance after a purchase.
      router.refresh();
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="football-shop-page">
      <ShopModal
        walletBalance={walletBalance}
        shopInventory={shopInventory}
        isProcessing={isProcessing}
        targetSeason={targetSeason}
        onPurchase={handlePurchase}
        onContinue={() => router.push(returnHref)}
        embedded
        standalone
      />
    </div>
  );
}
