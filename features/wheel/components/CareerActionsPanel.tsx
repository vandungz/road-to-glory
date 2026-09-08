"use client";

import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { CurrentClub } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ResultBanner } from "@/components/ui/ResultBanner";
import { SpinnerWheel } from "./SpinnerWheel";
import type { SpinnerItem } from "./SpinnerWheel";
import { getSeasonYearString, getContinentalCupLabel, getDomesticCupName } from "../lib/simulation-helpers";
import { getCompetitionResultLabel } from "../lib/competition-result-labels";

interface CareerActionsPanelProps {
  careerSubStep: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength?: number;
  currentClub: CurrentClub | null;
  currentContinentalCup: string;
  careerSpinning: boolean;
  isProcessing: boolean;
  careerWheelItems: SpinnerItem[];
  careerTargetIndex: number;
  handleCareerSpinComplete: () => void;
  careerTempValue: string | null;
  handleCareerSpin: () => void;
  yearSimResult: SimulatedSeasonResult | null;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  hasBallonDorWinner: boolean;
  handleNextSeason: () => void;
  selectorIndex: number;
  yearEvolutionCount?: number | null;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  tempSelectedStat?: string | null;
  isUnemployed: boolean;
  onOpenTransferModal?: () => void;
  onOpenShop?: () => void;
}

function getStageTitle(step: string, cup: string, index: number, total: number, direction?: string | null, stat?: string | null) {
  const decrease = direction === "decrease";
  const titles: Record<string, string> = {
    idle: "Cửa hàng đầu mùa giải",
    dir_increase: "Tăng trưởng chỉ số sự nghiệp",
    dir_decrease: "Suy giảm chỉ số sự nghiệp",
    count: decrease ? "Số lượng chỉ số suy giảm" : "Số lượng chỉ số thay đổi",
    standing: "Vòng quay VĐQG — xếp hạng giải đấu",
    domestic_cup: "Cúp quốc gia",
    continental_cup: `Cúp lục địa — ${getContinentalCupLabel(cup)}`,
    national_callup: "Đội tuyển quốc gia — triệu tập",
    national_tournament: "Đội tuyển quốc gia — giải quốc tế",
    ballon_dor_nomination: "Quả Bóng Vàng — top 10 đề cử",
    ballon_dor_ranking: "Quả Bóng Vàng — xếp hạng chung cuộc",
    season_stats: "Thống kê thành tích mùa giải",
    transfer: "Thị trường chuyển nhượng và hợp đồng",
    resolved: "Mùa giải đã hoàn thành",
  };
  if (step === "selector") return `${decrease ? "Chọn chỉ số suy giảm" : "Chọn chỉ số phát triển"} (${index + 1}/${total})`;
  if (step === "magnitude") return `${decrease ? "Biên độ giảm" : "Biên độ tăng"} cho ${stat?.toUpperCase() ?? "chỉ số"} (${index + 1}/${total})`;
  return titles[step] ?? "Tiếp tục sự nghiệp";
}

function getStageEyebrow(step: string, cup: string) {
  const labels: Record<string, string> = {
    standing: "Bước 1 / 5 · Vòng quay xếp hạng",
    domestic_cup: "Bước 2 / 5 · Vòng quay cúp",
    continental_cup: `Bước 2 / 5 · ${getContinentalCupLabel(cup)}`,
    national_callup: "Bước 3 / 5 · Vòng quay đội tuyển",
    national_tournament: "Bước 3 / 5 · Vòng quay danh hiệu",
    dir_increase: "Bước 4 / 5 · Phát triển chỉ số",
    dir_decrease: "Bước 4 / 5 · Phát triển chỉ số",
    season_stats: "Bước 4 / 5 · Tổng kết mùa giải",
    transfer: "Bước 5 / 5 · Chuyển nhượng",
  };
  return labels[step] ?? "Tiến trình sự nghiệp";
}

function cupResultLabel(result: string | null) {
  return getCompetitionResultLabel(result, "Chưa có kết quả");
}

