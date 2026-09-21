"use client";

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { startPlayerCareerAction } from "@/actions/season.actions";
import { initCareerPlayerAction } from "@/actions/player.actions";
import type { CareerSubStep, ClubSummary } from "@/types/domain";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { ContractOfferCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type { useSetupStage } from "./useSetupStage";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";

type SetupController = ReturnType<typeof useSetupStage>;
type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;
type DraftMode = "setup" | "career" | "retired";
type ModalType = "league" | "cup" | "continental" | "national" | "ballon_dor_nomination" | "season_stats" | "season_recap" | "transfer" | "shop" | null;
type BallonDorResult = { phase: "nomination"; nominated: boolean } | { phase: "ranking"; rank: number };
type YearEvolution = { direction: "increase" | "decrease" | "maintain" | null; count: number | null };
type EvolvedStat = { stat: string; delta: number };

interface StartFlowState {
  setYearEvolution: Dispatch<SetStateAction<YearEvolution>>;
  setSelectorIndex: Dispatch<SetStateAction<number>>;
  setSelectedStatsList: Dispatch<SetStateAction<string[]>>;
  setTempSelectedStat: Dispatch<SetStateAction<string | null>>;
  setEvolvedStatsThisYear: Dispatch<SetStateAction<EvolvedStat[]>>;
  setStandingResult: Dispatch<SetStateAction<number | null>>;
  setDomesticCupResult: Dispatch<SetStateAction<string | null>>;
  setContinentalCupResult: Dispatch<SetStateAction<string | null>>;
  setNationalCallupResult: Dispatch<SetStateAction<string | null>>;
  setNationalTournamentResult: Dispatch<SetStateAction<string | null>>;
  setYearSimResult: Dispatch<SetStateAction<SimulatedSeasonResult | null>>;
  setHasBallonDorWinner: Dispatch<SetStateAction<boolean>>;
  setBallonDorRank: Dispatch<SetStateAction<number | null>>;
  setBallonDorNominationWeight: Dispatch<SetStateAction<number>>;
  setBallonDorRankWeights: Dispatch<SetStateAction<number[]>>;
  setBallonDorResult: Dispatch<SetStateAction<BallonDorResult | null>>;
  setIsBallonDorTransitioning: Dispatch<SetStateAction<boolean>>;
  setActiveModal: Dispatch<SetStateAction<ModalType>>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setStartCareerError: Dispatch<SetStateAction<string | null>>;
  setMode: Dispatch<SetStateAction<DraftMode>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
  setTransferOffer: Dispatch<SetStateAction<ContractOfferCard | null>>;
  setTransferMarket: Dispatch<SetStateAction<TransferMarketResult | null>>;
  setWillingToMove: Dispatch<SetStateAction<boolean>>;
  setApproachRejects: Dispatch<SetStateAction<ApproachRejectState>>;
  setApproachBanner: Dispatch<SetStateAction<string | null>>;
}

interface StartFlowRefs {
  transferCommandKeyRef: MutableRefObject<string | null>;
  activeSpinStepRef: MutableRefObject<CareerSubStep | null>;
  activeSpinNextStepRef: MutableRefObject<CareerSubStep | null>;
  tempCareerResultRef: MutableRefObject<string | number | null>;
  autoStartSeasonRef: MutableRefObject<boolean>;
}

export interface DraftDrumStartFlowProps {
  gameId: string;
  slotIndex: number;
  position: string;
  clubs: ClubSummary[];
  setupProps: SetupController;
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  mode: DraftMode;
  isProcessing: boolean;
  currentAge: number;
  currentClub: StatsController["currentClub"];
  emptyUnemployedSeasonResult: () => SimulatedSeasonResult;
  applyAuthoritativeSeasonTicket: (ticket: string) => void;
  state: StartFlowState;
  refs: StartFlowRefs;
}

export function useDraftDrumStartFlow({
  gameId,
  slotIndex,
  position,
  clubs,
  setupProps,
  statsProps,
  checkpointSync,
  mode,
  isProcessing,
  currentAge,
  currentClub,
  emptyUnemployedSeasonResult,
  applyAuthoritativeSeasonTicket,
  state,
  refs,
}: DraftDrumStartFlowProps) {
  const {
    setYearEvolution, setSelectorIndex, setSelectedStatsList, setTempSelectedStat,
    setEvolvedStatsThisYear, setStandingResult, setDomesticCupResult,
    setContinentalCupResult, setNationalCallupResult, setNationalTournamentResult,
    setYearSimResult, setHasBallonDorWinner, setBallonDorRank,
    setBallonDorNominationWeight, setBallonDorRankWeights, setBallonDorResult,
    setIsBallonDorTransitioning, setActiveModal, setIsProcessing, setStartCareerError,
    setMode, setCareerSubStep, setTransferOffer, setTransferMarket,
    setWillingToMove, setApproachRejects, setApproachBanner,
  } = state;
  const {
    transferCommandKeyRef, activeSpinStepRef, activeSpinNextStepRef,
    tempCareerResultRef, autoStartSeasonRef,
  } = refs;
  function resetSeasonState() {
    transferCommandKeyRef.current = null;
    activeSpinStepRef.current = null;
    activeSpinNextStepRef.current = null;
    tempCareerResultRef.current = null;
    setYearEvolution({ direction: null, count: null });
    setSelectorIndex(0); setSelectedStatsList([]); setTempSelectedStat(null); setEvolvedStatsThisYear([]);
    setStandingResult(null); setDomesticCupResult(null); setContinentalCupResult(null);
    setNationalCallupResult(null); setNationalTournamentResult(null); setYearSimResult(null);
    setHasBallonDorWinner(false);
    setBallonDorRank(null); setBallonDorNominationWeight(0); setBallonDorRankWeights([]);
    setBallonDorResult(null);
    setIsBallonDorTransitioning(false);
    setActiveModal(null);
    setIsProcessing(false);
  }

  async function handleStartCareer() {
    if (isProcessing) return;
    setIsProcessing(true);
    setStartCareerError(null);
    try {
      const draftData = setupProps.draftData;
      const requiredDraftFields = [
        draftData.nationality,
        draftData.debutAge,
        draftData.height,
        draftData.weight,
        draftData.careerLength,
        draftData.leagueId,
        draftData.leagueName,
        draftData.clubId,
        draftData.clubName,
      ];
      if (requiredDraftFields.some((value) => value === null || value === undefined || value === "")) {
        throw new Error("Bản draft chưa hoàn tất. Hãy quay đủ các vòng trước khi bắt đầu sự nghiệp.");
      }

      const initPayload = await startPlayerCareerAction({
        ...draftData,
        gameId,
        slotIndex,
        position,
      });
      const selectedClub = clubs.find((c) => c.id === draftData.clubId);
      const initialContinentalCup = selectedClub?.continentalType ?? "none";
      const debutOvr = initPayload.debutOvr;

      const initResult = await initCareerPlayerAction({
        gameId, slotIndex, position, name: initPayload.playerName,
        nationality: draftData.nationality, debutAge: draftData.debutAge,
        careerLength: draftData.careerLength, debutOvr,
        height: draftData.height, weight: draftData.weight,
        preferredFoot: initPayload.preferredFoot,
        currentContinentalCup: initialContinentalCup,
        statsTimeline: initPayload.initTimeline, clubStints: [initPayload.initStint],
        setupToken: initPayload.setupToken,
        contractYearsTotal: initPayload.contractYearsTotal,
        contractYearsRemaining: initPayload.contractYearsRemaining,
        currentWageAnnual: initPayload.currentWageAnnual,
        marketValue: initPayload.marketValue,
      });
      const { id } = initResult;

      checkpointSync.attach({
        playerId: id,
        revision: 0,
        checkpointVersion: initResult.checkpointVersion,
        currentAge: draftData.debutAge!,
        currentStep: "idle",
        currentWheel: "career",
      });
      statsProps.setPlayerId(id);
      statsProps.handleStartCareer(draftData, initPayload, clubs);
      resetSeasonState(); setTransferOffer(null); setTransferMarket(null); setWillingToMove(false);
      setMode("career"); setCareerSubStep("idle");
    } catch (err) {
      console.error("Error starting career:", err);
      setStartCareerError(
        err instanceof Error && err.message
          ? err.message
          : "Không thể bắt đầu sự nghiệp lúc này. Vui lòng thử lại.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const handleStartSeason = useCallback(async () => {
    if (isProcessing) return;
    let serverStep: CareerSubStep | null = null;
    if (checkpointSync.isEnabled) {
      setIsProcessing(true);
      try {
        const started = await checkpointSync.startSeason();
        serverStep = (started?.currentStep ?? null) as CareerSubStep | null;
        if (typeof started?.seasonContinentalCup === "string") {
          applyAuthoritativeSeasonTicket(started.seasonContinentalCup);
        }
      } catch (error) {
        console.error("Career season start failed:", error);
        setApproachBanner("Không thể bắt đầu mùa giải — hãy thử lại");
        setIsProcessing(false);
        return;
      }
    }

    setSelectorIndex(0); setSelectedStatsList([]); setTempSelectedStat(null); setEvolvedStatsThisYear([]);
    setApproachRejects({});
    setApproachBanner(null);

    if (statsProps.isUnemployed || !currentClub) {
      const stub = emptyUnemployedSeasonResult();
      setYearSimResult(stub);
      setStandingResult(null);
      setDomesticCupResult(null);
      setContinentalCupResult(null);
      setNationalCallupResult(null);
      setNationalTournamentResult(null);
      statsProps.applySimResultToRecords(currentAge, stub);
      statsProps.setSeasonRecords((prev) => ({
        ...prev,
        [currentAge]: {
          ...(prev[currentAge] ?? {
            age: currentAge,
            clubName: "Không CLB",
            leagueName: "Thất nghiệp",
            standing: null,
            domesticCup: null,
            continentalCup: null,
            nationalTeam: null,
          }),
          age: currentAge,
          clubName: "Không CLB",
          leagueName: "Thất nghiệp",
          standing: null,
          domesticCup: null,
          continentalCup: null,
          nationalTeam: null,
          apps: 0,
          goals: 0,
          assists: 0,
          matchRating: 6.0,
        },
      }));
      setCareerSubStep(serverStep ?? "dir_increase");
      setIsProcessing(false);
      return;
    }

    setCareerSubStep(serverStep ?? "standing");
    setIsProcessing(false);
  // The state facade and checkpoint controller are intentionally treated as
  // stable orchestration dependencies; individual setters are not meaningful
  // season-start boundaries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAuthoritativeSeasonTicket, checkpointSync, currentAge, currentClub, isProcessing, statsProps]);

  useEffect(() => {
    // The season transition updates currentAge before the async transition
    // handler releases isProcessing. If this effect consumed the flag during
    // that intermediate render, handleStartSeason would return immediately
    // and the new season would remain at the idle Shop gate forever.
    if (!autoStartSeasonRef.current || mode !== "career" || isProcessing) return;
    autoStartSeasonRef.current = false;
    void handleStartSeason();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge, handleStartSeason, isProcessing, mode]);
  return { resetSeasonState, handleStartCareer, handleStartSeason };
}
