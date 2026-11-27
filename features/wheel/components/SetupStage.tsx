"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { SpinnerWheel } from "./SpinnerWheel";
import { Button } from "@/components/ui/Button";
import type { DraftData } from "../stores/useWheelUiStore";
import { DraftPlayerDossier } from "./DraftPlayerDossier";
import { DRAFT_CHAPTERS, DraftProgressRail } from "./DraftProgressRail";
import type { ClassicProfile } from "./ClassicProfileSetup";

interface SetupStageProps {
  profile?: ClassicProfile;
  slotIndex: number;
  activeStep: number;
  isSpinning: boolean;
  isResolving?: boolean;
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

const draftStepKeys: Partial<Record<number, string>> = {
  0: "nationality", 1: "debutAge", 2: "height", 3: "weight",
  10: "careerLength", 11: "league", 12: "club",
};

export function SetupStage({ profile, slotIndex, activeStep, isSpinning, isResolving, wheelItems, targetIndex, handleSetupSpinComplete, handleSetupSpin, handleStartCareer, isProcessing, startCareerError, draftData, position, STEP_LABELS }: SetupStageProps) {
  const ui = useTranslations("ui");
  const isComplete = activeStep >= STEP_LABELS.length;
  const t = useTranslations("draft");
  const wheel = useTranslations("wheel");
  const chapter = DRAFT_CHAPTERS.find(({ end }) => activeStep <= end) ?? DRAFT_CHAPTERS[3];
  const stepKey = draftStepKeys[activeStep];
  const stepLabel = stepKey ? t(stepKey) : STEP_LABELS[activeStep];

  const displayWheel = wheelItems.map((item) => {
    if (activeStep === 1) return { ...item, label: wheel("ageCount", { count: Number(item.value) }) };
    if (activeStep === 10) return { ...item, label: ui("yearCount", { count: Number(item.value) }) };
    if (activeStep === 12 && typeof item.value === "object" && item.value && "id" in item.value && item.value.id === "") {
      return { ...item, label: wheel("clubNone") };
    }
    return item;
  });

  return (
    <main className="football-draft-setup">
      <PageGuide id="draft" paused={isSpinning || isProcessing} />
      <div className="football-draft-setup__main">
        <DraftProgressRail currentStep={activeStep} />
        <section className="football-draft-setup__action" data-guide="draft-wheel">
          <div key={activeStep} className="football-draft-setup__heading" data-mount="detail">
            <span>{isComplete ? ui("draftComplete") : ui("round", { v0: String(activeStep + 1), v1: t(chapter.key) })}</span>
            <h1>{isComplete ? ui("startPlayerCareer") : stepLabel}</h1>
          </div>

          {!isComplete ? (
            <>
              <SpinnerWheel isSpinning={isSpinning} items={displayWheel} targetIndex={targetIndex} onSpinComplete={handleSetupSpinComplete} />
              <div className="football-draft-setup__cta">
                <Button size="lg" onClick={handleSetupSpin} disabled={isSpinning || isResolving || !wheelItems.length} loading={isResolving}>
                  {isSpinning ? ui("wheelIsSpinning") : ui("spin")}
                </Button>
              </div>
            </>
          ) : (
            <>
              {startCareerError && (
                <p className="football-draft-setup__error" role="alert">{startCareerError}</p>
              )}
              <Button size="lg" onClick={handleStartCareer} disabled={isProcessing}>
                {isProcessing ? ui("creatingPlayer") : ui("startYourCareer")}
              </Button>
            </>
          )}
        </section>
      </div>

      <DraftPlayerDossier
        profile={profile}
        draftData={draftData}
        position={position}
        playerNumber={slotIndex + 1}
      />
    </main>
  );
}
