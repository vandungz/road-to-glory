"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { PageGuide } from "@/features/onboarding/GuideProvider";
import { CoachMark } from "@/features/onboarding/CoachMark";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatEuroThousands } from "@/lib/transfer-economy";
import {
  EXTRA_APPEARANCES_BONUS,
  NATIONAL_CALLUP_WEIGHT_BONUS,
  TRAINING_CAMP_RATING_BONUS,
  TRAINING_CAMP_STAT_BONUS,
  isShopItemAvailableForSeason,
  SHOP_CATALOG,
  type ShopCatalogItem,
  type ShopInventoryEntry,
} from "@/lib/shop-catalog";

interface ShopModalProps {
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
  isProcessing: boolean;
  targetSeason: number | null;
  onPurchase: (itemId: string) => Promise<void>;
  onPurchaseAll: () => Promise<void>;
  onContinue: () => void;
  embedded?: boolean;
  onClose?: () => void;
  standalone?: boolean;
}

function getItemStatus(item: ShopCatalogItem, balance: number, season: number | null, purchased: boolean) {
  if (season === null || !isShopItemAvailableForSeason(item, season)) return "locked";
  if (purchased) return "active";
  return balance < item.priceThousands ? "insufficient" : "available";
}

function ShopItemRow({
  item,
  walletBalance,
  shopInventory,
  targetSeason,
  isProcessing,
  purchasingId,
  error,
  onBuy,
}: {
  item: ShopCatalogItem;
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
  targetSeason: number | null;
  isProcessing: boolean;
  purchasingId: string | null;
  error?: string;
  onBuy: (item: ShopCatalogItem) => void;
}) {
  const ui = useTranslations("ui");
  const t = useTranslations("shop");
  const alreadyBought = targetSeason !== null && shopInventory.some(
    (entry) => entry.itemId === item.id && entry.appliedSeason === targetSeason,
  );
  const status = getItemStatus(item, walletBalance, targetSeason, alreadyBought);
  const canBuy = status === "available" && !isProcessing && purchasingId === null;
  const isPurchasing = purchasingId === item.id;

  return (
    <div className={`football-shop-item football-shop-item--${status}`}>
      <div className="football-shop-item__copy">
        <div className="football-shop-item__title">
          <span>{t(item.id)}</span>
          {status === "active" && <small>{ui("active")}</small>}
          {status === "locked" && <small>{ui("unavailable")}</small>}
        </div>
        <p>{t(item.id + "_detail", {
          rating: TRAINING_CAMP_RATING_BONUS,
          stats: TRAINING_CAMP_STAT_BONUS,
          apps: EXTRA_APPEARANCES_BONUS,
          chance: NATIONAL_CALLUP_WEIGHT_BONUS,
        })}</p>
        {error && <span className="football-shop-item__error" role="alert">{error}</span>}
      </div>

      <div className="football-shop-item__action">
        <span className="football-shop-item__price">{formatEuroThousands(item.priceThousands)}</span>
        {status === "available" ? (
          <Button
            size="sm"
            onClick={() => onBuy(item)}
            disabled={!canBuy}
            loading={isPurchasing}
          >
            {t("buy")}
          </Button>
        ) : (
          <span className="football-shop-item__status">{status === "insufficient" ? t("insufficient", { amount: formatEuroThousands(item.priceThousands - walletBalance) }) : t(status === "active" ? "bought" : "locked")}</span>
        )}
      </div>
    </div>
  );
}

