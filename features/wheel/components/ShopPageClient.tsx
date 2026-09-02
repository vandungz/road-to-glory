"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseShopItemAction } from "@/actions/season.actions";
import type { ShopInventoryEntry } from "@/lib/shop-catalog";
import { ShopModal } from "./ShopModal";

interface ShopPageClientProps {
  playerId: string;
  currentAge: number;
  targetSeason: number;
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
  returnHref: string;
}

export function ShopPageClient({
  playerId,
  currentAge,
  targetSeason,
  walletBalance: initialWalletBalance,
  shopInventory: initialShopInventory,
  returnHref,
}: ShopPageClientProps) {
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [shopInventory, setShopInventory] = useState(initialShopInventory);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handlePurchase(itemId: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await purchaseShopItemAction({
        playerId,
        itemId,
        currentAge,
        targetSeason,
      });
      setWalletBalance(result.walletBalance);
      setShopInventory(result.shopInventory);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="rtg-shop-page">
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
