"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getNationalTournamentName } from "../lib/simulation-helpers";
import { hydrateCurrentSeasonRecord } from "../lib/season-record-hydration";
import { getCareerWheelPoolAndValue } from "../lib/career-wheel-resolver";
import { useSetupStage } from "./useSetupStage";
import { useCareerStats } from "./useCareerStats";
import { useCareerWheelItems } from "./useCareerWheelItems";
import { useCompetitionFlow } from "./useCompetitionFlow";
import { useStatEvolutionFlow } from "./useStatEvolutionFlow";
import { isCareerRevisionConflict, useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import {
  startPlayerCareerAction,
  updateSeasonProgressAction,
  resolveShortlistApproachAction,
  resolveProactiveRenewalAction,
  searchClubsForApproachAction,
  purchaseShopItemAction,
} from "@/actions/season.actions";
import { purchaseShopItemCommandAction } from "@/actions/career-command.actions";
import { initCareerPlayerAction, getCareerPlayerAction } from "@/actions/player.actions";
import {
  completeTransferCommandAction,
  resolveTransferNegotiationCommandAction,
  searchTransferClubsCommandAction,
} from "@/actions/career-transfer.actions";
import { type SeasonRecord, getStepLabels } from "@/types/game";
import { AWARD_MODEL_VERSION, AWARD_RESOLUTION_VERSION } from "@/types/awards";
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
import { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";
import { shouldResumeSeasonStatsModal } from "../lib/career-resume-state";
import { getPriorClubStanding } from "../lib/previous-season-standing";

interface ResumeCareerPlayer {
  name: string;
  nationality: string;
  debutAge: number;
  careerLengthYears: number;
  peakOvr?: number;
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
  currentAge?: number | null;
  currentStep?: string | null;
  currentWheel?: string | null;
  checkpointVersion?: number;
  revision?: number;
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
    awardSimulation: {
      modelVersion: AWARD_MODEL_VERSION,
      resolutionVersion: AWARD_RESOLUTION_VERSION,
      candidateUniverseSize: 0,
      snapshots: [],
      honours: [],
      ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [], snapshotKey: "" },
    },
  };
}

export type ModalType = "league" | "cup" | "continental" | "national" | "ballon_dor_nomination" | "season_stats" | "season_recap" | "transfer" | "shop" | null;