export function ShopModal({
  walletBalance,
  shopInventory,
  isProcessing,
  targetSeason,
  onPurchase,
  onPurchaseAll,
  onContinue,
  embedded = false,
  onClose,
  standalone = false,
}: ShopModalProps) {
  const ui = useTranslations("ui");
  const t = useTranslations("shop");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorByItem, setErrorByItem] = useState<Record<string, string>>({});
  const [purchaseAllError, setPurchaseAllError] = useState<string | null>(null);
  const canPurchase = targetSeason !== null;

  const availableItems = targetSeason === null
    ? []
    : SHOP_CATALOG.filter((item) =>
        isShopItemAvailableForSeason(item, targetSeason) &&
        !shopInventory.some((entry) => entry.itemId === item.id && entry.appliedSeason === targetSeason),
      );
  const totalAvailablePrice = availableItems.reduce((sum, item) => sum + item.priceThousands, 0);
  const canPurchaseAll = availableItems.length > 0 && walletBalance >= totalAvailablePrice;

  async function handleBuy(item: ShopCatalogItem) {
    if (isProcessing || purchasingId) return;
    setPurchasingId(item.id);
    setErrorByItem((previous) => ({ ...previous, [item.id]: "" }));
    try {
      await onPurchase(item.id);
    } catch {
      setErrorByItem((previous) => ({
        ...previous,
        [item.id]: t("purchaseError"),
      }));
    } finally {
      setPurchasingId(null);
    }
  }

  async function handleBuyAll() {
    if (!canPurchaseAll || isProcessing || purchasingId) return;
    setPurchaseAllError(null);
    setPurchasingId("__all__");
    try {
      await onPurchaseAll();
    } catch {
      setPurchaseAllError(t("bulkError"));
    } finally {
      setPurchasingId(null);
    }
  }

  const content = (
    <div className={`football-shop-content${standalone ? " football-shop-content--standalone" : ""}`}>
      {standalone && <PageGuide id="shop" paused={isProcessing || purchasingId !== null} />}
      <header className="football-shop-content__header">
        <div className="football-shop-content__heading">
          <h3>{ui("shop")} <CoachMark target="shop-items" /></h3>
        </div>
        <div className="football-shop-content__balance" data-guide="shop-balance">
          <span>{formatEuroThousands(walletBalance)}</span>
          <small>{ui("walletBalance")}</small>
        </div>
        {!embedded && onClose && (
          <button type="button" className="football-icon-button football-shop-content__close" onClick={onClose} aria-label={ui("close")}>
            <X aria-hidden="true" size={19} strokeWidth={1.6} />
          </button>
        )}
      </header>

      <ScrollArea className="football-shop-content__body">
        <p className="football-shop-content__intro">
          {canPurchase
            ? t("appliesTo", { age: targetSeason })
            : ui("theShopOpensAtTheStartAndEndOfTheSeasonBeforeTheNextSpin")}
        </p>
        <div className="football-shop-content__items" data-guide="shop-items">
          {SHOP_CATALOG.map((item) => (
            <ShopItemRow
              key={item.id}
              item={item}
              walletBalance={walletBalance}
              shopInventory={shopInventory}
              targetSeason={targetSeason}
              isProcessing={isProcessing}
              purchasingId={purchasingId}
              error={errorByItem[item.id]}
              onBuy={handleBuy}
            />
          ))}
        </div>
      </ScrollArea>

      <footer className="football-shop-content__footer" data-guide="shop-continue">
        <span>{ui("eachItemCanBeBoughtOncePerSeason")}</span>
        <div className="football-shop-content__footer-actions">
          {canPurchaseAll && <Button size="lg" variant="outline" onClick={() => void handleBuyAll()} disabled={isProcessing || purchasingId !== null} loading={purchasingId === "__all__"}>{ui("buyAll")} {formatEuroThousands(totalAvailablePrice)}</Button>}
          <Button size="lg" onClick={onContinue} disabled={!canPurchase || isProcessing || purchasingId !== null}>
            {canPurchase ? ui("startSeasonAtAge", { v0: String(targetSeason) }) : ui("notReady")}
          </Button>
        </div>
      </footer>
      {purchaseAllError && <p className="football-shop-content__purchase-all-error" role="alert">{purchaseAllError}</p>}
    </div>
  );

  if (embedded) return content;
  return (
    <Modal open title={ui("shop")} onClose={() => onClose?.()} size="lg" className="football-shop-modal">
      {content}
    </Modal>
  );
}
