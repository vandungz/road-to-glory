"use client";

import { useEffect, useState, useMemo } from "react";
import { simulatePlayerSeason, type SimulatedSeasonResult } from "@/lib/simulation-engine/match-simulator";
import { getNationalContinentalCup, getNationalTier, calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";
import {
  calculateContinentalQualification,
  getContinentalCupLabel,
  getSeasonYearString,
  getMockOpponentsByLeagueName,
  generateDomesticCupJourney,
  generateContinentalCupJourney,
  generateNationalTeamJourney,
  generateMockLeagueTable,
} from "../lib/simulation-helpers";
import { getCareerWheelPoolAndValue } from "../lib/career-wheel-resolver";
import { useSetupStage } from "./useSetupStage";
import { useCareerStats } from "./useCareerStats";
import { useCareerWheelItems } from "./useCareerWheelItems";

export interface SeasonRecord {
  age: number;
  clubName: string;
  leagueName: string;
  standing: number | null;
  domesticCup: string | null;
  continentalCup: { type: string; result: string } | null;
  nationalTeam: { type: string; callup: string; result: string | null } | null;
  leagueTable?: any[];
  domesticCupJourney?: string[];
  continentalCupJourney?: string[];
  nationalTeamJourney?: string[];
  apps?: number;
  goals?: number;
  assists?: number;
  matchRating?: number;
  cleanSheets?: number;
}

export const STEP_LABELS = [
  "Quốc Tịch",
  "Tuổi Ra Mắt",
  "Pace (PAC)",
  "Shooting (SHO)",
  "Passing (PAS)",
  "Dribbling (DRI)",
  "Defending (DEF)",
  "Physical (PHY)",
  "Thời Gian Thi Đấu",
  "Giải Đấu",
  "Câu Lạc Bộ",
];

export function useDraftDrum(
  gameId: string,
  slotIndex: number,
  position: string,
  leagues: any[],
  clubs: any[]
) {
  const [isMounted, setIsMounted] = useState(false);

  // 1. Quản lý chế độ (mode): "setup" | "career" | "retired"
  const [mode, setMode] = useState<"setup" | "career" | "retired">("setup");

  // Sub-hooks
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

  // States vòng quay Career Loop hàng năm
  const [careerSubStep, setCareerSubStep] = useState<
    "idle" | "dir_increase" | "dir_decrease" | "count" | "selector" | "magnitude" | "standing" | "domestic_cup" | "continental_cup" | "national_callup" | "national_tournament" | "transfer" | "resolved"
  >("idle");
  const [careerSpinning, setCareerSpinning] = useState(false);
  const [careerTargetIndex, setCareerTargetIndex] = useState<number>(-1);
  const [careerTempValue, setCareerTempValue] = useState<string | null>(null);

  // Biến tạm để tiến hóa stats trong năm
  const [yearEvolution, setYearEvolution] = useState<{
    direction: "increase" | "decrease" | "maintain" | null;
    count: number | null;
  }>({ direction: null, count: null });

  // Theo dõi lượt quay selector và loại trừ
  const [selectorIndex, setSelectorIndex] = useState<number>(0);
  const [selectedStatsList, setSelectedStatsList] = useState<string[]>([]);
  const [tempSelectedStat, setTempSelectedStat] = useState<string | null>(null);
  const [evolvedStatsThisYear, setEvolvedStatsThisYear] = useState<{ stat: string; delta: number }[]>([]);

  // Kết quả quay các wheels tập thể trong năm thi đấu
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

  // Khởi tạo bản ghi mùa giải mới
  useEffect(() => {
    if (mode === "career" && currentClub) {
      statsProps.setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        return {
          ...prev,
          [currentAge]: {
            age: currentAge,
            clubName: currentClub.name,
            leagueName: currentClub.leagueName,
            standing: null,
            domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? { type: currentAge % 4 === 0 ? "FIFA World Cup" : getNationalContinentalCup(playerNationality), callup: "Chờ gọi", result: null } : null,
          }
        };
      });
      setSelectedAgeForStats(currentAge);
    }
  }, [currentAge, mode, currentClub, currentContinentalCup, playerNationality]);

  // Bắt đầu sự nghiệp
  function handleStartCareer() {
    statsProps.handleStartCareer(setupProps.draftData, clubs);
    
    setYearEvolution({ direction: null, count: null });
    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);
    setStandingResult(null);
    setDomesticCupResult(null);
    setContinentalCupResult(null);
    setNationalCallupResult(null);
    setNationalTournamentResult(null);
    setYearSimResult(null);
    setTransferOffer(null);
    setHasBallonDorWinner(false);

    setMode("career");
    setCareerSubStep("idle");
  }

  function handleStartSeason() {
    const luck = hiddenStats?.luckRating ?? 10;
    const prestige = currentClub?.prestige ?? 3;

    const simRes = simulatePlayerSeason({
      age: currentAge,
      ovr: currentOvr,
      position,
      luckRating: luck,
      clubPrestige: prestige,
      clubName: currentClub.name,
      leagueName: currentClub.leagueName,
    });
    setYearSimResult(simRes);

    let isBallonDor = false;
    if (currentOvr >= 85 && simRes.matchRating >= 7.80) {
      isBallonDor = Math.random() < 0.35;
      setHasBallonDorWinner(isBallonDor);
    } else {
      setHasBallonDorWinner(false);
    }

    setSelectorIndex(0);
    setSelectedStatsList([]);
    setTempSelectedStat(null);
    setEvolvedStatsThisYear([]);

    setCareerSubStep("standing");
  }

  // ── CAREER LOOPS SPIN RESOLVER ──
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

  // ── CAREER LOOPS SPIN COMPLETE ──
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
        statsProps.checkTransferOfferTransition(clubs, leagues, setTransferOffer, setCareerSubStep);
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
      
      const nextStats = { ...currentStats };
      nextStats[tempSelectedStat!] = Math.min(99, Math.max(10, nextStats[tempSelectedStat!] + delta));
      const nextOvr = calculateOvrByPosition(position, nextStats as any);

      statsProps.setCurrentStats(nextStats);
      statsProps.setCurrentOvr(nextOvr);
      setEvolvedStatsThisYear((prev) => [...prev, { stat: tempSelectedStat!, delta }]);

      const nextIdx = selectorIndex + 1;
      const totalNeed = yearEvolution.count ?? 1;

      if (nextIdx < totalNeed) {
        setSelectorIndex(nextIdx);
        setTempSelectedStat(null);
        setCareerSubStep("selector");
      } else {
        statsProps.checkTransferOfferTransition(clubs, leagues, setTransferOffer, setCareerSubStep);
      }
    }
    else if (careerSubStep === "standing") {
      setStandingResult(result);
      
      const currentLeagueClubs = clubs.filter((c: any) => c.leagueId === currentClub.leagueId);
      const mockTable = generateMockLeagueTable(result, currentClub.name, currentLeagueClubs);
      statsProps.setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        rec.standing = result;
        rec.leagueTable = mockTable;
        return { ...prev, [currentAge]: rec };
      });

      setIsLeagueOpen(true);
      setCareerSubStep("domestic_cup");
    }
    else if (careerSubStep === "domestic_cup") {
      setDomesticCupResult(result);
      
      const journey = generateDomesticCupJourney(result);
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
    }
    else if (careerSubStep === "continental_cup") {
      setContinentalCupResult(result);

      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      const journey = generateContinentalCupJourney(result, cupLabel);
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
      const tourney = currentAge % 4 === 0 ? "FIFA World Cup" : nationCup;
      const journey = generateNationalTeamJourney(result, tourney);
      statsProps.setSeasonRecords((prev) => {
        const rec = { ...prev[currentAge] };
        if (rec.nationalTeam) rec.nationalTeam.result = result;
        rec.nationalTeamJourney = journey;
        return { ...prev, [currentAge]: rec };
      });

      setIsNationalOpen(true);
      setCareerSubStep("dir_increase");
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
      setCareerSubStep("idle");
      setYearEvolution({ direction: null, count: null });
      setStandingResult(null);
      setDomesticCupResult(null);
      setContinentalCupResult(null);
      setNationalCallupResult(null);
      setNationalTournamentResult(null);
      setYearSimResult(null);
      setHasBallonDorWinner(false);
      
      setSelectorIndex(0);
      setSelectedStatsList([]);
      setTempSelectedStat(null);
      setEvolvedStatsThisYear([]);
      
      setIsLeagueOpen(false);
      setIsCupOpen(false);
      setIsContinentalOpen(false);
      setIsNationalOpen(false);
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
