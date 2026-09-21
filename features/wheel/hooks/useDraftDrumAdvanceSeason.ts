"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { getCareerPlayerAction } from "@/actions/player.actions";
import type { SeasonRecord } from "@/types/game";
import type { ClubStint, CareerSubStep, StatSnapshot } from "@/types/domain";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;
type DraftMode = "setup" | "career" | "retired";

interface ResumeCareerPlayer {
  peakOvr?: number;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: StatsController["achievements"];
  seasonHistory?: Record<string, SeasonRecord>;
}

export interface DraftDrumAdvanceSeasonProps {
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  careerSubStep: CareerSubStep;
  isProcessing: boolean;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  nationalTournamentResult: string | null;
  yearSimResult: SimulatedSeasonResult | null;
  ballonDorRank: number | null;
  autoStartSeasonRef: MutableRefObject<boolean>;
  resetSeasonState: () => void;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setApproachBanner: Dispatch<SetStateAction<string | null>>;
  setMode: Dispatch<SetStateAction<DraftMode>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
}

export function useDraftDrumAdvanceSeason({
  statsProps,
  checkpointSync,
  careerSubStep,
  isProcessing,
  standingResult,
  domesticCupResult,
  continentalCupResult,
  nationalCallupResult,
  nationalTournamentResult,
  yearSimResult,
  ballonDorRank,
  autoStartSeasonRef,
  resetSeasonState,
  setIsProcessing,
  setApproachBanner,
  setMode,
  setCareerSubStep,
}: DraftDrumAdvanceSeasonProps) {
  async function advanceToNextSeason(
    autoStart = false,
    shopDecision: "completed" | "skipped" = "completed",
  ) {
    const canAdvanceFromCompletedSeason = ["resolved", "transfer"].includes(careerSubStep);
    const isHydratedModuleReturn = autoStart && careerSubStep === "idle";
    if (isProcessing || (!canAdvanceFromCompletedSeason && !isHydratedModuleReturn)) return;
    if (autoStart) autoStartSeasonRef.current = true;
    setIsProcessing(true);
    let serverTransition: Awaited<ReturnType<typeof checkpointSync.advanceSeason>> | null = null;
    if (checkpointSync.isEnabled) {
      try {
        serverTransition = await checkpointSync.advanceSeason(shopDecision);
      } catch (error) {
        console.error("Career season transition failed:", error);
        autoStartSeasonRef.current = false;
        setApproachBanner("Không thể chốt mùa giải — hãy thử lại.");
        setIsProcessing(false);
        return;
      }
    }
    const { isRetire } = statsProps.handleNextSeason(
      standingResult, domesticCupResult, continentalCupResult,
      nationalCallupResult, nationalTournamentResult, yearSimResult, ballonDorRank,
    );
    // The server is authoritative for projection fields that must survive a
    // refresh. Keep the local state aligned for the current tab as well; this
    // does not alter wheel timing or the visible season flow.
    if (serverTransition) {
      if (typeof serverTransition.currentContinentalCup === "string") {
        statsProps.setCurrentContinentalCup(serverTransition.currentContinentalCup);
      }
      if (typeof serverTransition.contractYearsRemaining === "number") {
        statsProps.setContractYearsRemaining(serverTransition.contractYearsRemaining);
      }
      if (typeof serverTransition.walletBalance === "number") {
        statsProps.setWalletBalance(serverTransition.walletBalance);
      }
      if (typeof serverTransition.peakOvr === "number") {
        statsProps.setPeakOvr(serverTransition.peakOvr);
      }
      if (Array.isArray(serverTransition.statsTimeline)) {
        statsProps.setStatsTimeline(serverTransition.statsTimeline as StatSnapshot[]);
      }
      if (Array.isArray(serverTransition.clubStints)) {
        statsProps.setClubStints(serverTransition.clubStints as ClubStint[]);
      }
    }
    const serverRetired = serverTransition?.isRetired === true;
    if (serverRetired && statsProps.playerId) {
      // The transition transaction is the source of truth for the final
      // record. Re-read the player once so totals, achievements, timeline and
      // repaired club boundaries shown in the current tab match the committed
      // DB row instead of a stale local snapshot.
      try {
        const persisted = await getCareerPlayerAction({ playerId: statsProps.playerId });
        const record = persisted as unknown as ResumeCareerPlayer;
        statsProps.setStatsTimeline(record.statsTimeline);
        statsProps.setClubStints(record.clubStints);
        statsProps.setPeakOvr(record.peakOvr ?? 1);
        statsProps.setAchievements(record.achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] });
        if (record.seasonHistory) {
          const persistedRecords: Record<number, SeasonRecord> = {};
          for (const [age, value] of Object.entries(record.seasonHistory)) {
            persistedRecords[Number(age)] = value;
          }
          statsProps.setSeasonRecords(persistedRecords);
        }
      } catch (error) {
        console.error("Final career summary hydration failed:", error);
      }
    }
    if (isRetire || serverRetired) {
      autoStartSeasonRef.current = false;
      setMode("retired");
    } else {
      resetSeasonState();
      setCareerSubStep("idle");
    }
    setIsProcessing(false);
  }
  return { advanceToNextSeason };
}
