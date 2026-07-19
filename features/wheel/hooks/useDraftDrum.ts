"use client";

import { useEffect, useRef, useState } from "react";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getSeasonYearString } from "../lib/simulation-helpers";
import { getCareerWheelPoolAndValue } from "../lib/career-wheel-resolver";
import { useSetupStage } from "./useSetupStage";
import { useCareerStats } from "./useCareerStats";
import { useCareerWheelItems } from "./useCareerWheelItems";
import { useCompetitionFlow } from "./useCompetitionFlow";
import { useStatEvolutionFlow } from "./useStatEvolutionFlow";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import {
  startPlayerCareerAction,
  updateSeasonProgressAction,
} from "@/actions/season.actions";
import { initCareerPlayerAction, getCareerPlayerAction } from "@/actions/player.actions";
import { type SeasonRecord, getStepLabels } from "@/types/game";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

export type ModalType = "league" | "cup" | "continental" | "national" | "season_stats" | null;

const COMPETITION_STEPS = new Set([
  "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament",
]);

export function useDraftDrum(
  gameId: string,
  slotIndex: number,
  position: string,
  leagues: any[],
  clubs: any[],
  savedPlayerId?: string,
  savedContinentalCup?: string,
) {
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<"setup" | "career" | "retired">("setup");

  const { resetDraft } = useWheelUiStore();
  const setupProps = useSetupStage({ position, leagues, clubs, isMounted, mode });
  const statsProps = useCareerStats({ gameId, slotIndex, position });

  const {
    playerName, hiddenStats, statsTimeline, clubStints, achievements,
    playerNationality, playerDebutAge, playerCareerLength,
    currentAge, currentOvr, currentStats, currentClub,
    currentContinentalCup, lastYearStanding, seasonRecords,
    selectedAgeForStats, setSelectedAgeForStats,
  } = statsProps;

  const tempCareerResultRef = useRef<any>(null);

  const [careerSubStep, setCareerSubStep] = useState<
    | "idle" | "standing" | "domestic_cup" | "continental_cup"
    | "national_callup" | "national_tournament" | "season_stats"
    | "ballon_dor_nomination" | "ballon_dor_ranking"
    | "dir_increase" | "dir_decrease" | "count" | "selector" | "magnitude"
    | "transfer" | "resolved"
  >("idle");
  const [careerSpinning, setCareerSpinning] = useState(false);
  const [careerTargetIndex, setCareerTargetIndex] = useState<number>(-1);
  const [careerTempValue, setCareerTempValue] = useState<string | null>(null);

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
  const [transferOffer, setTransferOffer] = useState<any>(null);
  const [hasBallonDorWinner, setHasBallonDorWinner] = useState(false);
  const [ballonDorRank, setBallonDorRank] = useState<number | null>(null);
  const [ballonDorNominationWeight, setBallonDorNominationWeight] = useState(0);
  const [ballonDorRankWeights, setBallonDorRankWeights] = useState<number[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
    leagueSize: currentClub ? (clubs.filter((c: any) => c.leagueId === currentClub.leagueId).length || 10) : 10,
    lastYearStanding,
    selectedStatsList, position, yearSimResult, selectorIndex,
    yearEvolutionDirection: yearEvolution.direction, currentStats,
    ballonDorNominationWeight, ballonDorRankWeights,
  });

  const competitionFlow = useCompetitionFlow({
    currentAge, currentOvr, position, currentClub, currentContinentalCup,
    playerNationality, playerDebutAge, hiddenStats,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, yearSimResult,
    setStandingResult, setDomesticCupResult, setContinentalCupResult,
    setNationalCallupResult, setNationalTournamentResult,
    setCareerSubStep, setIsProcessing, setActiveModal, setYearSimResult,
    setBallonDorNominationWeight, setBallonDorRankWeights,
    applySimResultToRecords: statsProps.applySimResultToRecords,
    setSeasonRecords: statsProps.setSeasonRecords,
    checkNationalCallupTransition: statsProps.checkNationalCallupTransition,
  });

  const statFlow = useStatEvolutionFlow({
    currentStats, currentClub, currentOvr, position, yearSimResult,
    yearEvolution, selectorIndex, tempSelectedStat, evolvedStatsThisYear,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, nationalTournamentResult, ballonDorRank,
    setYearEvolution, setSelectorIndex, setTempSelectedStat,
    setSelectedStatsList, setEvolvedStatsThisYear,
    setCareerSubStep, setIsProcessing, setTransferOffer, setBallonDorRank,
    setHasBallonDorWinner,
    setCurrentStats: statsProps.setCurrentStats,
    setCurrentOvr: statsProps.setCurrentOvr,
  });

  const prevAgeRef = useRef<number | null>(null);

  // Career resume on mount
  useEffect(() => {
    const controller = new AbortController();
    if (savedPlayerId) {
      getCareerPlayerAction({ playerId: savedPlayerId })
        .then((player) => {
          if (controller.signal.aborted || !player) return;
          const lastStats = (player.statsTimeline as any[]).at(-1);
          const lastStint = (player.clubStints as any[]).at(-1);
          if (!lastStats || !lastStint) { resetDraft(); setMode("setup"); setIsMounted(true); return; }

          statsProps.setPlayerId(savedPlayerId);
          statsProps.setPlayerName(player.name);
          statsProps.setPlayerNationality(player.nationality);
          statsProps.setPlayerDebutAge(player.debutAge);
          statsProps.setPlayerCareerLength(player.careerLengthYears);
          statsProps.setStatsTimeline(player.statsTimeline as any[]);
          statsProps.setClubStints(player.clubStints as any[]);
          statsProps.setAchievements((player.achievements as any) ?? { ballonDor: 0, trophies: [], seasonAwards: [] });

          if (player.seasonHistory && typeof player.seasonHistory === "object") {
            const restored: Record<number, SeasonRecord> = {};
            for (const [k, v] of Object.entries(player.seasonHistory as Record<string, any>)) {
              restored[parseInt(k)] = v as SeasonRecord;
            }
            statsProps.setSeasonRecords(restored);
          }

          statsProps.setCurrentAge(lastStats.age);
          statsProps.setCurrentOvr(lastStats.ovr);
          const statKeys = position === "GK"
            ? ["div", "han", "kic", "ref", "spd", "pos"]
            : ["pac", "sho", "pas", "dri", "def", "phy"];
          statsProps.setCurrentStats(Object.fromEntries(statKeys.map((k) => [k, lastStats[k] ?? 60])));

          const fullClub = clubs.find((c: any) => c.id === lastStint.clubId);
          statsProps.setCurrentClub({
            id: lastStint.clubId, name: lastStint.clubName,
            leagueId: lastStint.leagueId, leagueName: lastStint.leagueName,
            prestige: fullClub?.prestige ?? 3, continentalType: fullClub?.continentalType ?? "none",
          });
          if (savedContinentalCup) statsProps.setCurrentContinentalCup(savedContinentalCup);

          prevAgeRef.current = lastStats.age;
          setCareerSubStep("idle");
          setMode("career");
          setIsMounted(true);
        })
        .catch(() => { if (!controller.signal.aborted) { resetDraft(); setMode("setup"); setIsMounted(true); } });
    } else {
      resetDraft(); setMode("setup"); setIsMounted(true);
    }
    return () => controller.abort();
  }, []);

  // Background save after each season — serialize để tránh 2 request bay song
  // song rồi về KHÔNG THEO THỨ TỰ gửi đi (network jitter), khiến 1 save cũ đè lên
  // save mới hơn trong DB. Chỉ cho phép 1 request tại 1 thời điểm; nếu có request
  // mới muốn gửi trong lúc request trước còn đang chạy, đánh dấu "pending" và gửi
  // NGAY sau khi request hiện tại xong, luôn lấy snapshot MỚI NHẤT tại thời điểm
  // gửi (không phải snapshot lúc bị hoãn) để đảm bảo cuối cùng luôn lưu đúng data
  // mới nhất.
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestSaveSnapshotRef = useRef<{
    statsTimeline: any[]; clubStints: any[]; achievements: any; currentContinentalCup: string;
    seasonHistory: Record<number, any>;
  } | null>(null);

  useEffect(() => {
    latestSaveSnapshotRef.current = {
      statsTimeline, clubStints, achievements, currentContinentalCup,
      seasonHistory: seasonRecords as Record<number, any>,
    };
  });

  function runBackgroundSave(pid: string) {
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    const snapshot = latestSaveSnapshotRef.current;
    if (!snapshot) return;
    saveInFlightRef.current = true;
    updateSeasonProgressAction({ playerId: pid, ...snapshot })
      .catch((err) => console.error("Background save failed:", err))
      .finally(() => {
        saveInFlightRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          runBackgroundSave(pid);
        }
      });
  }

  useEffect(() => {
    if (mode !== "career" || prevAgeRef.current === null) { prevAgeRef.current = currentAge; return; }
    prevAgeRef.current = currentAge;
    const pid = statsProps.playerId;
    if (pid) runBackgroundSave(pid);
  }, [currentAge]);

  // Init season record for current age
  useEffect(() => {
    if (mode === "career" && currentClub) {
      statsProps.setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        const currentYear = 2026 + (currentAge - playerDebutAge);
        return {
          ...prev,
          [currentAge]: {
            age: currentAge, clubName: currentClub.name, leagueName: currentClub.leagueName,
            standing: null, domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? {
              type: currentYear % 4 === 2 ? "FIFA World Cup" : getNationalContinentalCup(playerNationality),
              callup: "Chờ gọi", result: null,
            } : null,
          },
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
    setBallonDorRank(null); setBallonDorNominationWeight(0); setBallonDorRankWeights([]);
    setActiveModal(null);
    setIsProcessing(false);
  }

  async function handleStartCareer() {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const initPayload = await startPlayerCareerAction({ ...setupProps.draftData, position });
      statsProps.handleStartCareer(setupProps.draftData, initPayload, clubs);

      const draftData = setupProps.draftData;
      const selectedClub = clubs.find((c: any) => c.id === draftData.clubId);
      const initialContinentalCup = selectedClub?.continentalType ?? "none";

      initCareerPlayerAction({
        gameId, slotIndex, position, name: initPayload.playerName,
        nationality: draftData.nationality!, debutAge: draftData.debutAge!,
        careerLength: draftData.careerLength!, debutOvr: draftData.debutOvr!,
        height: draftData.height!, weight: draftData.weight!,
        preferredFoot: initPayload.preferredFoot,
        currentContinentalCup: initialContinentalCup,
        statsTimeline: initPayload.initTimeline, clubStints: [initPayload.initStint],
        hiddenStats: initPayload.hiddenStats,
      }).then(({ id }) => statsProps.setPlayerId(id))
        .catch((err) => console.error("Error creating career player in DB:", err));

      resetSeasonState(); setTransferOffer(null); setMode("career"); setCareerSubStep("idle");
    } catch (err) {
      console.error("Error starting career:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleStartSeason() {
    setSelectorIndex(0); setSelectedStatsList([]); setTempSelectedStat(null); setEvolvedStatsThisYear([]);
    setCareerSubStep("standing");
  }

  function handleCareerSpin() {
    if (isProcessing || careerSpinning || careerSubStep === "idle" || careerSubStep === "resolved"
      || careerSubStep === "season_stats" || careerWheelItems.length === 0) return;
    if (careerSubStep === "ballon_dor_nomination" && ballonDorNominationWeight === 0) return;

    const ctx = {
      currentAge, playerDebutAge, playerCareerLength, currentOvr, position, yearSimResult, hiddenStats, currentClub,
      leagueSize: currentClub ? (clubs.filter((c: any) => c.leagueId === currentClub.leagueId).length || 10) : 10,
      lastYearStanding,
      currentContinentalCup, playerNationality, selectedStatsList, selectorIndex,
      yearEvolutionDirection: yearEvolution.direction, currentStats,
      ballonDorNominationWeight, ballonDorRankWeights,
    };
    const { result, idx, tempValue } = getCareerWheelPoolAndValue(careerSubStep, ctx);
    setIsProcessing(true);
    setCareerTargetIndex(idx);
    setCareerSpinning(true);
    setCareerTempValue(tempValue);
    tempCareerResultRef.current = result;
  }

  function handleCareerSpinComplete() {
    const result = tempCareerResultRef.current;
    setCareerSpinning(false); setCareerTargetIndex(-1); setCareerTempValue(null);
    // isProcessing KHÔNG được tắt ở đây — chỉ animation vừa xong, server action
    // tương ứng (nếu có) mới bắt đầu chạy trong handleSpinComplete bên dưới, và
    // chính nó sẽ tắt isProcessing khi thực sự settle (xem useCompetitionFlow.ts /
    // useStatEvolutionFlow.ts).
    if (COMPETITION_STEPS.has(careerSubStep)) {
      competitionFlow.handleSpinComplete(careerSubStep, result);
    } else {
      statFlow.handleSpinComplete(careerSubStep, result);
    }
  }

  function handleAcceptTransfer(accept: boolean) {
    if (isProcessing) return;
    setIsProcessing(true);
    statsProps.handleAcceptTransfer(accept, transferOffer, clubs, setTransferOffer, setCareerSubStep);
    setIsProcessing(false);
  }

  function handleNextSeason() {
    if (isProcessing) return;
    setIsProcessing(true);
    const { isRetire } = statsProps.handleNextSeason(
      standingResult, domesticCupResult, continentalCupResult,
      nationalCallupResult, nationalTournamentResult, yearSimResult, ballonDorRank,
    );
    if (isRetire) { setMode("retired"); } else { resetSeasonState(); setCareerSubStep("idle"); }
    setIsProcessing(false);
  }

  return {
    isMounted, isSaving: statsProps.isSaving, mode, setMode,
    wheelItems: setupProps.wheelItems, targetIndex: setupProps.targetIndex,
    tempValue: setupProps.tempValue, activeStep: setupProps.activeStep,
    isSpinning: setupProps.isSpinning, draftData: setupProps.draftData,
    playerName, hiddenStats, statsTimeline, clubStints,
    playerNationality, playerDebutAge, playerCareerLength,
    currentAge, currentOvr, currentStats, currentClub, currentContinentalCup,
    lastYearStanding, seasonRecords, selectedAgeForStats, setSelectedAgeForStats,
    activeModal, setActiveModal, careerSubStep, setCareerSubStep,
    isProcessing,
    careerSpinning, careerWheelItems, careerTargetIndex, careerTempValue,
    yearEvolution, evolvedStatsThisYear,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, nationalTournamentResult,
    yearSimResult, transferOffer, hasBallonDorWinner,
    careerTotalStats: statsProps.careerTotalStats,
    peakOvrValue: statsProps.peakOvrValue,
    activeRecord: statsProps.activeRecord,
    handleSetupSpin: setupProps.handleSetupSpin,
    handleSetupSpinComplete: setupProps.handleSetupSpinComplete,
    handleStartCareer, handleStartSeason, handleCareerSpin,
    handleCareerSpinComplete, handleAcceptTransfer, handleNextSeason,
    handleSeasonStatsModalClose: competitionFlow.handleSeasonStatsModalClose,
    handleSavePlayer: statsProps.handleSavePlayer,
    STEP_LABELS: getStepLabels(position),
    selectorIndex, tempSelectedStat,
  };
}
