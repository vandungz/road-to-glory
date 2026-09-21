"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { hydrateCurrentSeasonRecord } from "../lib/season-record-hydration";
import { shouldResumeSeasonStatsModal } from "../lib/career-resume-state";
import { getCareerPlayerAction } from "@/actions/player.actions";
import { AWARD_MODEL_VERSION } from "@/types/awards";
import type { SeasonRecord } from "@/types/game";
import type { CareerSubStep, ClubSummary, StatSnapshot, ClubStint, AchievementRecord } from "@/types/domain";
import type { ShopInventoryEntry } from "@/lib/shop-catalog";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { useCareerStats } from "./useCareerStats";
import { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";

type DraftMode = "setup" | "career" | "retired";

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

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;

export interface DraftDrumHydrationProps {
  savedPlayerId?: string;
  savedContinentalCup?: string;
  initialMode: DraftMode;
  position: string;
  clubs: ClubSummary[];
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  resetDraft: () => void;
  setMode: Dispatch<SetStateAction<DraftMode>>;
  setIsMounted: Dispatch<SetStateAction<boolean>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
  setStandingResult: Dispatch<SetStateAction<number | null>>;
  setDomesticCupResult: Dispatch<SetStateAction<string | null>>;
  setContinentalCupResult: Dispatch<SetStateAction<string | null>>;
  setNationalCallupResult: Dispatch<SetStateAction<string | null>>;
  setNationalTournamentResult: Dispatch<SetStateAction<string | null>>;
  setYearEvolution: Dispatch<SetStateAction<{
    direction: "increase" | "decrease" | "maintain" | null;
    count: number | null;
  }>>;
  setSelectorIndex: Dispatch<SetStateAction<number>>;
  setSelectedStatsList: Dispatch<SetStateAction<string[]>>;
  setEvolvedStatsThisYear: Dispatch<SetStateAction<{ stat: string; delta: number }[]>>;
  setBallonDorNominationWeight: Dispatch<SetStateAction<number>>;
  setBallonDorRankWeights: Dispatch<SetStateAction<number[]>>;
  setYearSimResult: Dispatch<SetStateAction<SimulatedSeasonResult | null>>;
  setActiveModal: (value: "season_stats") => void;
  prevAgeRef: MutableRefObject<number | null>;
  autoStartSeasonRef: MutableRefObject<boolean>;
}

export function useDraftDrumHydration({
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
  setActiveModal,
  prevAgeRef,
  autoStartSeasonRef,
}: DraftDrumHydrationProps) {

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
}
