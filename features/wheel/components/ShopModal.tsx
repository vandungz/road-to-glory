"use client";

import { useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatEuroThousands } from "@/lib/transfer-economy";
import {
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
  onContinue: () => void;
  embedded?: boolean;
  onClose?: () => void;
  standalone?: boolean;
}

type ShopItemStatus = {
  label: string;
  tone: "available" | "active" | "insufficient" | "locked";
};

function getItemStatus(
  item: ShopCatalogItem,
  walletBalance: number,
  targetSeason: number | null,
  alreadyBought: boolean,
): ShopItemStatus {
  if (targetSeason === null || !isShopItemAvailableForSeason(item, targetSeason)) {
    return { label: "Chưa mở bán", tone: "locked" };
  }
  if (alreadyBought) return { label: "Đã mua", tone: "active" };
  if (walletBalance < item.priceThousands) {
    return {
      label: `Thiếu ${formatEuroThousands(item.priceThousands - walletBalance)}`,
      tone: "insufficient",
    };
  }
  return { label: "Mua", tone: "available" };
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
  const alreadyBought = targetSeason !== null && shopInventory.some(
    (entry) => entry.itemId === item.id && entry.appliedSeason === targetSeason,
  );
  const status = getItemStatus(item, walletBalance, targetSeason, alreadyBought);
  const canBuy = status.tone === "available" && !isProcessing && purchasingId === null;
  const isPurchasing = purchasingId === item.id;

  return (
    <div className={`football-shop-item football-shop-item--${status.tone}`}>
      <div className="football-shop-item__copy">
        <div className="football-shop-item__title">
          <span>{item.name}</span>
          {status.tone === "active" && <small>Đang hoạt động</small>}
          {status.tone === "locked" && <small>Chưa mở bán</small>}
        </div>
        <p>{item.description}</p>
        {error && <span className="football-shop-item__error" role="alert">{error}</span>}
      </div>

      <div className="football-shop-item__action">
        <span className="football-shop-item__price">{formatEuroThousands(item.priceThousands)}</span>
        {status.tone === "available" ? (
          <Button
            size="sm"
            onClick={() => onBuy(item)}
            disabled={!canBuy}
            loading={isPurchasing}
          >
            {isPurchasing ? "Đang xử lý" : "Mua"}
          </Button>
        ) : (
          <span className="football-shop-item__status">{status.label}</span>
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
  onContinue,
  embedded = false,
  onClose,
  standalone = false,
}: ShopModalProps) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorByItem, setErrorByItem] = useState<Record<string, string>>({});
  const canPurchase = targetSeason !== null;

  async function handleBuy(item: ShopCatalogItem) {
    if (isProcessing || purchasingId) return;
    setPurchasingId(item.id);
    setErrorByItem((previous) => ({ ...previous, [item.id]: "" }));
    try {
      await onPurchase(item.id);
    } catch (err: unknown) {
      setErrorByItem((previous) => ({
        ...previous,
        [item.id]: err instanceof Error ? err.message : "Giao dịch thất bại",
      }));
    } finally {
      setPurchasingId(null);
    }
  }

  const content = (
    <div className={`football-shop-content${standalone ? " football-shop-content--standalone" : ""}`}>
      <header className="football-shop-content__header">
        <div className="football-shop-content__heading">
          <span className="football-eyebrow">
            {canPurchase ? `Áp dụng cho mùa tuổi ${targetSeason}` : "Cửa hàng theo mùa"}
          </span>
          <h3>{standalone ? "Cửa hàng" : "Cửa hàng đầu mùa"}</h3>
          {standalone && (
            <p className="football-shop-content__subtitle">
              Tiền lương và tiền chuyển nhượng đã vào ví. Mỗi vật phẩm mua một lần, và chỉ tác động cho đúng mùa giải đó.
            </p>
          )}
        </div>
        <div className="football-shop-content__balance">
          <span>{formatEuroThousands(walletBalance)}</span>
          <small>Số dư ví</small>
        </div>
        {!embedded && onClose && (
          <button type="button" className="football-icon-button football-shop-content__close" onClick={onClose} aria-label="Đóng">
            <X aria-hidden="true" size={19} strokeWidth={1.6} />
          </button>
        )}
      </header>

      <div className="football-shop-content__body">
        <div className={`football-shop-content__section-heading${standalone ? " football-shop-content__section-heading--hidden" : ""}`}>
          <ShoppingBag aria-hidden="true" size={20} strokeWidth={1.6} />
          <span>Cửa hàng</span>
        </div>
        <p className="football-shop-content__intro">
          {canPurchase
            ? <>Vật phẩm mua ở đây áp dụng cho <strong>Mùa giải Tuổi {targetSeason}</strong>.</>
            : "Mua sắm mở lại vào đầu hoặc cuối mùa giải, trước khi vòng quay bắt đầu."}
        </p>
        <div className="football-shop-content__items">
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
      </div>

      <footer className="football-shop-content__footer">
        <span>Mỗi vật phẩm mua một lần cho mỗi mùa.</span>
        <Button size="lg" onClick={onContinue} disabled={!canPurchase || isProcessing || purchasingId !== null}>
          {canPurchase ? `Vào mùa tuổi ${targetSeason} →` : "Chưa sẵn sàng"}
        </Button>
      </footer>
    </div>
  );

  if (embedded) return content;
  return (
    <Modal open title="Cửa hàng" onClose={() => onClose?.()} size="lg" className="football-shop-modal">
      {content}
    </Modal>
  );
}
