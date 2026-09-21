"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSetupStage } from "./useSetupStage";
import { useCareerStats } from "./useCareerStats";
import { useCareerWheelItems } from "./useCareerWheelItems";
import { useCompetitionFlow } from "./useCompetitionFlow";
import { useStatEvolutionFlow } from "./useStatEvolutionFlow";
import { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import { getStepLabels } from "@/types/game";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import {
  isShopItemActiveForSeason,
} from "@/lib/shop-catalog";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type { ContractOfferCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { CareerSubStep, ClubSummary, LeagueSummary } from "@/types/domain";
import { useDraftDrumHydration } from "./useDraftDrumHydration";
import { useDraftDrumTransferFlow } from "./useDraftDrumTransferFlow";
import { useDraftDrumPersistence } from "./useDraftDrumPersistence";
import { useDraftDrumWheelFlow } from "./useDraftDrumWheelFlow";
import { useDraftDrumAdvanceSeason } from "./useDraftDrumAdvanceSeason";
import { useDraftDrumStartFlow } from "./useDraftDrumStartFlow";
import { useDraftDrumNavigation } from "./useDraftDrumNavigation";
import { emptyUnemployedSeasonResult } from "./empty-unemployed-season-result";
import { getPriorClubStanding } from "../lib/previous-season-standing";



export type ModalType = "league" | "cup" | "continental" | "national" | "ballon_dor_nomination" | "season_stats" | "season_recap" | "transfer" | "shop" | null;

export type BallonDorResult =
  | { phase: "nomination"; nominated: boolean }
  | { phase: "ranking"; rank: number };

export function useDraftDrum(
  gameId: string,
  slotIndex: number,
  position: string,
  leagues: LeagueSummary[],
  clubs: ClubSummary[],
  savedPlayerId?: string,
  savedContinentalCup?: string,
  initialMode: "setup" | "career" | "retired" = "setup"
) {
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<"setup" | "career" | "retired">(initialMode);

  const { resetDraft } = useWheelUiStore();
  const setupProps = useSetupStage({ position, leagues, clubs, isMounted, mode });
  const statsProps = useCareerStats({ gameId, slotIndex, position });

  const {
    playerId, playerName, hiddenStats, statsTimeline, clubStints, achievements,
    playerNationality, playerDebutAge, playerCareerLength,
    currentAge, currentOvr, currentStats, currentClub,
    currentContinentalCup, seasonRecords,
    selectedAgeForStats, setSelectedAgeForStats, shopInventory,
  } = statsProps;
  const checkpointSync = useCareerCheckpointSync();
  const priorClubStanding = useMemo(
    () => getPriorClubStanding(
      seasonRecords,
      currentAge,
      playerDebutAge,
      currentClub?.id,
      currentClub?.leagueId,
    ),
    [seasonRecords, currentAge, playerDebutAge, currentClub?.id, currentClub?.leagueId],
  );

  const fitnessCoachActive = isShopItemActiveForSeason(shopInventory, "fitness_coach", currentAge);
  const nationalCallupBoostActive = isShopItemActiveForSeason(
    shopInventory, "national_callup_boost", currentAge,
  );
  const eliteDevelopmentActive = isShopItemActiveForSeason(
    shopInventory, "elite_development_program", currentAge,
  );

  const tempCareerResultRef = useRef<string | number | null>(null);
  const activeSpinStepRef = useRef<CareerSubStep | null>(null);
  const activeSpinNextStepRef = useRef<CareerSubStep | null>(null);
  const pendingCheckpointStatsRef = useRef<{
    currentStats: Record<string, number>;
    currentOvr: number;
  } | null>(null);

  const [careerSubStep, setCareerSubStep] = useState<CareerSubStep>("idle");
  const [careerSpinning, setCareerSpinning] = useState(false);
  const [careerTargetIndex, setCareerTargetIndex] = useState<number>(-1);

  const [yearEvolution, setYearEvolution] = useState<{
    direction: "increase" | "decrease" | "maintain" | null;
    count: number | null;
  }>({ direction: null, count: null });

  const [selectorIndex, setSelectorIndex] = useState(0);
  const [selectedStatsList, setSelectedStatsList] = useState<string[]>([]);
  const [tempSelectedStat, setTempSelectedStat] = useState<string | null>(null);
  const [evolvedStatsThisYear, setEvolvedStatsThisYear] = useState<{ stat: string; delta: number }[]>([]);

  const [standingResult, setStandingResult] = useState<number | null>(null);
  const [domesticCupResult, setDomesticCupResult] = useState<string | null>(null);
  const [continentalCupResult, setContinentalCupResult] = useState<string | null>(null);
  const [nationalCallupResult, setNationalCallupResult] = useState<string | null>(null);
  const [nationalTournamentResult, setNationalTournamentResult] = useState<string | null>(null);

  const [yearSimResult, setYearSimResult] = useState<SimulatedSeasonResult | null>(null);
  const [transferOffer, setTransferOffer] = useState<ContractOfferCard | null>(null);
  const [transferMarket, setTransferMarket] = useState<TransferMarketResult | null>(null);
  const [willingToMove, setWillingToMove] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);
  const [approachRejects, setApproachRejects] = useState<ApproachRejectState>({});
  const [approachBanner, setApproachBanner] = useState<string | null>(null);
  const [proactiveRenewalRejectedAge, setProactiveRenewalRejectedAge] = useState<number | null>(null);
  const proactiveRenewalInFlightRef = useRef(false);
  const transferCommandKeyRef = useRef<string | null>(null);
  const shopCommandKeysRef = useRef(new Map<string, string>());
  const [hasBallonDorWinner, setHasBallonDorWinner] = useState(false);
  const [ballonDorRank, setBallonDorRank] = useState<number | null>(null);
  const [ballonDorNominationWeight, setBallonDorNominationWeight] = useState(0);
  const [ballonDorRankWeights, setBallonDorRankWeights] = useState<number[]>([]);
  const [ballonDorResult, setBallonDorResult] = useState<BallonDorResult | null>(null);
  const [isBallonDorTransitioning, setIsBallonDorTransitioning] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [startCareerError, setStartCareerError] = useState<string | null>(null);

  // Đại diện cho toàn bộ khoảng thời gian từ lúc bấm 1 hành động (spin/transfer/
  // next season/start career) đến khi state thực sự ổn định — BAO GỒM cả server
  // action đứng sau, không chỉ animation. Đây là guard duy nhất chặn double-click
  // trong lúc network đang xử lý (careerSpinning chỉ đại diện cho animation quay,
  // tắt trước khi server action tương ứng resolve).
  const [isProcessing, setIsProcessing] = useState(false);

  const { careerWheelItems } = useCareerWheelItems({
    careerSubStep, isMounted, mode, currentContinentalCup, currentAge,
    playerDebutAge, playerCareerLength,
    playerNationality, currentClub, currentOvr,
    leagueSize: currentClub ? (clubs.filter((c) => c.leagueId === currentClub.leagueId).length || 10) : 10,
    priorClubStanding, standingResult,
    selectedStatsList, position, yearSimResult, selectorIndex,
    yearEvolutionDirection: yearEvolution.direction, currentStats,
    ballonDorNominationWeight, ballonDorRankWeights,
    luckRating: hiddenStats?.luckRating ?? 10,
    fitnessCoachActive,
    nationalCallupBoostActive,
    eliteDevelopmentActive,
  });

  const competitionFlow = useCompetitionFlow({
    playerId,
    currentAge, currentOvr, position, currentClub: currentClub!, currentContinentalCup,
    playerNationality, playerDebutAge, hiddenStats, currentStats,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, yearSimResult,
    setStandingResult, setDomesticCupResult, setContinentalCupResult,
    setNationalCallupResult, setNationalTournamentResult,
    setCareerSubStep, setIsProcessing, setActiveModal, setYearSimResult,
    setApproachBanner,
    setBallonDorNominationWeight, setBallonDorRankWeights,
    applySimResultToRecords: statsProps.applySimResultToRecords,
    setSeasonRecords: statsProps.setSeasonRecords,
    checkNationalCallupTransition: statsProps.checkNationalCallupTransition,
    commitSeasonStats: checkpointSync.isEnabled ? checkpointSync.commitSeasonStats : undefined,
  });

  const statFlow = useStatEvolutionFlow({
    currentStats, currentClub, currentOvr, position,
    currentAge, playerDebutAge, playerCareerLength,
    yearSimResult,
    yearEvolution, selectorIndex, tempSelectedStat, evolvedStatsThisYear,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, nationalTournamentResult, ballonDorRank,
    contractYearsRemaining: statsProps.contractYearsRemaining,
    contractYearsTotal: statsProps.contractYearsTotal,
    currentWageAnnual: statsProps.currentWageAnnual,
    willingToMove,
    isUnemployed: statsProps.isUnemployed,
    playerId: checkpointSync.state.playerId,
    seasonId: checkpointSync.state.seasonId,
    revision: checkpointSync.state.revision,
    checkpointVersion: checkpointSync.state.checkpointVersion,
    clubs,
    influenceScore: statsProps.influenceScore,
    setYearEvolution, setSelectorIndex, setTempSelectedStat,
    setSelectedStatsList, setEvolvedStatsThisYear,
    setCareerSubStep, setIsProcessing, setTransferOffer,
    setTransferMarket,
    setMarketValue: statsProps.setMarketValue,
    setBallonDorRank,
    setHasBallonDorWinner,
    setCurrentStats: statsProps.setCurrentStats,
    setCurrentOvr: statsProps.setCurrentOvr,
    setStatsTimeline: statsProps.setStatsTimeline,
    serverAuthoritativeGrowth: checkpointSync.isEnabled,
  });

  const prevAgeRef = useRef<number | null>(null);
  const autoStartSeasonRef = useRef(false);

  // Career resume on mount
  useDraftDrumHydration({
    savedPlayerId,
    savedContinentalCup,
    initialMode,
    position,
    clubs,
    statsProps,
    checkpointSync,
    resetDraft,
    setMode,
    setIsMounted,
    setCareerSubStep,
    setStandingResult,
    setDomesticCupResult,
    setContinentalCupResult,
    setNationalCallupResult,
    setNationalTournamentResult,
    setYearEvolution,
    setSelectorIndex,
    setSelectedStatsList,
    setEvolvedStatsThisYear,
    setBallonDorNominationWeight,
    setBallonDorRankWeights,
    setYearSimResult,
    setActiveModal: (value) => setActiveModal(value),
    prevAgeRef,
    autoStartSeasonRef,
  });

  const persistence = useDraftDrumPersistence({
    statsProps,
    checkpointSync,
    mode,
    currentAge,
    currentClub,
    currentContinentalCup,
    playerNationality,
    careerSubStep,
    playerDebutAge,
    playerCareerLength,
    statsTimeline,
    clubStints,
    achievements,
    seasonRecords,
    isProcessing,
    shopCommandKeysRef,
    prevAgeRef,
    setIsProcessing,
    setSelectedAgeForStats,
  });
  const { isFinalCareerSeason, shopTargetSeason, persistCurrentProgress, handlePurchaseShopItem } = persistence;

  const transferFlow = useDraftDrumTransferFlow({
    statsProps,
    checkpointSync,
    statFlow,
    clubs,
    position,
    currentStats,
    currentOvr,
    currentAge,
    currentClub,
    playerDebutAge,
    playerCareerLength,
    yearSimResult,
    transferOffer,
    transferMarket,
    isProcessing,
    careerSubStep,
    approachRejects,
    proactiveRenewalRejectedAge,
    transferCommandKeyRef,
    proactiveRenewalInFlightRef,
    setIsProcessing,
    setApproachBanner,
    setTransferOffer,
    setTransferMarket,
    setShowShortlist,
    setApproachRejects,
    setWillingToMove,
    setCareerSubStep,
    setProactiveRenewalRejectedAge,
  });


  const applyAuthoritativeSeasonTicket = useCallback((ticket: string) => {
    statsProps.setCurrentContinentalCup(ticket);
    statsProps.setCurrentClub((club) => club ? { ...club, continentalType: ticket } : club);
    statsProps.setSeasonRecords((prev) => {
      const existing = prev[currentAge];
      if (!existing) return prev;
      const sameTicket = existing.continentalCup?.type === ticket;
      const continentalCup = ticket === "none"
        ? null
        : {
            ...(existing.continentalCup ?? {}),
            type: ticket,
            result: sameTicket ? existing.continentalCup?.result ?? "Chờ quay" : "Chờ quay",
          };
      const existingType = existing.continentalCup?.type ?? "none";
      const existingResult = existing.continentalCup?.result ?? null;
      const nextResult = continentalCup?.result ?? null;
      if (existingType === ticket && existingResult === nextResult) return prev;
      const nextRecord = { ...existing, continentalCup };
      if (!sameTicket) {
        delete nextRecord.continentalCupJourney;
        delete nextRecord.continentalStats;
      }
      return {
        ...prev,
        [currentAge]: nextRecord,
      };
    });
  }, [currentAge, statsProps]);

  const startFlow = useDraftDrumStartFlow({
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
    state: {
      setYearEvolution,
      setSelectorIndex,
      setSelectedStatsList,
      setTempSelectedStat,
      setEvolvedStatsThisYear,
      setStandingResult,
      setDomesticCupResult,
      setContinentalCupResult,
      setNationalCallupResult,
      setNationalTournamentResult,
      setYearSimResult,
      setHasBallonDorWinner,
      setBallonDorRank,
      setBallonDorNominationWeight,
      setBallonDorRankWeights,
      setBallonDorResult,
      setIsBallonDorTransitioning,
      setActiveModal,
      setIsProcessing,
      setStartCareerError,
      setMode,
      setCareerSubStep,
      setTransferOffer,
      setTransferMarket,
      setWillingToMove,
      setApproachRejects,
      setApproachBanner,
    },
    refs: {
      transferCommandKeyRef,
      activeSpinStepRef,
      activeSpinNextStepRef,
      tempCareerResultRef,
      autoStartSeasonRef,
    },
  });
  const { resetSeasonState, handleStartCareer, handleStartSeason } = startFlow;

  const wheelFlow = useDraftDrumWheelFlow({
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
    leagueSize: currentClub ? (clubs.filter((c) => c.leagueId === currentClub.leagueId).length || 10) : 10,
    priorClubStanding,
    standingResult,
    currentContinentalCup,
    playerNationality,
    selectedStatsList,
    selectorIndex,
    yearEvolutionDirection: yearEvolution.direction,
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
  });

  const seasonAdvance = useDraftDrumAdvanceSeason({
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
  });
  const { advanceToNextSeason } = seasonAdvance;

  const navigation = useDraftDrumNavigation({
    isProcessing,
    shopTargetSeason,
    careerSubStep,
    isFinalCareerSeason,
    setActiveModal,
    handleStartSeason,
    advanceToNextSeason,
  });
  const {
    handleNextSeason,
    handleContinueFromShop,
    handleShopReturn,
    handleTransferReturn,
  } = navigation;

  return {
    isMounted, isSaving: statsProps.isSaving, mode, setMode,
    wheelItems: setupProps.wheelItems, targetIndex: setupProps.targetIndex,
    tempValue: setupProps.tempValue, activeStep: setupProps.activeStep,
    isSpinning: setupProps.isSpinning, draftData: setupProps.draftData,
    playerName, hiddenStats, statsTimeline, clubStints,
    playerNationality, playerDebutAge, playerCareerLength,
    currentAge, currentOvr, currentStats, currentClub, currentContinentalCup,
    priorClubStanding, seasonRecords, selectedAgeForStats, setSelectedAgeForStats,
    activeModal, setActiveModal, careerSubStep, setCareerSubStep,
    isProcessing, isBallonDorTransitioning,
    seasonTicketResolved: !checkpointSync.isEnabled || checkpointSync.state.seasonContinentalCup !== null,
    startCareerError,
    careerSpinning, careerWheelItems, careerTargetIndex,
    yearEvolution, evolvedStatsThisYear,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, nationalTournamentResult,
    yearSimResult, transferOffer, transferMarket, willingToMove, showShortlist,
    approachRejects, approachBanner,
    proactiveRenewalRejected: proactiveRenewalRejectedAge === currentAge,
    hasBallonDorWinner,
    ballonDorResult,
    isUnemployed: statsProps.isUnemployed,
    contractYearsTotal: statsProps.contractYearsTotal,
    contractYearsRemaining: statsProps.contractYearsRemaining,
    currentWageAnnual: statsProps.currentWageAnnual,
    marketValue: statsProps.marketValue,
    walletBalance: statsProps.walletBalance,
    influenceScore: statsProps.influenceScore,
    shopInventory: statsProps.shopInventory,
    shopTargetSeason,
    handlePurchaseShopItem,
    careerTotalStats: statsProps.careerTotalStats,
    peakOvrValue: statsProps.peakOvrValue,
    activeRecord: statsProps.activeRecord,
    handleSetupSpin: setupProps.handleSetupSpin,
    handleSetupSpinComplete: setupProps.handleSetupSpinComplete,
    handleStartCareer, handleStartSeason,
    handleCareerSpin: wheelFlow.handleCareerSpin,
    handleCareerSpinComplete: wheelFlow.handleCareerSpinComplete,
    handleAcceptTransfer: transferFlow.handleAcceptTransfer,
    handleAcceptMarketOffer: transferFlow.handleAcceptMarketOffer,
    clearPendingTransferOffer: transferFlow.clearPendingTransferOffer,
    handleRejectTransferWindow: transferFlow.handleRejectTransferWindow,
    handleApproachShortlist: transferFlow.handleApproachShortlist,
    handleProactiveRenewal: transferFlow.handleProactiveRenewal,
    handleSearchClubs: transferFlow.handleSearchClubs,
    handleSetWillingToMove: transferFlow.handleSetWillingToMove,
    setShowShortlist, handleNextSeason, handleContinueFromShop, handleShopReturn, handleTransferReturn,
    persistCurrentProgress,
    handleSeasonStatsModalClose: competitionFlow.handleSeasonStatsModalClose,
    handleCompetitionResultModalClose: competitionFlow.handleCompetitionResultModalClose,
    handleSavePlayer: statsProps.handleSavePlayer,
    STEP_LABELS: getStepLabels(position),
    selectorIndex, tempSelectedStat,
  };
}