export type BallonDorResult =
  | { phase: "nomination"; nominated: boolean }
  | { phase: "ranking"; rank: number };

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
  useEffect(() => {
    const controller = new AbortController();
    if (savedPlayerId) {
      getCareerPlayerAction({ playerId: savedPlayerId })
        .then(async (player) => {
          if (controller.signal.aborted || !player) return;
          const playerRecord = player as unknown as ResumeCareerPlayer;
          const progress = await checkpointSync.hydrate(savedPlayerId).catch((error) => {
            // Legacy rows can still be opened while the projection is being
            // rolled out. Keep the old resume path if the V2 read is unavailable.
            console.error("Career checkpoint hydration failed:", error);
            if ((playerRecord.checkpointVersion ?? 1) >= 2) {
              // Do not fall back to client RNG for a V2 career when its
              // authoritative read failed. The transport stays enabled and
              // will fail closed until a fresh hydration succeeds.
              checkpointSync.attach({
                playerId: savedPlayerId,
                revision: playerRecord.revision ?? 0,
                checkpointVersion: playerRecord.checkpointVersion ?? 2,
                currentAge: playerRecord.currentAge ?? null,
                currentStep: playerRecord.currentStep ?? null,
                currentWheel: playerRecord.currentWheel ?? "career",
              });
            }
            return null;
          });
          if (controller.signal.aborted) return;
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
          statsProps.setPeakOvr(playerRecord.peakOvr ?? lastStats.ovr);
          statsProps.setAchievements(playerRecord.achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] });

          const restoredSeasonRecords: Record<number, SeasonRecord> = {};
          if (playerRecord.seasonHistory) {
            for (const [k, v] of Object.entries(playerRecord.seasonHistory)) {
              restoredSeasonRecords[parseInt(k)] = v;
            }
          }

          const persistedAge = typeof playerRecord.currentAge === "number"
            ? playerRecord.currentAge
            : lastStats.age;
          statsProps.setCurrentAge(persistedAge);
          statsProps.setSelectedAgeForStats(persistedAge);
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

          const runtime = progress?.currentSeason?.runtimeState;
          const runtimeRecord = runtime !== null && typeof runtime === "object" && !Array.isArray(runtime)
            ? runtime as Record<string, unknown>
            : {};
          const runtimeArray = (key: string): unknown[] =>
            Array.isArray(runtimeRecord[key]) ? runtimeRecord[key] : [];
          const runtimeString = (key: string): string | null =>
            typeof runtimeRecord[key] === "string" ? runtimeRecord[key] as string : null;
          const runtimeNumber = (key: string): number | null =>
            typeof runtimeRecord[key] === "number" ? runtimeRecord[key] as number : null;
          const authoritativeContinentalCup = runtimeString("continentalCupType")
            ?? progress?.player.currentContinentalCup
            ?? savedContinentalCup
            ?? "none";

          const currentSeason = progress?.currentSeason;
          if (currentSeason?.status === "in_progress") {
            restoredSeasonRecords[currentSeason.age] = hydrateCurrentSeasonRecord({
              existing: restoredSeasonRecords[currentSeason.age],
              age: currentSeason.age,
              clubId: currentSeason.clubId ?? lastStint.clubId,
              clubName: currentSeason.clubName ?? lastStint.clubName,
              leagueName: currentSeason.leagueName ?? lastStint.leagueName,
              leagueId: currentSeason.leagueId ?? lastStint.leagueId,
              continentalType: authoritativeContinentalCup,
              nationality: playerRecord.nationality,
              debutAge: playerRecord.debutAge,
              runtimeState: runtimeRecord,
            });
          }
          statsProps.setSeasonRecords(restoredSeasonRecords);

          let restoredStep = (progress?.player.currentStep ?? playerRecord.currentStep) as CareerSubStep | null;
          // Older V2 rows could be left at `transfer` after the final season
          // because the client tried to open a market that the server correctly
          // rejected. Treat that persisted state as the terminal resolved state
          // so resume cannot expose a transfer/shop action for a career with no
          // next season.
          const isPersistedFinalSeason = persistedAge >= playerRecord.debutAge + playerRecord.careerLengthYears;
          if (isPersistedFinalSeason && restoredStep === "transfer") {
            restoredStep = "resolved";
          }
          // A career that was left at the final age before the auto-start
          // recovery existed has no valid Shop window. Resume it by opening
          // the final season on the server instead of leaving the user on a
          // disabled Shop entry with no path forward.
          if (isPersistedFinalSeason && restoredStep === "idle") {
            autoStartSeasonRef.current = true;
          }
          setStandingResult(runtimeNumber("standingResult"));
          setDomesticCupResult(runtimeString("domesticCupResult"));
          setContinentalCupResult(runtimeString("continentalCupResult"));
          setNationalCallupResult(runtimeString("nationalCallupResult"));
          setNationalTournamentResult(runtimeString("nationalTournamentResult"));
          setYearEvolution({
            direction: runtimeRecord.yearEvolutionDirection === "increase" || runtimeRecord.yearEvolutionDirection === "decrease" || runtimeRecord.yearEvolutionDirection === "maintain"
              ? runtimeRecord.yearEvolutionDirection
              : null,
            count: runtimeNumber("evolutionCount"),
          });
          setSelectorIndex(runtimeNumber("selectorIndex") ?? 0);
          setSelectedStatsList(runtimeArray("selectedStatsList").filter((value): value is string => typeof value === "string"));
          setEvolvedStatsThisYear(runtimeArray("evolvedStatsThisYear").filter((value): value is { stat: string; delta: number } => {
            if (!value || typeof value !== "object" || Array.isArray(value)) return false;
            const record = value as Record<string, unknown>;
            return typeof record.stat === "string" && typeof record.delta === "number";
          }));
          setBallonDorNominationWeight(runtimeNumber("ballonDorNominationWeight") ?? 0);
          setBallonDorRankWeights(runtimeArray("ballonDorRankWeights").filter((value): value is number => typeof value === "number"));
          let restoredYearResult = runtimeRecord.yearSimResult;
          const restoredAwardSimulation = restoredYearResult && typeof restoredYearResult === "object" && !Array.isArray(restoredYearResult)
            ? (restoredYearResult as Record<string, unknown>).awardSimulation
            : null;
          const hasStaleAwardSimulation = !restoredAwardSimulation || typeof restoredAwardSimulation !== "object" || Array.isArray(restoredAwardSimulation)
            ? true
            : (restoredAwardSimulation as Record<string, unknown>).modelVersion !== AWARD_MODEL_VERSION;
          if (
            restoredStep === "season_stats" &&
            ((!restoredYearResult || typeof restoredYearResult !== "object" || Array.isArray(restoredYearResult)) || hasStaleAwardSimulation) &&
            progress !== null && progress.player.checkpointVersion >= 2
          ) {
            try {
              const committed = await checkpointSync.commitSeasonStats();
              restoredYearResult = committed.seasonStats;
              restoredStep = committed.nextStep as CareerSubStep;
            } catch (error) {
              console.error("Resume season stats commit failed:", error);
            }
          }
          if (restoredYearResult && typeof restoredYearResult === "object" && !Array.isArray(restoredYearResult)) {
            const restoredStats = restoredYearResult as SimulatedSeasonResult;
            setYearSimResult(restoredStats);
            setBallonDorNominationWeight(restoredStats.ballonDor.nominationWeight);
            setBallonDorRankWeights(restoredStats.ballonDor.rankWeights);
          }

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
              prestige: fullClub?.prestige ?? 3, continentalType: authoritativeContinentalCup,
            });
            statsProps.setCurrentContinentalCup(authoritativeContinentalCup);
          }

          prevAgeRef.current = persistedAge;
          setCareerSubStep(restoredStep && restoredStep !== "season_stats" ? restoredStep : "idle");
          const lastWheelStep = runtimeRecord.lastWheel && typeof runtimeRecord.lastWheel === "object" && !Array.isArray(runtimeRecord.lastWheel)
            ? (runtimeRecord.lastWheel as Record<string, unknown>).stepKey
            : null;
          if (shouldResumeSeasonStatsModal(restoredStep, restoredYearResult, lastWheelStep)) {
            setActiveModal("season_stats");
            setCareerSubStep("season_stats");
          }
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
    // V2 checkpoints already persist the complete authoritative transition.
    // Do not send the legacy aggregate snapshot after a season transition:
    // it would increment revision again and reintroduce client-owned writes.
    if (checkpointSync.isEnabled) return;
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
    if (checkpointSync.isEnabled) return !isProcessing;
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
  const isFinalCareerSeason = currentAge >= playerDebutAge + playerCareerLength;
  const shopTargetSeason =
    !isFinalCareerSeason && careerSubStep === "resolved" ? currentAge + 1
      : !isFinalCareerSeason && careerSubStep === "idle" ? currentAge
        : null;

  async function handlePurchaseShopItem(itemId: string): Promise<void> {
    const pid = statsProps.playerId;
    if (!pid || isProcessing || shopTargetSeason === null) return;
    setIsProcessing(true);
    try {
      const { revision } = checkpointSync.state;
      const requestKey = `${pid}:${itemId}:${shopTargetSeason}:${revision ?? "legacy"}`;
      const idempotencyKey = shopCommandKeysRef.current.get(requestKey) ?? globalThis.crypto.randomUUID();
      shopCommandKeysRef.current.set(requestKey, idempotencyKey);
      if (checkpointSync.isEnabled && revision === null) {
        throw new Error("Thiếu revision checkpoint hiện tại");
      }
      const result = checkpointSync.isEnabled
        ? await purchaseShopItemCommandAction({
            playerId: pid,
            itemId,
            targetSeason: shopTargetSeason,
            expectedRevision: revision,
            idempotencyKey,
          })
        : await purchaseShopItemAction({
            playerId: pid,
            itemId,
            currentAge,
            targetSeason: shopTargetSeason,
          });
      shopCommandKeysRef.current.delete(requestKey);
      statsProps.setWalletBalance(result.walletBalance);
      statsProps.setShopInventory(result.shopInventory as ShopInventoryEntry[]);
      if ("revision" in result) checkpointSync.applyShopPurchase(result.revision);
    } catch (err) {
      console.error("Purchase shop item failed:", err);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
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
            age: currentAge, clubId: currentClub.id, clubName: currentClub.name, leagueName: currentClub.leagueName,
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
  }, [applyAuthoritativeSeasonTicket, checkpointSync, currentAge, currentClub, isProcessing, statsProps]);

  useEffect(() => {
    // The season transition updates currentAge before the async transition
    // handler releases isProcessing. If this effect consumed the flag during
    // that intermediate render, handleStartSeason would return immediately
    // and the new season would remain at the idle Shop gate forever.
    if (!autoStartSeasonRef.current || mode !== "career" || isProcessing) return;
    autoStartSeasonRef.current = false;
    void handleStartSeason();
  }, [currentAge, handleStartSeason, isProcessing, mode]);

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
    leagueSize: currentClub ? (clubs.filter((c) => c.leagueId === currentClub.leagueId).length || 10) : 10,
      priorClubStanding, standingResult,
      currentContinentalCup, playerNationality, selectedStatsList, selectorIndex,
      yearEvolutionDirection: yearEvolution.direction, currentStats,
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

  async function commitTransferSelection(
    offer: ContractOfferCard,
    wageOption: WageDealOption = "standard",
  ): Promise<ContractOfferCard | null> {
    if (!checkpointSync.isEnabled) return offer;
    const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
    if (!syncPlayerId || !seasonId || revision === null) {
      setApproachBanner("Không thể xác nhận chuyển nhượng — thiếu checkpoint mùa hiện tại.");
      return null;
    }
    try {
      const result = await completeTransferCommandAction({
        playerId: syncPlayerId,
        seasonId,
        expectedRevision: revision,
        idempotencyKey: transferCommandKeyRef.current ?? (
          transferCommandKeyRef.current = globalThis.crypto.randomUUID()
        ),
        kind: offer.kind,
        clubId: offer.clubId,
        wageOption,
      });
      checkpointSync.applyTransferCompletion(result);
      return {
        ...offer,
        clubId: result.clubId ?? offer.clubId,
        clubName: result.clubName,
        leagueName: result.leagueName,
        transferFee: result.fee,
        contractYears: result.contractYears,
        wageAnnual: result.wageAnnual,
      };
    } catch (error) {
      console.error("Transfer completion command failed:", error);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      setApproachBanner("Không thể chốt chuyển nhượng — hãy thử lại.");
      return null;
    }
  }

  async function handleAcceptTransfer(accept: boolean, offerOverride?: ContractOfferCard | null) {
    const selectedOffer = offerOverride ?? transferOffer;
    if (isProcessing || !accept || !selectedOffer) return;
    const authoritativeOffer = await commitTransferSelection(selectedOffer);
    if (!authoritativeOffer) return;
    statsProps.handleAcceptTransfer(
      true,
      authoritativeOffer,
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
  }

  async function handleAcceptMarketOffer(
    offer: ContractOfferCard,
    wageOption: WageDealOption = "standard",
  ): Promise<boolean> {
    console.log("[Transfer Flow] User accepted offer:", offer.clubName, offer);
    const ownsProcessing = !isProcessing;
    if (ownsProcessing) setIsProcessing(true);
    try {
      const authoritativeOffer = await commitTransferSelection(offer, wageOption);
      if (!authoritativeOffer) return false;
      setTransferOffer(authoritativeOffer);
      statsProps.handleAcceptTransfer(
        true,
        authoritativeOffer,
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
      return true;
    } finally {
      if (ownsProcessing) setIsProcessing(false);
    }
  }

  async function handleRejectTransferWindow() {
    if (isProcessing) return;
    console.log("[Transfer Flow] User bypassed/rejected transfer window. Staying at current club. Transitioning careerSubStep to 'resolved'.");
    const remaining = transferMarket?.contract.yearsRemaining ?? statsProps.contractYearsRemaining;
    const fa = remaining <= 0 || statsProps.isUnemployed || !currentClub;
    if (checkpointSync.isEnabled) {
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      if (!syncPlayerId || !seasonId || revision === null) {
        setApproachBanner("Không thể chốt ở lại — thiếu checkpoint mùa hiện tại.");
        return;
      }
      setIsProcessing(true);
      try {
        const result = await completeTransferCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          idempotencyKey: transferCommandKeyRef.current ?? (
            transferCommandKeyRef.current = globalThis.crypto.randomUUID()
          ),
          kind: "stay",
        });
        checkpointSync.applyTransferCompletion(result);
      } catch (error) {
        console.error("Stay transfer command failed:", error);
        await checkpointSync.resync();
        setApproachBanner("Không thể chốt ở lại — hãy thử lại.");
        setIsProcessing(false);
        return;
      }
    }
    if (fa) {
      statsProps.enterUnemployed();
    }
    setTransferOffer(null);
    setTransferMarket(null);
    setShowShortlist(false);
    setApproachRejects({});
    setApproachBanner(null);
    setCareerSubStep("resolved");
    setIsProcessing(false);
  }

  async function handleApproachShortlist(club: ShortlistClubCard, wageOption?: WageDealOption): Promise<boolean> {
    if (isProcessing || !transferMarket || !club.canApproach || club.acceptChance == null) return false;
    if (approachRejects[club.clubId]) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    try {
      const selectedOption = wageOption ?? "standard";
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      let res;
      if (checkpointSync.isEnabled) {
        if (!syncPlayerId || !seasonId || revision === null) {
          throw new Error("Thiếu checkpoint mùa hiện tại");
        }
        res = await resolveTransferNegotiationCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          kind: "approach",
          clubId: club.clubId,
          wageOption: selectedOption,
        });
      } else {
        const adjustedChance = applyWageDealChance(club.acceptChance, selectedOption);
        const effPosOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
        res = await resolveShortlistApproachAction({
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
      }

      if (res.accepted) {
        console.log(`[Transfer Flow] Approach to ${club.clubName} ACCEPTED!`);
        setApproachBanner(`${club.clubName} đồng ý ký (${approachChancePercent(res.acceptChance)}%)`);
        return await handleAcceptMarketOffer(res.offer, selectedOption);
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
      if (checkpointSync.isEnabled) await checkpointSync.resync();
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
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      let res;
      if (checkpointSync.isEnabled) {
        if (!syncPlayerId || !seasonId || revision === null) {
          throw new Error("Thiếu checkpoint mùa hiện tại");
        }
        res = await resolveTransferNegotiationCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          kind: "renewal",
          wageOption,
        });
      } else {
        res = await resolveProactiveRenewalAction({
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
      }

      if (res.accepted) {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} ACCEPTED!`);
        setApproachBanner(`Gia hạn thành công với ${currentClub.name}!`);
        return await handleAcceptMarketOffer(res.offer, wageOption);
      } else {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} REJECTED.`);
        setProactiveRenewalRejectedAge(currentAge);
        setApproachBanner(`Gia hạn không thành công — ${res.rejectReason}`);
        return false;
      }
    } catch (err) {
      console.error("Proactive renewal failed:", err);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
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
    const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
    if (checkpointSync.isEnabled) {
      if (!syncPlayerId || !seasonId || revision === null) {
        throw new Error("Thiếu checkpoint mùa hiện tại");
      }
      return searchTransferClubsCommandAction({
        playerId: syncPlayerId,
        seasonId,
        expectedRevision: revision,
        query: params.query,
        leagueId: params.leagueId,
        prestigeMin: params.prestigeMin,
        prestigeMax: params.prestigeMax,
        page: params.page,
        pageSize: 8,
      });
    }
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

  function handleNextSeason() {
    void advanceToNextSeason(false, isFinalCareerSeason ? "skipped" : "completed");
  }

  function handleContinueFromShop() {
    if (isProcessing || shopTargetSeason === null) return;
    if (careerSubStep === "idle") {
      setActiveModal(null);
      void handleStartSeason();
      return;
    }
    if (careerSubStep === "resolved") {
      void advanceToNextSeason(true, "completed");
    }
  }

  function handleShopReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      void advanceToNextSeason(true, "completed");
      return;
    }
    if (careerSubStep === "idle") handleStartSeason();
  }

  function handleTransferReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      void advanceToNextSeason(true, "completed");
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
    handleStartCareer, handleStartSeason, handleCareerSpin,
    handleCareerSpinComplete, handleAcceptTransfer, handleAcceptMarketOffer,
    handleRejectTransferWindow, handleApproachShortlist, handleProactiveRenewal, handleSearchClubs, handleSetWillingToMove,
    setShowShortlist, handleNextSeason, handleContinueFromShop, handleShopReturn, handleTransferReturn,
    persistCurrentProgress,
    handleSeasonStatsModalClose: competitionFlow.handleSeasonStatsModalClose,
    handleCompetitionResultModalClose: competitionFlow.handleCompetitionResultModalClose,
    handleSavePlayer: statsProps.handleSavePlayer,
    STEP_LABELS: getStepLabels(position),
    selectorIndex, tempSelectedStat,
  };
}
