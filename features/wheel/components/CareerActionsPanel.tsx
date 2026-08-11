"use client";

import { Globe } from "lucide-react";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import { SpinnerWheel } from "./SpinnerWheel";
import { TransferWindowPanel } from "./TransferWindowPanel";
import { getSeasonYearString, getContinentalCupLabel } from "../lib/simulation-helpers";
import { formatEuroThousands } from "@/lib/transfer-economy";

interface CareerActionsPanelProps {
  careerSubStep: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength?: number;
  currentClub: any;
  currentContinentalCup: string;
  careerSpinning: boolean;
  isProcessing: boolean;
  careerWheelItems: any[];
  careerTargetIndex: number;
  handleCareerSpinComplete: () => void;
  careerTempValue: string | null;
  handleCareerSpin: () => void;
  handleStartSeason: () => void;
  transferMarket: TransferMarketResult | null;
  willingToMove: boolean;
  setWillingToMove: (v: boolean) => void;
  showShortlist: boolean;
  setShowShortlist: (v: boolean) => void;
  handleAcceptMarketOffer: (offer: ContractOfferCard) => void;
  handleRejectTransferWindow: () => void;
  handleApproachShortlist: (club: ShortlistClubCard) => void;
  yearSimResult: any;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  hasBallonDorWinner: boolean;
  handleNextSeason: () => void;
  position: string;
  selectorIndex: number;
  yearEvolutionCount?: number | null;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  tempSelectedStat?: string | null;
  approachRejects: import("./TransferWindowPanel").ApproachRejectState;
  approachBanner: string | null;
  isUnemployed: boolean;
  onOpenTransferModal?: () => void;
  onOpenShopModal?: () => void;
  walletBalance?: number;
}

