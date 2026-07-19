"use client";

import { Dices, Globe, Sparkles } from "lucide-react";
import { SpinnerWheel } from "./SpinnerWheel";
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
  transferOffer: any;
  handleAcceptTransfer: (accept: boolean) => void;
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
  transferOffer,
  handleAcceptTransfer,
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
}: CareerActionsPanelProps) {
  const currentSeasonStr = getSeasonYearString(currentAge, playerDebutAge);
  const totalNeed = yearEvolutionCount ?? 1;

  return (
    <div style={{ flex: "1 1 450px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        
        <div style={{ textAlign: "center", width: "100%" }}>
          <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--coral)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            MÙA GIẢI {currentSeasonStr} (TUỔI {currentAge}) · CLB: {currentClub?.name}
          </p>
          <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", marginTop: "4px", margin: 0, lineHeight: 1.25 }}>
            {careerSubStep === "idle" && "SẴN SÀNG KHỞI ĐỘNG MÙA GIẢI"}
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
            {careerSubStep === "transfer" && "Lời Mời Chuyển Nhượng"}
            {careerSubStep === "resolved" && "Mùa giải đã hoàn thành"}
          </h3>
        </div>

        {/* Idle Mode */}
        {careerSubStep === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {currentContinentalCup !== "none" && (
              <div style={{ backgroundColor: "var(--cream-dark)", border: "1px solid var(--charcoal)", padding: "6px 16px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <Globe size={14} color="var(--coral)" /> Đạt vé dự {getContinentalCupLabel(currentContinentalCup)}
              </div>
            )}
            <button
              type="button"
              onClick={handleStartSeason}
              disabled={isProcessing}
              className="btn-primary"
              style={{ fontSize: "1.1rem", padding: "14px 40px", backgroundColor: "var(--coral)", opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? "not-allowed" : "pointer" }}
            >
              TIẾN VÀO MÙA GIẢI
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
            />
            {careerTempValue !== null && !careerSpinning && (
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, border: "2px solid var(--charcoal)", padding: "6px 20px", backgroundColor: "var(--cream)", boxShadow: "2px 2px 0 var(--charcoal)", borderRadius: "3px", textTransform: "uppercase" }}>
                {careerTempValue}
              </div>
            )}
            <button
              type="button"
              onClick={handleCareerSpin}
              disabled={careerSpinning || isProcessing}
              className="btn-primary"
              style={{ fontSize: "1.1rem", padding: "12px 36px", opacity: (careerSpinning || isProcessing) ? 0.6 : 1 }}
            >
              {isProcessing && !careerSpinning ? "ĐANG XỬ LÝ..." : "QUAY BÁNH XE"}
            </button>
          </>
        )}

        {/* Transfer offer */}
        {careerSubStep === "transfer" && transferOffer && (
          <div style={{ width: "100%", border: "2px solid var(--charcoal)", borderRadius: "4px", padding: "20px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
              ĐỀ NGHỊ CHUYỂN NHƯỢNG TỪ {transferOffer.clubName}
            </h4>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: 1.5, margin: 0 }}>
              CLB <strong>{transferOffer.clubName}</strong> ({transferOffer.leagueName}) muốn ký hợp đồng với bạn. Bạn có đồng ý chuyển nhượng?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => handleAcceptTransfer(true)} disabled={isProcessing} className="btn-primary" style={{ flex: 1, padding: "10px", opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? "not-allowed" : "pointer" }}>ĐỒNG Ý</button>
              <button type="button" onClick={() => handleAcceptTransfer(false)} disabled={isProcessing} className="btn-secondary" style={{ flex: 1, padding: "10px", opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? "not-allowed" : "pointer" }}>TỪ CHỐI</button>
            </div>
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
