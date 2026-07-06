"use client";

import { useEffect, useState } from "react";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { getNationalContinentalCup, getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import {
  calculateContinentalQualification,
  getContinentalCupLabel,
  getSeasonYearString,
} from "../lib/simulation-helpers";
import { getCareerWheelPoolAndValue } from "../lib/career-wheel-resolver";
import { useSetupStage } from "./useSetupStage";
import { useCareerStats } from "./useCareerStats";
import { useCareerWheelItems } from "./useCareerWheelItems";
import { 
  simulatePlayerSeasonAction, 
  generateLeagueTableAction, 
  startPlayerCareerAction,
  generateTransferOfferAction,
  generateCupJourneyAction,
  evolvePlayerStatsAction
} from "@/actions/season.actions";
import { type SeasonRecord, STEP_LABELS } from "@/types/game";

export function useDraftDrum(
  gameId: string,
  slotIndex: number,
  position: string,
  leagues: any[],
  clubs: any[]
) {
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<"setup" | "career" | "retired">("setup");

  const setupProps = useSetupStage({ position, leagues, clubs, isMounted, mode });
  const statsProps = useCareerStats({ gameId, slotIndex, position });

  const {
    playerName,
    hiddenStats,
    statsTimeline,
    clubStints,
    events,
    playerNationality,
    playerDebutAge,
    playerCareerLength,
    currentAge,
    currentOvr,
    currentStats,
    currentClub,
    currentContinentalCup,
    lastYearStanding,
    seasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    isLeagueOpen,
    setIsLeagueOpen,
    isCupOpen,
    setIsCupOpen,
    isContinentalOpen,
    setIsContinentalOpen,
    isNationalOpen,
    setIsNationalOpen,
  } = statsProps;

  const [careerSubStep, setCareerSubStep] = useState<
    "idle" | "dir_increase" | "dir_decrease" | "count" | "selector" | "magnitude" | "standing" | "domestic_cup" | "continental_cup" | "national_callup" | "national_tournament" | "transfer" | "resolved"
  >("idle");
  const [careerSpinning, setCareerSpinning] = useState(false);
  const [careerTargetIndex, setCareerTargetIndex] = useState<number>(-1);
  const [careerTempValue, setCareerTempValue] = useState<string | null>(null);

  const [yearEvolution, setYearEvolution] = useState<{
    direction: "increase" | "decrease" | "maintain" | null;
    count: number | null;
  }>({ direction: null, count: null });

  const [selectorIndex, setSelectorIndex] = useState<number>(0);
  const [selectedStatsList, setSelectedStatsList] = useState<string[]>([]);
  const [tempSelectedStat, setTempSelectedStat] = useState<string | null>(null);
  const [evolvedStatsThisYear, setEvolvedStatsThisYear] = useState<{ stat: string; delta: number }[]>([]);

  const [standingResult, setStandingResult] = useState<number | null>(null);
  const [domesticCupResult, setDomesticCupResult] = useState<string | null>(null);
  const [continentalCupResult, setContinentalCupResult] = useState<string | null>(null);
  const [nationalCallupResult, setNationalCallupResult] = useState<string | null>(null);
  const [nationalTournamentResult, setNationalTournamentResult] = useState<string | null>(null);

  const [yearSimResult, setYearSimResult] = useState<SimulatedSeasonResult | null>(null);
  const [transferOffer, setTransferOffer] = useState<{ clubId: string; clubName: string; leagueId: string; leagueName: string } | null>(null);
  const [hasBallonDorWinner, setHasBallonDorWinner] = useState(false);

  const { careerWheelItems } = useCareerWheelItems({
    careerSubStep,
    isMounted,
    mode,
    currentContinentalCup,
    currentAge,
    playerNationality,
    currentClub,
    currentOvr,
    leagueSize: currentClub ? (clubs.filter((c: any) => c.leagueId === currentClub.leagueId).length || 10) : 10,
    selectedStatsList,
    position,
    yearSimResult,
    selectorIndex,
  });

  useEffect(() => {
    setIsMounted(true);
    setMode("setup");
  }, []);

  useEffect(() => {
    if (mode === "career" && currentClub) {
      statsProps.setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        const currentYear = 2026 + (currentAge - playerDebutAge);
        return {
          ...prev,
          [currentAge]: {
            age: currentAge,
            clubName: currentClub.name,
            leagueName: currentClub.leagueName,
            standing: null,
            domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? {
              type: currentYear % 4 === 2 ? "FIFA World Cup" : getNationalContinentalCup(playerNationality),
              callup: "Chờ gọi",
              result: null
            } : null,
          }
        };
      });
      setSelectedAgeForStats(currentAge);
    }
  }, [currentAge, mode, currentClub, currentContinentalCup, playerNationality, playerDebutAge]);

  function resetSeasonState() {
    setYearEvolution({ direction: null, count: null });
    setSelectorIndex(0); setSelectedStatsList([]); setTempSelectedStat(null); setEvolvedStatsThisYear([]);
    setStandingResult(null); setDomesticCupResult(null); setContinentalCupResult(null);
    setNationalCallupResult(null); setNationalTournamentResult(null); setYearSimResult(null);
    setHasBallonDorWinner(false);
    setIsLeagueOpen(false); setIsCupOpen(false); setIsContinentalOpen(false); setIsNationalOpen(false);
  }

  async function handleStartCareer() {
    try {
      const initPayload = await startPlayerCareerAction(setupProps.draftData);
      statsProps.handleStartCareer(setupProps.draftData, initPayload, clubs);
      resetSeasonState();
      setTransferOffer(null);
      setMode("career");
      setCareerSubStep("idle");
    } catch (err) {
      console.error("Error starting career:", err);
    }
  }

  async function handleStartSeason() {
    const luck = hiddenStats?.luckRating ?? 10;
    const prestige = currentClub?.prestige ?? 3;

    try {
      const simRes = await simulatePlayerSeasonAction({
        age: currentAge,
        ovr: currentOvr,
        position,
        luckRating: luck,
        clubPrestige: prestige,
        clubName: currentClub.name,
        leagueName: currentClub.leagueName,
        leagueId: currentClub.leagueId,
        hasContinentalCup: currentContinentalCup !== "none",
        playerNationality: playerNationality,
      });

      setYearSimResult(simRes);

      let isBallonDor = false;
      if (currentOvr >= 85 && simRes.matchRating >= 7.80) {
        isBallonDor = Math.random() < 0.35;
        setHasBallonDorWinner(isBallonDor);
      } else {
        setHasBallonDorWinner(false);
      }
    } catch (err) {
      console.error("Error in handleStartSeason:", err);
    }

    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);

    setCareerSubStep("standing");
  }

  function handleCareerSpin() {
    if (careerSpinning || careerSubStep === "idle" || careerSubStep === "resolved" || careerWheelItems.length === 0) return;

    const ctx = {
      currentAge,
      currentOvr,
      position,
      yearSimResult,
      hiddenStats,
      currentClub,
      leagueSize: currentClub ? (clubs.filter((c: any) => c.leagueId === currentClub.leagueId).length || 10) : 10,
      currentContinentalCup,
      playerNationality,
      selectedStatsList,
      selectorIndex,
      yearEvolutionDirection: yearEvolution.direction,
    };

    const { result, idx, tempValue } = getCareerWheelPoolAndValue(careerSubStep, ctx);
    setCareerTargetIndex(idx);
    setCareerSpinning(true);
    setCareerTempValue(tempValue);
    (window as any)._tempCareerResult = result;
  }

  function handleCareerSpinComplete() {
    const result = (window as any)._tempCareerResult;
    setCareerSpinning(false);
    setCareerTargetIndex(-1);
    setCareerTempValue(null);

    if (careerSubStep === "dir_increase") {
      if (result === "yes") {
        setYearEvolution((prev) => ({ ...prev, direction: "increase" }));
        setCareerSubStep("count");
      } else {
        setCareerSubStep("dir_decrease");
      }
    }
    else if (careerSubStep === "dir_decrease") {
      if (result === "yes") {
        setYearEvolution((prev) => ({ ...prev, direction: "decrease" }));
        setCareerSubStep("count");
      } else {
        setYearEvolution((prev) => ({ ...prev, direction: "maintain" }));
        triggerTransferCheck();
      }
    }
    else if (careerSubStep === "count") {
      setYearEvolution((prev) => ({ ...prev, count: result }));
      setSelectorIndex(0);
      setSelectedStatsList([]);
      setTempSelectedStat(null);
      setCareerSubStep("selector");
    }
    else if (careerSubStep === "selector") {
      setTempSelectedStat(result);
      setSelectedStatsList((prev) => [...prev, result]);
      setCareerSubStep("magnitude");
    }
    else if (careerSubStep === "magnitude") {
      const delta = yearEvolution.direction === "increase" ? result : -result;
      
      const newEvo = { stat: tempSelectedStat!, delta };
      const evolutions = [...evolvedStatsThisYear, newEvo];
      setEvolvedStatsThisYear(evolutions);

      const nextIdx = selectorIndex + 1;
      const totalNeed = yearEvolution.count ?? 1;

      if (nextIdx < totalNeed) {
        setSelectorIndex(nextIdx);
        setTempSelectedStat(null);
        setCareerSubStep("selector");
      } else {
        evolvePlayerStatsAction({
          currentStats,
          position,
          evolutions,
        }).then((res) => {
          statsProps.setCurrentStats(res.nextStats as unknown as Record<string, number>);
          statsProps.setCurrentOvr(res.nextOvr);
          triggerTransferCheck();
        }).catch((err) => {
          console.error("Error evolving player stats on backend:", err);
          triggerTransferCheck();
        });
      }
    }
    else if (careerSubStep === "standing") {
      setStandingResult(result);
      
      const currentLeagueClubsRaw = clubs.filter((c: any) => c.leagueId === currentClub.leagueId);
      generateLeagueTableAction({
        leagueId: currentClub.leagueId,
        playerClubId: currentClub.id,
        playerClubName: currentClub.name,
        playerStanding: result,
        currentLeagueClubsRaw,
      }).then((mockTable) => {
        statsProps.setSeasonRecords((prev) => {
          const rec = { ...prev[currentAge] };
          rec.standing = result;
          rec.leagueTable = mockTable;
          return { ...prev, [currentAge]: rec };
        });
        setIsLeagueOpen(true);
        setCareerSubStep("domestic_cup");
      }).catch((err) => {
        console.error("Error generating league table:", err);
      });
    }
    else if (careerSubStep === "domestic_cup") {
      setDomesticCupResult(result);
      
      generateCupJourneyAction({
        type: "domestic",
        result,
        playerClubId: currentClub.id,
        playerClubPrestige: currentClub.prestige ?? 3,
      }).then((journey) => {
        statsProps.setSeasonRecords((prev) => {
          const rec = { ...prev[currentAge] };
          rec.domesticCup = result;
          rec.domesticCupJourney = journey;
          return { ...prev, [currentAge]: rec };
        });
        setIsCupOpen(true);

        if (currentContinentalCup !== "none") {
          setCareerSubStep("continental_cup");
        } else {
          statsProps.checkNationalCallupTransition(setCareerSubStep);
        }
      }).catch((err) => {
        console.error("Error generating domestic cup journey:", err);
      });
    }
    else if (careerSubStep === "continental_cup") {
      setContinentalCupResult(result);

      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      generateCupJourneyAction({
        type: "continental",
        result,
        playerClubId: currentClub.id,
        playerClubPrestige: currentClub.prestige ?? 3,
        cupName: cupLabel,
      }).then((journey) => {
        statsProps.setSeasonRecords((prev) => {
          const rec = { ...prev[currentAge] };
          if (rec.continentalCup) {
            rec.continentalCup.result = result;
          }
          rec.continentalCupJourney = journey;
          return { ...prev, [currentAge]: rec };
        });
        setIsContinentalOpen(true);
        statsProps.checkNationalCallupTransition(setCareerSubStep);
      }).catch((err) => {
        console.error("Error generating continental cup journey:", err);
      });
    }
    else if (careerSubStep === "national_callup") {
      setNationalCallupResult(result);

      statsProps.setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        if (rec.nationalTeam) rec.nationalTeam.callup = result === "called_up" ? "Được triệu tập" : "Không được gọi";
        return { ...prev, [currentAge]: rec };
      });

      if (result === "called_up") {
        setCareerSubStep("national_tournament");
      } else {
        setCareerSubStep("dir_increase");
      }
    }
    else if (careerSubStep === "national_tournament") {
      setNationalTournamentResult(result);

      const nationCup = getNationalContinentalCup(playerNationality);
      const currentYear = 2026 + (currentAge - playerDebutAge);
      const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
      generateCupJourneyAction({
        type: "national",
        result,
        playerClubId: currentClub.id,
        playerClubPrestige: currentClub.prestige ?? 3,
        cupName: tourney,
        playerNationality,
      }).then((journey) => {
        statsProps.setSeasonRecords((prev) => {
          const rec = { ...prev[currentAge] };
          if (rec.nationalTeam) rec.nationalTeam.result = result;
          rec.nationalTeamJourney = journey;
          return { ...prev, [currentAge]: rec };
        });
        setIsNationalOpen(true);
        setCareerSubStep("dir_increase");
      }).catch((err) => {
        console.error("Error generating national team journey:", err);
      });
    }
  }

  async function triggerTransferCheck() {
    try {
      const res = await generateTransferOfferAction({
        currentClubId: currentClub.id,
        currentClubPrestige: currentClub.prestige ?? 3,
        currentOvr,
        matchRating: yearSimResult?.matchRating ?? 6.0,
        goals: yearSimResult?.goals ?? 0,
        assists: yearSimResult?.assists ?? 0,
        cleanSheets: yearSimResult?.cleanSheets ?? 0,
        position,
      });

      if (res.hasOffer && res.offer) {
        setTransferOffer(res.offer);
        setCareerSubStep("transfer");
      } else {
        setCareerSubStep("resolved");
      }
    } catch (err) {
      console.error("Error checking transfer offer:", err);
      setCareerSubStep("resolved");
    }
  }

  function handleAcceptTransfer(accept: boolean) {
    statsProps.handleAcceptTransfer(accept, transferOffer, clubs, setTransferOffer, setCareerSubStep);
  }

  function handleNextSeason() {
    const isRetire = statsProps.handleNextSeason(
      standingResult,
      domesticCupResult,
      continentalCupResult,
      nationalCallupResult,
      nationalTournamentResult,
      yearSimResult,
      hasBallonDorWinner
    );

    if (isRetire) {
      setMode("retired");
    } else {
      resetSeasonState();
      setCareerSubStep("idle");
    }
  }

  return {
    isMounted,
    isSaving: statsProps.isSaving,
    mode,
    setMode,
    wheelItems: setupProps.wheelItems,
    targetIndex: setupProps.targetIndex,
    tempValue: setupProps.tempValue,
    activeStep: setupProps.activeStep,
    isSpinning: setupProps.isSpinning,
    draftData: setupProps.draftData,
    playerName,
    hiddenStats,
    statsTimeline,
    clubStints,
    events,
    playerNationality,
    playerDebutAge,
    playerCareerLength,
    currentAge,
    currentOvr,
    currentStats,
    currentClub,
    currentContinentalCup,
    lastYearStanding,
    seasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    isLeagueOpen,
    setIsLeagueOpen,
    isCupOpen,
    setIsCupOpen,
    isContinentalOpen,
    setIsContinentalOpen,
    isNationalOpen,
    setIsNationalOpen,
    careerSubStep,
    setCareerSubStep,
    careerSpinning,
    careerWheelItems,
    careerTargetIndex,
    careerTempValue,
    yearEvolution,
    evolvedStatsThisYear,
    standingResult,
    domesticCupResult,
    continentalCupResult,
    nationalCallupResult,
    nationalTournamentResult,
    yearSimResult,
    transferOffer,
    hasBallonDorWinner,
    careerTotalStats: statsProps.careerTotalStats,
    peakOvrValue: statsProps.peakOvrValue,
    activeRecord: statsProps.activeRecord,
    handleSetupSpin: setupProps.handleSetupSpin,
    handleSetupSpinComplete: setupProps.handleSetupSpinComplete,
    handleStartCareer,
    handleStartSeason,
    handleCareerSpin,
    handleCareerSpinComplete,
    handleAcceptTransfer,
    handleNextSeason,
    handleSavePlayer: statsProps.handleSavePlayer,
    STEP_LABELS,
    selectorIndex,
    tempSelectedStat,
  };
}
