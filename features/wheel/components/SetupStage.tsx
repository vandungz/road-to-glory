"use client";

import { SpinnerWheel } from "./SpinnerWheel";
import { Button } from "@/components/ui/Button";
import type { DraftData } from "../stores/useWheelUiStore";
import { DraftPlayerDossier } from "./DraftPlayerDossier";
import { DraftProgressRail } from "./DraftProgressRail";

interface SetupStageProps {
  slotIndex: number;
  activeStep: number;
  isSpinning: boolean;
  wheelItems: { label: string; value: unknown; weight?: number }[];
  targetIndex: number;
  handleSetupSpinComplete: () => void;
  tempValue: string | number | null;
  handleSetupSpin: () => void;
  handleStartCareer: () => void;
  isProcessing: boolean;
  startCareerError: string | null;
  draftData: DraftData;
  position: string;
  STEP_LABELS: string[];
}

function getChapterLabel(step: number) {
  if (step <= 2) return "Xuất thân";
  if (step <= 8) return "Chỉ số";
  if (step <= 10) return "Thể chất";
  return "Khởi đầu";
}

function getStepDescription(step: number) {
  if (step <= 2) return "Một vòng quay quyết định dữ kiện đầu tiên của cầu thủ.";
  if (step <= 8) return "Mỗi chỉ số được tạo riêng, không bị thay thế bởi OVR tổng.";
  if (step <= 10) return "Thể chất và thời gian sự nghiệp sẽ định hình hành trình phía trước.";
  return "Nơi bắt đầu sẽ khép lại bản draft của cầu thủ.";
}

export function SetupStage({ slotIndex, activeStep, isSpinning, wheelItems, targetIndex, handleSetupSpinComplete, tempValue, handleSetupSpin, handleStartCareer, isProcessing, startCareerError, draftData, position, STEP_LABELS }: SetupStageProps) {
  const isComplete = activeStep >= STEP_LABELS.length;
  const chapterLabel = getChapterLabel(activeStep);

  return (
    <main className="football-draft-setup">
      <div className="football-draft-setup__main">
        <DraftProgressRail currentStep={activeStep} />
        <section className="football-draft-setup__action">
          <div className="football-draft-setup__heading">
            <span>{isComplete ? "Draft hoàn tất" : `Vòng ${activeStep + 1} · ${chapterLabel}`}</span>
            <h1>{isComplete ? "Bắt đầu sự nghiệp cầu thủ" : STEP_LABELS[activeStep]}</h1>
            <p>{isComplete ? "Mười ba vòng quay đã tạo nên điểm xuất phát của cầu thủ." : getStepDescription(activeStep)}</p>
          </div>

          {!isComplete ? (
            <>
              <SpinnerWheel isSpinning={isSpinning} items={wheelItems} targetIndex={targetIndex} onSpinComplete={handleSetupSpinComplete} />
              {tempValue !== null && !isSpinning && <div className="football-draft-setup__result" aria-live="polite">{tempValue}</div>}
              <div className="football-draft-setup__cta">
                <span>{isSpinning ? "Đang quay..." : tempValue !== null ? "Kết quả đã ghi nhận" : "Sẵn sàng"}</span>
                <Button size="lg" onClick={handleSetupSpin} disabled={isSpinning}>
                  {isSpinning ? "Bánh xe đang quay" : "Quay bánh xe"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {startCareerError && (
                <p className="football-draft-setup__error" role="alert">{startCareerError}</p>
              )}
              <Button size="lg" onClick={handleStartCareer} disabled={isProcessing}>
                {isProcessing ? "Đang tạo cầu thủ" : "Bắt đầu sự nghiệp"}
              </Button>
            </>
          )}
        </section>
      </div>

      <DraftPlayerDossier
        draftData={draftData}
        position={position}
        playerNumber={slotIndex + 1}
      />
    </main>
  );
}