export function CareerActionsPanel({
  careerSubStep,
  currentAge,
  playerDebutAge,
  playerCareerLength,
  currentClub,
  currentContinentalCup,
  careerSpinning,
  isProcessing,
  careerWheelItems,
  careerTargetIndex,
  handleCareerSpinComplete,
  careerTempValue,
  handleCareerSpin,
  handleStartSeason,
  transferMarket,
  willingToMove,
  setWillingToMove,
  showShortlist,
  setShowShortlist,
  handleAcceptMarketOffer,
  handleRejectTransferWindow,
  handleApproachShortlist,
  yearSimResult,
  standingResult,
  domesticCupResult,
  continentalCupResult,
  hasBallonDorWinner,
  handleNextSeason,
  position,
  selectorIndex,
  yearEvolutionCount,
  yearEvolutionDirection,
  tempSelectedStat,
  approachRejects,
  approachBanner,
  isUnemployed,
  onOpenTransferModal,
  onOpenShopModal,
  walletBalance,
}: CareerActionsPanelProps) {
  const currentSeasonStr = getSeasonYearString(currentAge, playerDebutAge);
  const totalNeed = yearEvolutionCount ?? 1;
  const retireAge = playerDebutAge + (playerCareerLength ?? 15);
  const isFinalSeason = currentAge >= retireAge;

  const isHighStakes = ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isMidStakes = ["standing", "domestic_cup", "continental_cup"].includes(careerSubStep);
  const stakes: "low" | "mid" | "high" = isHighStakes ? "high" : isMidStakes ? "mid" : "low";

  const panelBg = isHighStakes ? "#1f1a14" : isMidStakes ? "var(--cream-dark)" : "var(--white)";
  const panelBorder = isHighStakes ? "2px solid #D4960D" : "2px solid var(--charcoal)";
  const panelShadow = isHighStakes ? "0 0 12px rgba(212,150,13,0.3), 3px 3px 0 var(--charcoal)" : "3px 3px 0 var(--charcoal)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: panelBg,
        border: panelBorder,
        borderRadius: "4px",
        boxShadow: panelShadow,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        transition: "all 0.3s ease",
        boxSizing: "border-box",
      }}
    >
      {/* TOP HEADER: MATCHDAY BANNER */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          borderBottom: "1.5px solid var(--charcoal)",
          paddingBottom: "12px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-stamp)",
            fontSize: "0.62rem",
            color: isHighStakes ? "#D4960D" : "var(--coral)",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "0 0 4px 0",
          }}
        >
          MÙA GIẢI {currentSeasonStr} (TUỔI {currentAge}){isFinalSeason ? " · MÙA GIẢI CUỐI CÙNG" : ""} · CLB: {isUnemployed || !currentClub ? "THẤT NGHIỆP" : currentClub?.name}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "1.35rem",
            fontWeight: 900,
            textTransform: "uppercase",
            margin: 0,
            lineHeight: 1.2,
            color: isHighStakes ? "var(--cream)" : "var(--charcoal)",
          }}
        >
          {careerSubStep === "idle" && (isUnemployed || !currentClub ? "MÙA GIẢI THẤT NGHIỆP" : "SẴN SÀNG KHỞI ĐỘNG MÙA GIẢI")}
          {careerSubStep === "dir_increase" && "TĂNG TRƯỞNG CHỈ SỐ SỰ NGHIỆP"}
          {careerSubStep === "dir_decrease" && "SUY GIẢM CHỈ SỐ SỰ NGHIỆP"}
          {careerSubStep === "count" && (yearEvolutionDirection === "decrease" ? "SỐ LƯỢNG CHỈ SỐ SUY GIẢM" : "SỐ LƯỢNG CHỈ SỐ THAY ĐỔI")}
          {careerSubStep === "selector" && (yearEvolutionDirection === "decrease" ? `CHỌN CHỈ SỐ SUY GIẢM (${selectorIndex + 1}/${totalNeed})` : `CHỌN CHỈ SỐ PHÁT TRIỂN (${selectorIndex + 1}/${totalNeed})`)}
          {careerSubStep === "magnitude" && (yearEvolutionDirection === "decrease" ? `BIÊN ĐỘ GIẢM CHO ${tempSelectedStat?.toUpperCase()} (${selectorIndex + 1}/${totalNeed})` : `BIÊN ĐỘ TĂNG CHO ${tempSelectedStat?.toUpperCase()} (${selectorIndex + 1}/${totalNeed})`)}
          {careerSubStep === "standing" && "VÒNG QUAY VĐQG — XẾP HẠNG GIẢI ĐẤU"}
          {careerSubStep === "domestic_cup" && "CÚP QUỐC GIA — THI ĐẤU CÚP"}
          {careerSubStep === "continental_cup" && `CÚP LỤC ĐỊA — ${getContinentalCupLabel(currentContinentalCup).toUpperCase()}`}
          {careerSubStep === "national_callup" && "ĐỘI TUYỂN QUỐC GIA — TRIỆU TẬP ĐTQG"}
          {careerSubStep === "national_tournament" && "ĐỘI TUYỂN QUỐC GIA — CÚP QUỐC TẾ"}
          {careerSubStep === "ballon_dor_nomination" && "🏅 QUẢ BÓNG VÀNG — TOP 10 ĐỀ CỬ"}
          {careerSubStep === "ballon_dor_ranking" && "🏆 QUẢ BÓNG VÀNG — XẾP HẠNG CHUNG CUỘC"}
          {careerSubStep === "season_stats" && "📊 THỐNG KÊ THÀNH TÍCH MÙA GIẢI"}
          {careerSubStep === "transfer" && "THỊ TRƯỜNG CHUYỂN NHƯỢNG VÀ HỢP ĐỒNG"}
          {careerSubStep === "resolved" && (
            isFinalSeason
              ? "TỔNG KẾT MÙA GIẢI CUỐI CÙNG — CHUẨN BỊ GIẢI NGHỆ"
              : (isUnemployed || !currentClub ? "GHI NHẬN MÙA GIẢI THẤT NGHIỆP" : "MÙA GIẢI ĐÃ HOÀN THÀNH")
          )}
        </h3>
      </div>

      {/* CENTER STAGE ACTION HUB */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        {/* Idle Mode */}
        {careerSubStep === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%" }}>
            {(isUnemployed || !currentClub) ? (
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8, textAlign: "center" }}>
                Đang tự do — không tham gia giải đấu mùa này.
              </p>
            ) : (
              currentContinentalCup !== "none" && (
                <div style={{ backgroundColor: "var(--cream-dark)", border: "1.5px solid var(--charcoal)", padding: "6px 18px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={14} color="var(--coral)" /> Đạt vé dự {getContinentalCupLabel(currentContinentalCup)}
                </div>
              )
            )}
            <button
              type="button"
              onClick={handleStartSeason}
              disabled={isProcessing}
              className="btn-primary"
              style={{
                fontSize: "1.1rem",
                padding: "14px 44px",
                backgroundColor: "var(--coral)",
                opacity: isProcessing ? 0.6 : 1,
                cursor: isProcessing ? "not-allowed" : "pointer",
                width: "100%",
                maxWidth: "340px",
              }}
            >
              {(isUnemployed || !currentClub) ? "BẮT ĐẦU MÙA THẤT NGHIỆP" : "TIẾN VÀO MÙA GIẢI"}
            </button>
          </div>
        )}

        {/* Wheels Spinner */}
        {["dir_increase", "dir_decrease", "count", "selector", "magnitude", "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep) && (
          <>
            <SpinnerWheel
              isSpinning={careerSpinning}
              items={careerWheelItems}
              targetIndex={careerTargetIndex}
              onSpinComplete={handleCareerSpinComplete}
              stakes={stakes}
            />
            {careerTempValue !== null && !careerSpinning && (
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, border: isHighStakes ? "2px solid #D4960D" : "2px solid var(--charcoal)", padding: "6px 20px", backgroundColor: isHighStakes ? "#2a2218" : "var(--cream)", color: isHighStakes ? "#D4960D" : "var(--charcoal)", boxShadow: "2px 2px 0 var(--charcoal)", borderRadius: "3px", textTransform: "uppercase" }}>
                {careerTempValue}
              </div>
            )}
            <button
              type="button"
              onClick={handleCareerSpin}
              disabled={careerSpinning || isProcessing}
              className="btn-primary"
              style={{
                fontSize: "1.1rem",
                padding: "12px 36px",
                minHeight: "56px",
                width: "100%",
                maxWidth: "340px",
                backgroundColor: isHighStakes ? "#D4960D" : "var(--coral)",
                color: isHighStakes ? "#1f1a14" : "var(--white)",
                opacity: (careerSpinning || isProcessing) ? 0.6 : 1,
              }}
            >
              {isProcessing && !careerSpinning ? "ĐANG XỬ LÝ..." : isHighStakes ? "✨ VÒNG QUAY DANH HIỆU ✨" : "QUAY BÁNH XE"}
            </button>
          </>
        )}

        {/* Resolved reporting / End of Season summary */}
        {(careerSubStep === "resolved" || careerSubStep === "transfer") && yearSimResult && (
          <div style={{ width: "100%", border: "1px dashed var(--charcoal)", borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px solid var(--cream-border)", paddingBottom: "8px" }}>
              <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                BÁO CÁO THÀNH TÍCH MÙA GIẢI {getSeasonYearString(currentAge, playerDebutAge)} (TUỔI {currentAge})
              </h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", margin: "4px 0" }}>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>GIẢI VĐQG</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900 }}>#{standingResult ?? "—"}</div>
              </div>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>CÚP QUỐC GIA</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                  {domesticCupResult === "Winner" ? "🏆 VÔ ĐỊCH" : domesticCupResult === "Runner-Up" ? "🥈 Á QUÂN" : domesticCupResult === "Semi-Finals" ? "🥉 BÁN KẾT" : "❌ LOẠI SỚM"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ flex: "1 1 120px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>THỐNG KÊ CÁ NHÂN</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }}>
                  {yearSimResult.apps} Trận · {yearSimResult.goals} Bàn · {yearSimResult.assists} Kiến tạo
                </div>
              </div>
              <div style={{ flex: "1 1 120px", textAlign: "right" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>ĐIỂM ĐÁNH GIÁ</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, color: "var(--coral)", marginTop: "2px" }}>
                  ★ {yearSimResult.matchRating}
                </div>
              </div>
            </div>

            {hasBallonDorWinner && (
              <div style={{ backgroundColor: "gold", border: "1.5px solid var(--charcoal)", padding: "6px", borderRadius: "3px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "var(--charcoal)", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                🏆 ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR DANH GIÁ!
              </div>
            )}

            {careerSubStep === "transfer" ? (
              <button
                type="button"
                onClick={onOpenTransferModal}
                disabled={isProcessing}
                className="btn-primary"
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "12px",
                  marginTop: "4px",
                  backgroundColor: "#2d5a3d",
                  color: "var(--white)",
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? "not-allowed" : "pointer",
                }}
              >
                💼 MỞ CỬA SỔ CHUYỂN NHƯỢNG & HỢP ĐỒNG →
              </button>
            ) : (
              <>
                {!isFinalSeason && onOpenShopModal && (
                  <button
                    type="button"
                    onClick={onOpenShopModal}
                    disabled={isProcessing}
                    style={{
                      width: "100%",
                      fontSize: "0.85rem",
                      padding: "8px",
                      backgroundColor: "var(--white)",
                      color: "var(--charcoal)",
                      border: "2px solid var(--charcoal)",
                      borderRadius: "4px",
                      boxShadow: "2px 2px 0 var(--charcoal)",
                      opacity: isProcessing ? 0.6 : 1,
                      cursor: isProcessing ? "not-allowed" : "pointer",
                    }}
                  >
                    🛒 CỬA HÀNG {typeof walletBalance === "number" ? `(${formatEuroThousands(walletBalance)})` : ""}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNextSeason}
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    fontSize: "1rem",
                    padding: "12px",
                    marginTop: "4px",
                    backgroundColor: isFinalSeason ? "var(--coral, #e85d42)" : "var(--charcoal)",
                    color: "var(--white)",
                    opacity: isProcessing ? 0.6 : 1,
                    cursor: isProcessing ? "not-allowed" : "pointer",
                  }}
                >
                  {isFinalSeason ? "GIẢI NGHỆ & TỔNG KẾT SỰ NGHIỆP →" : "TIẾN VÀO MÙA GIẢI TIẾP THEO →"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM FOOTER BAR */}
      <div
        style={{
          width: "100%",
          paddingTop: "10px",
          borderTop: isHighStakes ? "1.5px dashed #D4960D" : "1.5px dashed var(--charcoal)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          fontFamily: "var(--font-stamp)",
          color: isHighStakes ? "#D4960D" : "var(--charcoal)",
          opacity: 0.85,
        }}
      >
        <span>VỊ TRÍ: <strong>{position}</strong></span>
        <span>TRẠNG THÁI: <strong>{isUnemployed ? "THẤT NGHIỆP" : "ĐANG THI ĐẤU"}</strong></span>
        <span>CƠ HỘI MÙA: <strong>5 VÒNG QUAY</strong></span>
      </div>
    </div>
  );
}
