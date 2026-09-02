"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getNationalTournamentName } from "../lib/simulation-helpers";
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
  resolveShortlistApproachAction,
  resolveProactiveRenewalAction,
  searchClubsForApproachAction,
  purchaseShopItemAction,
} from "@/actions/season.actions";
import { initCareerPlayerAction, getCareerPlayerAction } from "@/actions/player.actions";
import { type SeasonRecord, getStepLabels } from "@/types/game";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { approachChancePercent, computeEffectivePositionOvr } from "@/lib/transfer-economy";
import { applyWageDealChance, type WageDealOption } from "@/lib/salary-negotiation";
import {
  isShopItemActiveForSeason,
  type ShopInventoryEntry,
} from "@/lib/shop-catalog";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type { ShortlistClubCard } from "@/features/transfer/services/transfer.service";
import type { ContractOfferCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { AchievementRecord, CareerSubStep, ClubStint, ClubSummary, LeagueSummary, SeasonHistory, StatSnapshot } from "@/types/domain";

interface ResumeCareerPlayer {
  name: string;
  nationality: string;
  debutAge: number;
  careerLengthYears: number;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: AchievementRecord | null;
  seasonHistory?: Record<string, SeasonRecord>;
  contractYearsRemaining?: number;
  contractYearsTotal?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  walletBalance?: number;
  influenceScore?: number;
  shopInventory?: ShopInventoryEntry[];
  isUnemployed?: boolean;
}

function emptyUnemployedSeasonResult(): SimulatedSeasonResult {
  const zeroComp = { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 6.0 };
  return {
    apps: 0,
    goals: 0,
    assists: 0,
    matchRating: 6.0,
    cleanSheets: 0,
    events: [{ type: "unemployed", label: "Mùa thất nghiệp — không CLB" }],
    leagueStats: zeroComp,
    domesticCupStats: zeroComp,
    ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [] },
  };
}

export type ModalType = "league" | "cup" | "continental" | "national" | "season_stats" | "season_recap" | "transfer" | "shop" | null;

