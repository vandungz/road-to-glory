"use client";

import { Globe } from "lucide-react";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import { SpinnerWheel } from "./SpinnerWheel";
import { TransferWindowPanel } from "./TransferWindowPanel";
import { getSeasonYearString, getContinentalCupLabel } from "../lib/simulation-helpers";

interface CareerActionsPanelProps {
  careerSubStep: string;
  currentAge: number;
  playerDebutAge: number;
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
  tempSelectedStat?: string | null;
  approachRejects: import("./TransferWindowPanel").ApproachRejectState;
  approachBanner: string | null;
  isUnemployed: boolean;
  onOpenTransferModal?: () => void;
}

export function CareerActionsPanel({
  careerSubStep,
  currentAge,
  playerDebutAge,
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
  tempSelectedStat,
  approachRejects,
  approachBanner,
  isUnemployed,
  onOpenTransferModal,
}: CareerActionsPanelProps) {
  const currentSeasonStr = getSeasonYearString(currentAge, playerDebutAge);
  const totalNeed = yearEvolutionCount ?? 1;

  const isHighStakes = ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isMidStakes = ["standing", "domestic_cup", "continental_cup"].includes(careerSubStep);
  const stakes: "low" | "mid" | "high" = isHighStakes ? "high" : isMidStakes ? "mid" : "low";

  const panelBg = isHighStakes ? "#1f1a14" : isMidStakes ? "var(--cream-dark)" : "var(--white)";
  const panelBorder = isHighStakes ? "2px solid #D4960D" : "2px solid var(--charcoal)";
  const panelShadow = isHighStakes ? "0 0 12px rgba(212,150,13,0.3), 3px 3px 0 var(--charcoal)" : "3px 3px 0 var(--charcoal)";

  return (
    <div style={{ flex: "1 1 450px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ backgroundColor: panelBg, border: panelBorder, borderRadius: "4px", boxShadow: panelShadow, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", transition: "all 0.3s ease" }}>
        
        <div style={{ textAlign: "center", width: "100%" }}>
          <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: isHighStakes ? "#D4960D" : "var(--coral)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            MÙA GIẢI {currentSeasonStr} (TUỔI {currentAge}) · CLB: {isUnemployed || !currentClub ? "KHÔNG CLB" : currentClub?.name}
          </p>
          <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", marginTop: "4px", margin: 0, lineHeight: 1.25, color: isHighStakes ? "var(--cream)" : "var(--charcoal)" }}>
            {careerSubStep === "idle" && (isUnemployed || !currentClub ? "KHÔNG CLB · MÙA THẤT NGHIỆP" : "SẴN SÀNG KHỞI ĐỘNG MÙA GIẢI")}
            {careerSubStep === "dir_increase" && "Stats: Có Tăng Chỉ Số Không? (Yes/No)"}
            {careerSubStep === "dir_decrease" && "Stats: Có Giảm Chỉ Số Không? (Yes/No)"}
            {careerSubStep === "count" && "Stats: Số Lượng Stats Ảnh Hưởng"}
            {careerSubStep === "selector" && `Stats: Chọn Chỉ Số ${selectorIndex + 1} / ${totalNeed}`}
            {careerSubStep === "magnitude" && `Stats: Biên Độ Cho ${tempSelectedStat?.toUpperCase()} (${selectorIndex + 1} / ${totalNeed})`}
            {careerSubStep === "standing" && "Giải đấu: Quay Bánh Xe Thứ Hạng (League Standing)"}
            {careerSubStep === "domestic_cup" && "Cup: Quay Kết Quả Cup Quốc Gia"}
            {careerSubStep === "continental_cup" && `Cup Lục Địa: ${getContinentalCupLabel(currentContinentalCup)}`}
            {careerSubStep === "national_callup" && "ĐTQG: Quay Triệu Tập Tuyển"}
            {careerSubStep === "national_tournament" && "ĐTQG: Vòng Quay Cup Quốc Tế"}
            {careerSubStep === "ballon_dor_nomination" && "🏅 QUẢ BÓNG VÀNG: Vào Top 10?"}
            {careerSubStep === "ballon_dor_ranking" && "🏆 QUẢ BÓNG VÀNG: Hạng Bao Nhiêu?"}
            {careerSubStep === "season_stats" && "📊 Xem thống kê mùa giải..."}
            {careerSubStep === "transfer" && "Thị Trường Chuyển Nhượng"}
            {careerSubStep === "resolved" && (isUnemployed || !currentClub ? "Mùa thất nghiệp đã ghi nhận" : "Mùa giải đã hoàn thành")}
          </h3>
        </div>

        {/* Idle Mode */}
        {careerSubStep === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {(isUnemployed || !currentClub) ? (
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8, textAlign: "center" }}>
                Không có CLB — mùa này 0 apps. Sau evol sẽ vào cửa sổ FA.
              </p>
            ) : (
              currentContinentalCup !== "none" && (
                <div style={{ backgroundColor: "var(--cream-dark)", border: "1px solid var(--charcoal)", padding: "6px 16px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={14} color="var(--coral)" /> Đạt vé dự {getContinentalCupLabel(currentContinentalCup)}
                </div>
              )
            )}
            <button
              type="button"
              onClick={handleStartSeason}
              disabled={isProcessing}
              className="btn-primary"
              style={{ fontSize: "1.1rem", padding: "14px 40px", backgroundColor: "var(--coral)", opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? "not-allowed" : "pointer" }}
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
              {isProcessing && !careerSpinning ? "ĐANG XỬ LÝ..." : isHighStakes ? "✨ SPIN CEREMONY ✨" : "QUAY BÁNH XE"}
            </button>
          </>
        )}

        {/* Transfer Step Prompt Button */}
        {careerSubStep === "transfer" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
              Cửa sổ chuyển nhượng đã mở! Hãy mở đàm phán hợp đồng để xem các đề nghị.
            </p>
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="btn-primary"
              style={{ fontSize: "1rem", padding: "12px 28px", backgroundColor: "#266b3e" }}
            >
              💼 MỞ HỢP ĐỒNG & CHUYỂN NHƯỢNG →
            </button>
          </div>
        )}

        {/* Resolved reporting */}
        {careerSubStep === "resolved" && yearSimResult && (
          <div style={{ width: "100%", border: "1px dashed var(--charcoal)", borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px solid var(--cream-border)", paddingBottom: "8px" }}>
              <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                BÁO CÁO THÀNH TÍCH MÙA GIẢI {getSeasonYearString(currentAge, playerDebutAge)} (TUỔI {currentAge})
              </h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", margin: "4px 0" }}>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>LEAGUE</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900 }}>#{standingResult ?? "—"}</div>
              </div>
              <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "10px", boxShadow: "2px 2px 0 var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>DOMESTIC CUP</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                  {domesticCupResult === "Winner" ? "🏆 WIN" : domesticCupResult === "Runner-Up" ? "🥈 Á QUÂN" : domesticCupResult === "Semi-Finals" ? "🥉 BÁN KẾT" : "❌ LOẠI SỚM"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ flex: "1 1 120px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>THỐNG KÊ CÁ NHÂN</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }}>
                  {yearSimResult.apps} Trận · {yearSimResult.goals} G · {yearSimResult.assists} A
                </div>
              </div>
              <div style={{ flex: "1 1 120px", textAlign: "right" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>DIỂM RATING</span>
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

            <button
              type="button"
              onClick={handleNextSeason}
              disabled={isProcessing}
              className="btn-primary"
              style={{ width: "100%", fontSize: "1rem", padding: "10px", marginTop: "4px", backgroundColor: "var(--charcoal)", color: "var(--white)", opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? "not-allowed" : "pointer" }}
            >
              TIẾN VÀO MÙA GIẢI TIẾP THEO →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
