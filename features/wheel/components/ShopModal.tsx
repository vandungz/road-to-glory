"use client";

import React, { useState } from "react";
import { ShoppingBag, Info } from "lucide-react";
import { formatEuroThousands } from "@/lib/transfer-economy";
import { SHOP_CATALOG, type ShopCatalogItem, type ShopInventoryEntry } from "@/lib/shop-catalog";

interface ShopModalProps {
  walletBalance: number;
  shopInventory: ShopInventoryEntry[];
  currentAge: number;
  isProcessing: boolean;
  /**
   * The season a purchase right now would apply to, or `null` if shopping isn't valid
   * at this exact moment (mid-spin, wheels for the target season already started).
   * There are two valid windows — both are "the target season's wheels haven't spun
   * yet", just from either side of the "Next Season" click:
   *  - right after the previous season resolves (careerSubStep === "resolved") → targets currentAge + 1
   *  - right when a new season is about to start (careerSubStep === "idle") → targets currentAge itself
   */
  targetSeason: number | null;
  onPurchase: (itemId: string) => Promise<void>;
  onClose?: () => void;
}

export function ShopModal({
  walletBalance,
  shopInventory,
  currentAge,
  isProcessing,
  targetSeason,
  onPurchase,
  onClose,
}: ShopModalProps) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorByItem, setErrorByItem] = useState<Record<string, string>>({});

  async function handleBuy(item: ShopCatalogItem) {
    if (isProcessing || purchasingId) return;
    setPurchasingId(item.id);
    setErrorByItem((prev) => ({ ...prev, [item.id]: "" }));
    try {
      await onPurchase(item.id);
    } catch (err: any) {
      setErrorByItem((prev) => ({ ...prev, [item.id]: err?.message ?? "Giao dịch thất bại" }));
    } finally {
      setPurchasingId(null);
    }
  }

  const canPurchase = targetSeason !== null;

  const content = (
    <div
      style={{
        width: "100%",
        height: onClose ? "85vh" : "calc(100vh - 180px)",
        maxHeight: "85vh",
        borderRadius: 10,
        background: "var(--cream, #fbf7ee)",
        border: "3px solid var(--charcoal, #1e293b)",
        boxShadow: onClose ? "10px 10px 0 var(--charcoal, #1e293b)" : "3px 3px 0 var(--charcoal, #1e293b)",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── FIXED TOP HEADER ── */}
      <div
        style={{
          padding: "16px 20px 12px 20px",
          borderBottom: "2px solid var(--charcoal, #1e293b)",
          backgroundColor: "var(--cream, #fbf7ee)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
            paddingBottom: 10,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingBag size={22} color="var(--coral, #e85d42)" />
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontFamily: "var(--font-headline, sans-serif)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  fontWeight: 800,
                }}
              >
                Cửa Hàng
              </h3>
            </div>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", opacity: 0.75 }}>
              {canPurchase
                ? <>Vật phẩm mua ở đây áp dụng cho <strong>Mùa giải Tuổi {targetSeason}</strong></>
                : "Ghé lại vào đầu hoặc cuối mùa giải để mua sắm"}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--cream-dark, #e2e8f0)",
                border: "2px solid var(--charcoal, #1e293b)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "2px 2px 0 var(--charcoal, #1e293b)",
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderRadius: 8,
            background: "var(--white, #ffffff)",
            border: "2px solid var(--charcoal, #1e293b)",
          }}
        >
          <span style={{ fontSize: "0.68rem", textTransform: "uppercase", opacity: 0.65 }}>Số dư ví</span>
          <strong style={{ fontSize: "1.05rem", color: "#15803d" }}>{formatEuroThousands(walletBalance)}</strong>
        </div>

        {!canPurchase && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 6,
              background: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.25)",
              fontSize: "0.78rem",
              color: "#1e40af",
            }}
          >
            <Info size={15} style={{ flexShrink: 0 }} />
            <span>Đang xem trước cửa hàng. Mua sắm mở lại vào đầu/cuối mỗi mùa giải, trước khi vòng quay bắt đầu.</span>
          </div>
        )}
      </div>
      {/* ── END FIXED TOP HEADER ── */}

      {/* ── SCROLLABLE MIDDLE BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h4
            style={{
              margin: 0,
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#334155",
            }}
          >
            HỖ TRỢ PHONG ĐỘ
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {SHOP_CATALOG.map((item) => {
                  const alreadyBoughtForTarget =
                    targetSeason !== null &&
                    shopInventory.some((e) => e.itemId === item.id && e.appliedSeason === targetSeason);
                  const canAfford = walletBalance >= item.priceThousands;
                  const disabled =
                    !canPurchase ||
                    alreadyBoughtForTarget ||
                    !canAfford ||
                    isProcessing ||
                    purchasingId === item.id;
                  const error = errorByItem[item.id];

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        border: `2px solid ${alreadyBoughtForTarget ? "#15803d" : "var(--charcoal, #1e293b)"}`,
                        background: "#fff",
                        boxShadow: "2px 2px 0 var(--charcoal, #1e293b)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        opacity: (!canAfford && !alreadyBoughtForTarget) || !canPurchase ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <strong style={{ fontSize: "0.92rem", fontFamily: "var(--font-headline, sans-serif)" }}>
                          {item.name}
                        </strong>
                        <strong style={{ fontSize: "0.85rem" }}>{formatEuroThousands(item.priceThousands)}</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.75 }}>{item.description}</p>

                      {error && (
                        <span style={{ fontSize: "0.7rem", color: "var(--coral, #e85d42)" }}>{error}</span>
                      )}

                      <button
                        type="button"
                        className="btn-primary"
                        disabled={disabled}
                        onClick={() => handleBuy(item)}
                        style={{
                          marginTop: 4,
                          padding: "8px",
                          fontSize: "0.8rem",
                          cursor: disabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {alreadyBoughtForTarget
                          ? "ĐÃ MUA MÙA NÀY"
                          : purchasingId === item.id
                            ? "ĐANG XỬ LÝ..."
                            : !canPurchase
                              ? "CHƯA MỞ BÁN"
                              : !canAfford
                                ? "KHÔNG ĐỦ SỐ DƯ"
                                : "MUA"}
                      </button>
                    </div>
                  );
            })}
          </div>
        </div>
      </div>
      {/* ── END SCROLLABLE MIDDLE BODY ── */}
    </div>
  );

  if (onClose) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "880px" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
