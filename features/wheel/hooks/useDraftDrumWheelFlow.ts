"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { getCareerWheelPoolAndValue } from "../lib/career-wheel-resolver";
import { isCareerRevisionConflict } from "@/features/career/hooks/useCareerCheckpointSync";
import type { CareerSubStep, HiddenStats, CurrentClub } from "@/types/domain";
import { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";
import type { useCompetitionFlow } from "./useCompetitionFlow";
import type { useStatEvolutionFlow } from "./useStatEvolutionFlow";

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;
type CompetitionController = ReturnType<typeof useCompetitionFlow>;
type StatController = ReturnType<typeof useStatEvolutionFlow>;
type WheelModal = "league" | "cup" | "continental" | "national" | "ballon_dor_nomination" | "season_stats" | "season_recap" | "transfer" | "shop" | null;
type BallonDorResult = { phase: "nomination"; nominated: boolean } | { phase: "ranking"; rank: number };
type PendingStats = { currentStats: Record<string, number>; currentOvr: number };
type WheelItem = { value: string | number };

const COMPETITION_STEPS = new Set([
  "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament",
]);

export interface DraftDrumWheelFlowProps {
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  competitionFlow: CompetitionController;
  statFlow: StatController;
  careerSubStep: CareerSubStep;
  careerWheelItems: WheelItem[];
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  currentOvr: number;
  position: string;
  yearSimResult: SimulatedSeasonResult | null;
  hiddenStats: HiddenStats | null;
  currentClub: CurrentClub | null;
  leagueSize: number;
  priorClubStanding: number | null;
  standingResult: number | null;
  currentContinentalCup: string;
  playerNationality: string;
  selectedStatsList: string[];
  selectorIndex: number;
  yearEvolutionDirection: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
  fitnessCoachActive: boolean;
  nationalCallupBoostActive: boolean;
  eliteDevelopmentActive: boolean;
  isProcessing: boolean;
  careerSpinning: boolean;
  activeModal: WheelModal;
  isBallonDorTransitioning: boolean;
  activeSpinStepRef: MutableRefObject<CareerSubStep | null>;
  activeSpinNextStepRef: MutableRefObject<CareerSubStep | null>;
  tempCareerResultRef: MutableRefObject<string | number | null>;
  pendingCheckpointStatsRef: MutableRefObject<PendingStats | null>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setCareerTargetIndex: Dispatch<SetStateAction<number>>;
  setCareerSpinning: Dispatch<SetStateAction<boolean>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
  setApproachBanner: Dispatch<SetStateAction<string | null>>;
  setActiveModal: Dispatch<SetStateAction<WheelModal>>;
  setBallonDorResult: Dispatch<SetStateAction<BallonDorResult | null>>;
  setIsBallonDorTransitioning: Dispatch<SetStateAction<boolean>>;
  setBallonDorRank?: Dispatch<SetStateAction<number | null>>;
  applyAuthoritativeSeasonTicket: (ticket: string) => void;
}

export function useDraftDrumWheelFlow({
  statsProps,
  checkpointSync,
  competitionFlow,
  statFlow,
  careerSubStep,
  careerWheelItems,
  currentAge,
  playerDebutAge,
  playerCareerLength,
  currentOvr,
  position,
  yearSimResult,
  hiddenStats,
  currentClub,
  leagueSize,
  priorClubStanding,
  standingResult,
  currentContinentalCup,
  playerNationality,
  selectedStatsList,
  selectorIndex,
  yearEvolutionDirection,
  currentStats,
  ballonDorNominationWeight,
  ballonDorRankWeights,
  fitnessCoachActive,
  nationalCallupBoostActive,
  eliteDevelopmentActive,
  isProcessing,
  careerSpinning,
  activeModal,
  isBallonDorTransitioning,
  activeSpinStepRef,
  activeSpinNextStepRef,
  tempCareerResultRef,
  pendingCheckpointStatsRef,
  setIsProcessing,
  setCareerTargetIndex,
  setCareerSpinning,
  setCareerSubStep,
  setApproachBanner,
  setActiveModal,
  setBallonDorResult,
  setIsBallonDorTransitioning,
  applyAuthoritativeSeasonTicket,
}: DraftDrumWheelFlowProps) {
  async function handleCareerSpin() {
    if (isProcessing || careerSpinning || careerSubStep === "idle" || careerSubStep === "resolved"
      || careerSubStep === "season_stats" || activeModal !== null || isBallonDorTransitioning
      || careerWheelItems.length === 0) return;
    if (careerSubStep === "ballon_dor_nomination" && ballonDorNominationWeight === 0) return;

    if (checkpointSync.isEnabled) {
      const stepKey = careerSubStep;
      const wheelType = getWheelTypeForStep(stepKey);
      if (!wheelType) return;
      setIsProcessing(true);
      setCareerTargetIndex(-1);
      setCareerSpinning(true);
      activeSpinStepRef.current = stepKey;
      activeSpinNextStepRef.current = null;
      tempCareerResultRef.current = null;
      try {
        const checkpoint = await checkpointSync.resolveWheel({
          stepKey,
          wheelType,
        });
        const result = checkpoint.outcome;
        if (typeof result !== "string" && typeof result !== "number") {
          throw new Error("Server trả về outcome wheel không hợp lệ");
        }
        // The season row owns this ticket. Keep the visible label and the
        // continental pool aligned with the response that chose the next step.
        if (typeof checkpoint.seasonContinentalCup === "string") {
          applyAuthoritativeSeasonTicket(checkpoint.seasonContinentalCup);
        }
        const idx = careerWheelItems.findIndex((item) => item.value === result);
        if (idx < 0) {
          throw new Error("Outcome " + String(result) + " không có trong pool FE hiện tại");
        }
        if (stepKey === "magnitude") {
          // Defer the React state update until the current animation ends.
          // Rebuilding wheel items during animation would change the immutable
          // wheel session snapshot and make the pointer/target relationship
          // visually inconsistent.
          pendingCheckpointStatsRef.current = {
            currentStats: checkpoint.currentStats,
            currentOvr: checkpoint.currentOvr,
          };
        }
        setCareerTargetIndex(idx);
        setCareerSpinning(true);
        activeSpinStepRef.current = stepKey;
        activeSpinNextStepRef.current = (checkpoint.currentStep ?? null) as CareerSubStep | null;
        tempCareerResultRef.current = result;
      } catch (error) {
        activeSpinStepRef.current = null;
        activeSpinNextStepRef.current = null;
        tempCareerResultRef.current = null;
        setCareerSpinning(false);
        setCareerTargetIndex(-1);
        if (isCareerRevisionConflict(error)) {
          const progress = await checkpointSync.resync();
          const authoritativeStep = progress?.player.currentStep;
          if (authoritativeStep) {
            setCareerSubStep(authoritativeStep as CareerSubStep);
            if (authoritativeStep === "season_stats") {
              setActiveModal("season_stats");
            } else if (authoritativeStep !== "ballon_dor_nomination") {
              setActiveModal(null);
            }
          }
          setApproachBanner("Career đã được đồng bộ lại. Hãy tiếp tục từ bước hiện tại.");
        } else {
          console.error("Career wheel checkpoint failed:", error);
          setApproachBanner("Không thể chốt kết quả — hãy thử lại.");
        }
        setIsProcessing(false);
      }
      return;
    }

    const ctx = {
      currentAge, playerDebutAge, playerCareerLength, currentOvr, position, yearSimResult, hiddenStats, currentClub,
      leagueSize,
      priorClubStanding, standingResult,
      currentContinentalCup, playerNationality, selectedStatsList, selectorIndex,
      yearEvolutionDirection, currentStats,
      ballonDorNominationWeight, ballonDorRankWeights,
      fitnessCoachActive,
      nationalCallupBoostActive,
      eliteDevelopmentActive,
    };
    const { result, idx } = getCareerWheelPoolAndValue(careerSubStep, ctx);
    setIsProcessing(true);
    activeSpinStepRef.current = careerSubStep;
    activeSpinNextStepRef.current = null;
    setCareerTargetIndex(idx);
    setCareerSpinning(true);
    tempCareerResultRef.current = result;
  }

  function handleCareerSpinComplete() {
    const completedStep = activeSpinStepRef.current ?? careerSubStep;
    const authoritativeNextStep = activeSpinNextStepRef.current ?? undefined;
    activeSpinStepRef.current = null;
    activeSpinNextStepRef.current = null;
    const result = tempCareerResultRef.current;
    const pendingStats = pendingCheckpointStatsRef.current;
    pendingCheckpointStatsRef.current = null;
    setCareerSpinning(false); setCareerTargetIndex(-1);
    if (pendingStats) {
      statsProps.setCurrentStats(pendingStats.currentStats);
      statsProps.setCurrentOvr(pendingStats.currentOvr);
      statsProps.setPeakOvr((previous) => Math.max(previous, pendingStats.currentOvr));
      statsProps.setStatsTimeline((timeline) => timeline.map((snapshot) => (
        snapshot.age === currentAge
          ? { ...snapshot, ...pendingStats.currentStats, ovr: pendingStats.currentOvr }
          : snapshot
      )));
    }
    if (completedStep === "ballon_dor_nomination" || completedStep === "ballon_dor_ranking") {
      if (completedStep === "ballon_dor_nomination") {
        setBallonDorResult({ phase: "nomination", nominated: result === "yes" });
      } else if (typeof result === "number" && result >= 1 && result <= 10) {
        setBallonDorResult({ phase: "ranking", rank: result });
        // The stat flow moves to the next step in the same callback. Lock the
        // whole draft surface before that state can render, otherwise users
        // can click the development wheel while the result route is opening.
        setIsBallonDorTransitioning(true);
      }
      if (result !== null) {
        statFlow.handleSpinComplete(completedStep, result, pendingStats?.currentStats, pendingStats?.currentOvr);
        if (completedStep === "ballon_dor_nomination") setActiveModal("ballon_dor_nomination");
      }
      return;
    }
    if (COMPETITION_STEPS.has(completedStep)) {
      if (result !== null) {
        competitionFlow.handleSpinComplete(completedStep, result, authoritativeNextStep);
      }
    } else {
      if (result !== null) {
        statFlow.handleSpinComplete(
          completedStep,
          result,
          pendingStats?.currentStats,
          pendingStats?.currentOvr,
        );
      }
    }
  }

  return { handleCareerSpin, handleCareerSpinComplete };
}