export function CareerActionsPanel({
  careerSubStep, currentAge, playerDebutAge, playerCareerLength, currentClub, currentContinentalCup,
  careerSpinning, isProcessing, careerWheelItems, careerTargetIndex, handleCareerSpinComplete,
  careerTempValue, handleCareerSpin, yearSimResult, standingResult, domesticCupResult, hasBallonDorWinner,
  handleNextSeason, selectorIndex, yearEvolutionCount, yearEvolutionDirection, tempSelectedStat,
  isUnemployed, onOpenTransferModal, onOpenShop,
}: CareerActionsPanelProps) {
  const seasonLabel = getSeasonYearString(currentAge, playerDebutAge);
  const totalNeed = yearEvolutionCount ?? 1;
  const retireAge = playerDebutAge + (playerCareerLength ?? 15);
  const isFinalSeason = currentAge >= retireAge;
  const isHighStakes = ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isWheelStep = ["dir_increase", "dir_decrease", "count", "selector", "magnitude", "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isShopStage = careerSubStep === "idle";
  const clubLabel = isUnemployed || !currentClub ? "Thất nghiệp" : currentClub.name;
  const domesticCupName = currentClub ? getDomesticCupName(currentClub.leagueName, currentClub.leagueId) : "Cúp quốc gia";
  const stageTitle = careerSubStep === "domestic_cup"
    ? domesticCupName
    : getStageTitle(careerSubStep, currentContinentalCup, selectorIndex, totalNeed, yearEvolutionDirection, tempSelectedStat);

  return (
    <section className={`rtg-action-panel${isHighStakes ? " rtg-action-panel--high-stakes" : ""}`}>
      {!isShopStage && (
        <header className="rtg-action-panel__header">
          <span className="rtg-eyebrow">{getStageEyebrow(careerSubStep, currentContinentalCup)}</span>
          <h2>{stageTitle}</h2>
          {careerSubStep === "domestic_cup" && <p className="rtg-action-panel__description">Quay để biết {domesticCupName} đi được đến đâu ở mùa này.</p>}
          {careerSubStep === "continental_cup" && <p className="rtg-action-panel__description">Quay để biết {getContinentalCupLabel(currentContinentalCup)} đi được đến đâu ở mùa này.</p>}
          {isFinalSeason && <span className="rtg-action-panel__notice">Mùa giải cuối cùng</span>}
        </header>
      )}

      <div className="rtg-action-panel__body">
        {careerSubStep === "idle" && (
          <div className="rtg-career-shop-entry">
            <span className="rtg-eyebrow">Mùa giải {seasonLabel} · tuổi {currentAge} · {clubLabel}</span>
            <h2>Cửa hàng đầu mùa giải</h2>
            <p>Mở module cửa hàng để dùng số dư ví cho các vật phẩm hỗ trợ mùa giải trước khi quay bánh xe.</p>
            <Button size="lg" onClick={onOpenShop} disabled={isProcessing || !onOpenShop} className="rtg-action-panel__primary">
              Mở cửa hàng
            </Button>
          </div>
        )}

        {isWheelStep && (
          <div className="rtg-wheel-stage">
            <SpinnerWheel isSpinning={careerSpinning} items={careerWheelItems} targetIndex={careerTargetIndex} onSpinComplete={handleCareerSpinComplete} stakes={isHighStakes ? "high" : ["standing", "domestic_cup", "continental_cup"].includes(careerSubStep) ? "mid" : "low"} />
            {careerTempValue !== null && !careerSpinning && <ResultBanner>{careerTempValue}</ResultBanner>}
            <Button size="lg" onClick={handleCareerSpin} disabled={careerSpinning || isProcessing} className="rtg-action-panel__primary">
              {isProcessing && !careerSpinning ? "Đang xử lý..." : isHighStakes ? "Quay vòng danh hiệu" : "Quay bánh xe"}
            </Button>
          </div>
        )}

        {(careerSubStep === "resolved" || careerSubStep === "transfer") && yearSimResult && (
          <div className="rtg-season-report">
            <div className="rtg-season-report__heading"><span className="rtg-eyebrow">Báo cáo thành tích</span><h3>Mùa giải {seasonLabel}</h3></div>
            <div className="rtg-season-report__stats">
              <DataRow label="Giải VĐQG" value={standingResult ? `Hạng ${standingResult}` : "Chưa có dữ liệu"} />
              <DataRow label="Cúp quốc gia" value={cupResultLabel(domesticCupResult)} />
              <DataRow label="Cá nhân" value={`${yearSimResult.apps} trận · ${yearSimResult.goals} bàn · ${yearSimResult.assists} kiến tạo`} />
              <DataRow label="Match rating" value={<span className="rtg-data-row__value--accent">{yearSimResult.matchRating}</span>} />
            </div>
            {hasBallonDorWinner && <ResultBanner tone="honour">Quả Bóng Vàng — chiến thắng danh giá</ResultBanner>}
            {careerSubStep === "transfer" && !isFinalSeason ? (
              <Button size="lg" onClick={onOpenTransferModal} disabled={isProcessing} className="rtg-action-panel__primary">Mở thị trường chuyển nhượng</Button>
            ) : (
              <Button size="lg" onClick={!isFinalSeason && careerSubStep === "resolved" && onOpenShop ? onOpenShop : handleNextSeason} disabled={isProcessing} className="rtg-action-panel__primary">{isFinalSeason ? "Giải nghệ và tổng kết sự nghiệp" : "Tiến vào mùa giải tiếp theo"}</Button>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