const COMPETITION_STEPS = new Set([
  "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament",
]);

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
    currentContinentalCup, lastYearStanding, seasonRecords,
    selectedAgeForStats, setSelectedAgeForStats, shopInventory,
  } = statsProps;

  const fitnessCoachActive = isShopItemActiveForSeason(shopInventory, "fitness_coach", currentAge);
  const nationalCallupBoostActive = isShopItemActiveForSeason(
    shopInventory, "national_callup_boost", currentAge,
  );
  const eliteDevelopmentActive = isShopItemActiveForSeason(
    shopInventory, "elite_development_program", currentAge,
  );

  const tempCareerResultRef = useRef<string | number | null>(null);

  const [careerSubStep, setCareerSubStep] = useState<CareerSubStep>("idle");
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
  const [transferOffer, setTransferOffer] = useState<ContractOfferCard | null>(null);
  const [transferMarket, setTransferMarket] = useState<TransferMarketResult | null>(null);
  const [willingToMove, setWillingToMove] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);
  const [approachRejects, setApproachRejects] = useState<ApproachRejectState>({});
  const [approachBanner, setApproachBanner] = useState<string | null>(null);
  const [proactiveRenewalRejectedAge, setProactiveRenewalRejectedAge] = useState<number | null>(null);
  const proactiveRenewalInFlightRef = useRef(false);
  const [hasBallonDorWinner, setHasBallonDorWinner] = useState(false);
  const [ballonDorRank, setBallonDorRank] = useState<number | null>(null);
  const [ballonDorNominationWeight, setBallonDorNominationWeight] = useState(0);
  const [ballonDorRankWeights, setBallonDorRankWeights] = useState<number[]>([]);
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
    lastYearStanding, standingResult,
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
    setBallonDorNominationWeight, setBallonDorRankWeights,
    applySimResultToRecords: statsProps.applySimResultToRecords,
    setSeasonRecords: statsProps.setSeasonRecords,
    checkNationalCallupTransition: statsProps.checkNationalCallupTransition,
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
  });

  const prevAgeRef = useRef<number | null>(null);
  const autoStartSeasonRef = useRef(false);

  // Career resume on mount
  useEffect(() => {
    const controller = new AbortController();
    if (savedPlayerId) {
      getCareerPlayerAction({ playerId: savedPlayerId })
        .then((player) => {
          if (controller.signal.aborted || !player) return;
          const playerRecord = player as unknown as ResumeCareerPlayer;
          const lastStats = playerRecord.statsTimeline.at(-1);
          const lastStint = playerRecord.clubStints.at(-1);
          if (!lastStats || !lastStint) { resetDraft(); setMode("setup"); setIsMounted(true); return; }

          statsProps.setPlayerId(savedPlayerId);
          statsProps.setPlayerName(playerRecord.name);
          statsProps.setPlayerNationality(playerRecord.nationality);
          statsProps.setPlayerDebutAge(playerRecord.debutAge);
          statsProps.setPlayerCareerLength(playerRecord.careerLengthYears);
          statsProps.setStatsTimeline(playerRecord.statsTimeline);
          statsProps.setClubStints(playerRecord.clubStints);
          statsProps.setAchievements(playerRecord.achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] });

          if (playerRecord.seasonHistory) {
            const restored: Record<number, SeasonRecord> = {};
            for (const [k, v] of Object.entries(playerRecord.seasonHistory)) {
              restored[parseInt(k)] = v;
            }
            statsProps.setSeasonRecords(restored);
          }

          statsProps.setCurrentAge(lastStats.age);
          statsProps.setCurrentOvr(lastStats.ovr);
          const statKeys = position === "GK"
            ? ["div", "han", "kic", "ref", "spd", "pos"]
            : ["pac", "sho", "pas", "dri", "def", "phy"];
          statsProps.setCurrentStats(Object.fromEntries(statKeys.map((k) => [k, lastStats[k] ?? 60])));

          if (typeof playerRecord.contractYearsRemaining === "number") {
            statsProps.setContractYearsRemaining(playerRecord.contractYearsRemaining);
          }
          if (typeof playerRecord.contractYearsTotal === "number") {
            statsProps.setContractYearsTotal(playerRecord.contractYearsTotal);
          }
          if (typeof playerRecord.currentWageAnnual === "number") {
            statsProps.setCurrentWageAnnual(playerRecord.currentWageAnnual);
          }
          if (typeof playerRecord.marketValue === "number") {
            statsProps.setMarketValue(playerRecord.marketValue);
          }
          statsProps.setWalletBalance(playerRecord.walletBalance ?? 0);
          statsProps.setInfluenceScore(playerRecord.influenceScore ?? 0);
          statsProps.setShopInventory(playerRecord.shopInventory ?? []);

          const unemployed = !!playerRecord.isUnemployed;
          statsProps.setIsUnemployed(unemployed);
          if (unemployed) {
            statsProps.setCurrentClub(null);
            statsProps.setCurrentContinentalCup("none");
          } else {
            const fullClub = clubs.find((c) => c.id === lastStint.clubId);
            statsProps.setCurrentClub({
              id: lastStint.clubId, name: lastStint.clubName,
              leagueId: lastStint.leagueId, leagueName: lastStint.leagueName,
              prestige: fullClub?.prestige ?? 3, continentalType: fullClub?.continentalType ?? "none",
            });
            if (savedContinentalCup) statsProps.setCurrentContinentalCup(savedContinentalCup);
          }

          prevAgeRef.current = lastStats.age;
          setCareerSubStep("idle");
          setMode("career");
          setIsMounted(true);
        })
        .catch(() => { if (!controller.signal.aborted) { resetDraft(); setMode("setup"); setIsMounted(true); } });
    } else if (initialMode === "career") {
      statsProps.setPlayerName("Charlie Wilson");
      statsProps.setPlayerNationality("England");
      statsProps.setPlayerDebutAge(21);
      statsProps.setPlayerCareerLength(15);
      statsProps.setCurrentAge(21);
      statsProps.setCurrentOvr(71);
      const defaultClub = clubs[0] ? {
        id: clubs[0].id, name: clubs[0].name,
        leagueId: clubs[0].leagueId ?? "epl", leagueName: "Premier League",
        prestige: clubs[0].prestige ?? 5, continentalType: clubs[0].continentalType ?? "ucl"
      } : {
        id: "c1", name: "Liverpool", leagueId: "epl", leagueName: "Premier League", prestige: 5, continentalType: "ucl"
      };
      statsProps.setCurrentClub(defaultClub);
      statsProps.setStatsTimeline([{ age: 21, ovr: 71, pac: 70, sho: 73, pas: 55, dri: 68, def: 31, phy: 61 }]);
      statsProps.setClubStints([{
        clubId: defaultClub.id,
        clubName: defaultClub.name,
        leagueId: defaultClub.leagueId,
        leagueName: defaultClub.leagueName,
        startAge: 21,
        endAge: 21,
        yearsAtClub: 1,
        ovrAtJoining: 71,
        ovrAtLeaving: 71,
      }]);
      setCareerSubStep("idle");
      setMode("career");
      setIsMounted(true);
    } else {
      resetDraft(); setMode("setup"); setIsMounted(true);
    }
    return () => controller.abort();
  // This hydrates the draft exactly once; dependencies are intentionally frozen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    statsTimeline: StatSnapshot[]; clubStints: ClubStint[]; achievements: AchievementRecord; currentContinentalCup: string;
    seasonHistory: SeasonHistory;
    contractYearsTotal: number;
    contractYearsRemaining: number;
    currentWageAnnual: number;
    marketValue: number;
    isUnemployed: boolean;
    currentAge: number;
    peakOvr: number;
    debutAge: number;
    careerLength: number;
    clubPrestige: number;
    matchRatingThisSeason: number;
    transferFeeThisSeason: number;
  } | null>(null);

  useEffect(() => {
    // Real transfer fee credited only if the LAST club stint started exactly this
    // season (derived from clubStints — no separate state to keep in sync/reset).
    const lastStint = clubStints[clubStints.length - 1];
    const transferFeeThisSeason =
      lastStint && lastStint.startAge === currentAge ? lastStint.feePaid ?? 0 : 0;

    latestSaveSnapshotRef.current = {
      statsTimeline, clubStints, achievements, currentContinentalCup,
      seasonHistory: seasonRecords,
      contractYearsTotal: statsProps.contractYearsTotal,
      contractYearsRemaining: statsProps.contractYearsRemaining,
      currentWageAnnual: statsProps.currentWageAnnual,
      marketValue: statsProps.marketValue,
      isUnemployed: statsProps.isUnemployed,
      currentAge,
      peakOvr: statsProps.peakOvrValue,
      debutAge: playerDebutAge,
      careerLength: playerCareerLength,
      clubPrestige: currentClub?.prestige ?? 2,
      // Season just completed is currentAge - 1 (this effect fires after currentAge
      // has already advanced to the season about to be played).
      matchRatingThisSeason: seasonRecords[currentAge - 1]?.matchRating ?? 6.0,
      transferFeeThisSeason,
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
      .then((result) => {
        statsProps.setWalletBalance(result.walletBalance);
        statsProps.setInfluenceScore(result.influenceScore);
        statsProps.setShopInventory(result.shopInventory);
      })
      .catch((err) => console.error("Background save failed:", err))
      .finally(() => {
        saveInFlightRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          runBackgroundSave(pid);
        }
      });
  }

  // Module pages unmount this hook. Persist the completed season before
  // navigating to transfer/shop; waiting for an age change is too late because
  // the wheel result still only exists in React state at that point.
  async function persistCurrentProgress(): Promise<boolean> {
    const pid = statsProps.playerId;
    const snapshot = latestSaveSnapshotRef.current;
    if (!pid || !snapshot || isProcessing) return !isProcessing;

    setIsProcessing(true);
    try {
      const result = await updateSeasonProgressAction({ playerId: pid, ...snapshot });
      statsProps.setWalletBalance(result.walletBalance);
      statsProps.setInfluenceScore(result.influenceScore);
      statsProps.setShopInventory(result.shopInventory);
      return true;
    } catch (err) {
      console.error("Progress save before module navigation failed:", err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  // Two valid shopping windows — both are "the upcoming season's wheels haven't spun
  // yet", just viewed from either side of the "Next Season" click:
  //  - "resolved": season `currentAge` just finished, target `currentAge + 1`.
  //  - "idle": season `currentAge` about to start, target `currentAge` itself.
  const shopTargetSeason =
    careerSubStep === "resolved" ? currentAge + 1 : careerSubStep === "idle" ? currentAge : null;

  async function handlePurchaseShopItem(itemId: string): Promise<void> {
    const pid = statsProps.playerId;
    if (!pid || isProcessing || shopTargetSeason === null) return;
    setIsProcessing(true);
    try {
      const result = await purchaseShopItemAction({
        playerId: pid,
        itemId,
        currentAge,
        targetSeason: shopTargetSeason,
      });
      statsProps.setWalletBalance(result.walletBalance);
      statsProps.setShopInventory(result.shopInventory);
    } catch (err) {
      console.error("Purchase shop item failed:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    const previousAge = prevAgeRef.current;
    prevAgeRef.current = currentAge;
    // Hydration also changes currentAge from its placeholder value to the
    // persisted value. That is not a completed season and must not trigger a
    // background save with partially restored state.
    if (mode !== "career" || previousAge === null || previousAge === currentAge) return;
    const pid = statsProps.playerId;
    if (pid) runBackgroundSave(pid);
  // The save snapshot is maintained in refs so this effect only tracks a season change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge]);

  // Init season record for current age
  useEffect(() => {
    if (mode === "career" && currentClub) {
      statsProps.setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        return {
          ...prev,
          [currentAge]: {
            age: currentAge, clubName: currentClub.name, leagueName: currentClub.leagueName,
            leagueId: currentClub.leagueId,
            standing: null, domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? {
              type: getNationalTournamentName(
                playerNationality, currentAge, playerDebutAge, getNationalContinentalCup,
              ),
              callup: "Chờ gọi", result: null,
            } : null,
          },
        };
      });
      setSelectedAgeForStats(currentAge);
    }
  // statsProps is a mutable facade; the listed state inputs are the record boundaries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const initPayload = await startPlayerCareerAction({ ...draftData, position });
      const selectedClub = clubs.find((c) => c.id === draftData.clubId);
      const initialContinentalCup = selectedClub?.continentalType ?? "none";
      const debutOvr = initPayload.debutOvr;

      const { id } = await initCareerPlayerAction({
        gameId, slotIndex, position, name: initPayload.playerName,
        nationality: draftData.nationality, debutAge: draftData.debutAge,
        careerLength: draftData.careerLength, debutOvr,
        height: draftData.height, weight: draftData.weight,
        preferredFoot: initPayload.preferredFoot,
        currentContinentalCup: initialContinentalCup,
        statsTimeline: initPayload.initTimeline, clubStints: [initPayload.initStint],
        hiddenStats: initPayload.hiddenStats,
        contractYearsTotal: initPayload.contractYearsTotal,
        contractYearsRemaining: initPayload.contractYearsRemaining,
        currentWageAnnual: initPayload.currentWageAnnual,
        marketValue: initPayload.marketValue,
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

  const handleStartSeason = useCallback(() => {
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
      setCareerSubStep("dir_increase");
      return;
    }

    setCareerSubStep("standing");
  }, [currentAge, currentClub, statsProps]);

  useEffect(() => {
    if (!autoStartSeasonRef.current || mode !== "career") return;
    autoStartSeasonRef.current = false;
    handleStartSeason();
  }, [currentAge, mode, handleStartSeason]);

  function handleCareerSpin() {
    if (isProcessing || careerSpinning || careerSubStep === "idle" || careerSubStep === "resolved"
      || careerSubStep === "season_stats" || careerWheelItems.length === 0) return;
    if (careerSubStep === "ballon_dor_nomination" && ballonDorNominationWeight === 0) return;

    const ctx = {
      currentAge, playerDebutAge, playerCareerLength, currentOvr, position, yearSimResult, hiddenStats, currentClub,
    leagueSize: currentClub ? (clubs.filter((c) => c.leagueId === currentClub.leagueId).length || 10) : 10,
      lastYearStanding, standingResult,
      currentContinentalCup, playerNationality, selectedStatsList, selectorIndex,
      yearEvolutionDirection: yearEvolution.direction, currentStats,
      ballonDorNominationWeight, ballonDorRankWeights,
      fitnessCoachActive,
      nationalCallupBoostActive,
      eliteDevelopmentActive,
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
    if (COMPETITION_STEPS.has(careerSubStep)) {
      if (result !== null) competitionFlow.handleSpinComplete(careerSubStep, result);
    } else {
      if (result !== null) statFlow.handleSpinComplete(careerSubStep, result);
    }
  }

  function handleAcceptTransfer(accept: boolean) {
    if (isProcessing) return;
    setIsProcessing(true);
    statsProps.handleAcceptTransfer(
      accept,
      transferOffer,
      clubs,
      setTransferOffer,
      setCareerSubStep,
      () => {
        setTransferMarket(null);
        setShowShortlist(false);
        setApproachRejects({});
        setApproachBanner(null);
      },
    );
    setIsProcessing(false);
  }

  function handleAcceptMarketOffer(offer: ContractOfferCard) {
    console.log("[Transfer Flow] User accepted offer:", offer.clubName, offer);
    setTransferOffer(offer);
    statsProps.handleAcceptTransfer(
      true,
      offer,
      clubs,
      setTransferOffer,
      setCareerSubStep,
      () => {
        setTransferMarket(null);
        setShowShortlist(false);
        setWillingToMove(false);
        setApproachRejects({});
        setApproachBanner(null);
      },
    );
  }

  function handleRejectTransferWindow() {
    if (isProcessing) return;
    console.log("[Transfer Flow] User bypassed/rejected transfer window. Staying at current club. Transitioning careerSubStep to 'resolved'.");
    const remaining = transferMarket?.contract.yearsRemaining ?? statsProps.contractYearsRemaining;
    const fa = remaining <= 0 || statsProps.isUnemployed || !currentClub;
    if (fa) {
      statsProps.enterUnemployed();
    }
    setTransferOffer(null);
    setTransferMarket(null);
    setShowShortlist(false);
    setApproachRejects({});
    setApproachBanner(null);
    setCareerSubStep("resolved");
  }

  async function handleApproachShortlist(club: ShortlistClubCard, wageOption?: WageDealOption): Promise<boolean> {
    if (isProcessing || !transferMarket || !club.canApproach || club.acceptChance == null) return false;
    if (approachRejects[club.clubId]) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    try {
      const selectedOption = wageOption ?? "standard";
      const adjustedChance = applyWageDealChance(club.acceptChance, selectedOption);
      const effPosOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);

      const res = await resolveShortlistApproachAction({
        clubId: club.clubId,
        clubName: club.clubName,
        leagueId: club.leagueId,
        leagueName: club.leagueName,
        prestige: club.prestige,
        leagueTier: club.leagueTier,
        previewFee: club.previewFee,
        previewWage: club.previewWage,
        previewYears: club.previewYears,
        wageOption: selectedOption,
        clientAcceptChance: adjustedChance,
        currentOvr,
        effPositionOvr: effPosOvr,
        currentAge,
        matchRating: yearSimResult?.matchRating ?? 6.0,
        contractYearsRemaining: statsProps.contractYearsRemaining,
        isUnemployed: statsProps.isUnemployed || !currentClub,
        influenceScore: statsProps.influenceScore,
      });

      if (res.accepted) {
        console.log(`[Transfer Flow] Approach to ${club.clubName} ACCEPTED!`);
        setApproachBanner(`${club.clubName} đồng ý ký (${approachChancePercent(res.acceptChance)}%)`);
        handleAcceptMarketOffer(res.offer);
        return true;
      } else {
        console.log(`[Transfer Flow] Approach to ${club.clubName} REJECTED.`);
        setApproachRejects((prev) => ({
          ...prev,
          [club.clubId]: { chance: res.acceptChance, reason: res.rejectReason },
        }));
        setApproachBanner(
          `${club.clubName} đã từ chối (Tỷ lệ đàm phán ${approachChancePercent(res.acceptChance)}%) — ${res.rejectReason}`,
        );
        return false;
      }
    } catch (err) {
      console.error("Approach resolve failed:", err);
      setApproachBanner("Không thể ngỏ lời — thử lại");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleProactiveRenewal(wageOption?: WageDealOption): Promise<boolean> {
    if (
      isProcessing ||
      !currentClub ||
      proactiveRenewalInFlightRef.current ||
      proactiveRenewalRejectedAge === currentAge
    ) return false;
    proactiveRenewalInFlightRef.current = true;
    setIsProcessing(true);
    setApproachBanner(null);
    const retireAge = playerDebutAge + playerCareerLength;
    try {
      const res = await resolveProactiveRenewalAction({
        currentClubId: currentClub.id,
        currentClubName: currentClub.name,
        currentClubLeagueId: currentClub.leagueId,
        currentClubLeagueName: currentClub.leagueName,
        currentClubPrestige: currentClub.prestige,
        currentClubLeagueTier: currentClub.leagueTier,
        currentOvr,
        currentStats: statsProps.statsTimeline?.[statsProps.statsTimeline.length - 1] as Record<string, number> | undefined,
        position,
        currentAge,
        retireAge,
        matchRating: yearSimResult?.matchRating ?? 6.0,
        goals: yearSimResult?.goals ?? 0,
        assists: yearSimResult?.assists ?? 0,
        cleanSheets: yearSimResult?.cleanSheets ?? 0,
        contractYearsRemaining: statsProps.contractYearsRemaining,
        currentWageAnnual: statsProps.currentWageAnnual,
        wageOption,
      });

      if (res.accepted) {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} ACCEPTED!`);
        setApproachBanner(`Gia hạn thành công với ${currentClub.name}!`);
        handleAcceptMarketOffer(res.offer);
        return true;
      } else {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} REJECTED.`);
        setProactiveRenewalRejectedAge(currentAge);
        setApproachBanner(`Gia hạn không thành công — ${res.rejectReason}`);
        return false;
      }
    } catch (err) {
      console.error("Proactive renewal failed:", err);
      setApproachBanner("Không thể gửi đề nghị gia hạn — thử lại");
      return false;
    } finally {
      proactiveRenewalInFlightRef.current = false;
      setIsProcessing(false);
    }
  }

  async function handleSearchClubs(params: {
    query?: string;
    leagueId?: string;
    prestigeMin?: number;
    prestigeMax?: number;
    page: number;
  }) {
    const retireAge = playerDebutAge + playerCareerLength;
    return searchClubsForApproachAction({
      ...params,
      currentClubId: currentClub?.id ?? null,
      currentOvr,
      currentStats: statsProps.statsTimeline?.[statsProps.statsTimeline.length - 1] as Record<string, number> | undefined,
      currentAge,
      retireAge,
      matchRating: yearSimResult?.matchRating ?? 6.0,
      position,
      contractYearsRemaining: statsProps.contractYearsRemaining,
      isUnemployed: statsProps.isUnemployed || !currentClub,
      influenceScore: statsProps.influenceScore,
    });
  }

  function handleSetWillingToMove(v: boolean) {
    setWillingToMove(v);
    if (careerSubStep === "transfer") {
      setIsProcessing(true);
      setApproachRejects({});
      void statFlow.triggerTransferCheck({ willingToMove: v, stayOnWindow: true });
    }
  }

  function advanceToNextSeason(autoStart = false) {
    const canAdvanceFromCompletedSeason = ["resolved", "transfer"].includes(careerSubStep);
    const isHydratedModuleReturn = autoStart && careerSubStep === "idle";
    if (isProcessing || (!canAdvanceFromCompletedSeason && !isHydratedModuleReturn)) return;
    if (autoStart) autoStartSeasonRef.current = true;
    setIsProcessing(true);
    const { isRetire } = statsProps.handleNextSeason(
      standingResult, domesticCupResult, continentalCupResult,
      nationalCallupResult, nationalTournamentResult, yearSimResult, ballonDorRank,
    );
    if (isRetire) {
      autoStartSeasonRef.current = false;
      setMode("retired");
    } else {
      resetSeasonState();
      setCareerSubStep("idle");
    }
    setIsProcessing(false);
  }

  function handleNextSeason() {
    advanceToNextSeason();
  }

  function handleContinueFromShop() {
    if (isProcessing || shopTargetSeason === null) return;
    if (careerSubStep === "idle") {
      setActiveModal(null);
      handleStartSeason();
      return;
    }
    if (careerSubStep === "resolved") {
      advanceToNextSeason(true);
    }
  }

  function handleShopReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      advanceToNextSeason(true);
      return;
    }
    if (careerSubStep === "idle") handleStartSeason();
  }

  function handleTransferReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      advanceToNextSeason(true);
      return;
    }
    if (careerSubStep === "idle") handleStartSeason();
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
    startCareerError,
    careerSpinning, careerWheelItems, careerTargetIndex, careerTempValue,
    yearEvolution, evolvedStatsThisYear,
    standingResult, domesticCupResult, continentalCupResult,
    nationalCallupResult, nationalTournamentResult,
    yearSimResult, transferOffer, transferMarket, willingToMove, showShortlist,
    approachRejects, approachBanner,
    proactiveRenewalRejected: proactiveRenewalRejectedAge === currentAge,
    hasBallonDorWinner,
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
    handleStartCareer, handleStartSeason, handleCareerSpin,
    handleCareerSpinComplete, handleAcceptTransfer, handleAcceptMarketOffer,
    handleRejectTransferWindow, handleApproachShortlist, handleProactiveRenewal, handleSearchClubs, handleSetWillingToMove,
    setShowShortlist, handleNextSeason, handleContinueFromShop, handleShopReturn, handleTransferReturn,
    persistCurrentProgress,
    handleSeasonStatsModalClose: competitionFlow.handleSeasonStatsModalClose,
    handleSavePlayer: statsProps.handleSavePlayer,
    STEP_LABELS: getStepLabels(position),
    selectorIndex, tempSelectedStat,
  };
}
