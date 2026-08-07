"use client";

import { evolvePlayerStatsAction, generateTransferMarketAction } from "@/actions/season.actions";
import type { TransferMarketResult } from "@/features/transfer/services/transfer.service";

interface StatEvolutionFlowProps {
  currentStats: Record<string, number>;
  currentClub: any;
  currentOvr: number;
  position: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  yearSimResult: any;
  yearEvolution: { direction: "increase" | "decrease" | "maintain" | null; count: number | null };
  selectorIndex: number;
  tempSelectedStat: string | null;
  evolvedStatsThisYear: { stat: string; delta: number }[];
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  nationalTournamentResult: string | null;
  ballonDorRank: number | null;
  contractYearsRemaining: number;
  contractYearsTotal: number;
  currentWageAnnual: number;
  willingToMove: boolean;
  isUnemployed: boolean;
  clubs: any[];
  setYearEvolution: (fn: (prev: any) => any) => void;
  setSelectorIndex: (v: number) => void;
  setTempSelectedStat: (v: string | null) => void;
  setSelectedStatsList: (fn: (prev: string[]) => string[]) => void;
  setEvolvedStatsThisYear: (v: { stat: string; delta: number }[]) => void;
  setCareerSubStep: (v: any) => void;
  setIsProcessing: (v: boolean) => void;
  setTransferOffer: (v: any) => void;
  setTransferMarket: (v: TransferMarketResult | null) => void;
  setMarketValue: (v: number) => void;
  setBallonDorRank: (v: number | null) => void;
  setHasBallonDorWinner: (v: boolean) => void;
  setCurrentStats: (v: Record<string, number>) => void;
  setCurrentOvr: (v: number) => void;
}

const COMPETITION_STEPS = new Set([
  "standing", "domestic_cup", "continental_cup",
  "national_callup", "national_tournament",
]);

export function useStatEvolutionFlow(p: StatEvolutionFlowProps) {
  function isFinalSeason(): boolean {
    const retireAge = p.playerDebutAge + p.playerCareerLength;
    return p.currentAge >= retireAge;
  }

  function resolveLeagueTier(): number {
    const leagueId = p.currentClub?.leagueId as string | undefined;
    if (!leagueId) return 1;
    const sample = p.clubs.find((c: any) => c.leagueId === leagueId || c.id === p.currentClub?.id);
    return sample?.leagueTier ?? sample?.league?.tier ?? 1;
  }

  async function triggerTransferCheck(overrides?: { willingToMove?: boolean; stayOnWindow?: boolean }) {
    if (isFinalSeason()) {
      p.setTransferOffer(null);
      p.setTransferMarket(null);
      p.setCareerSubStep("resolved");
      p.setIsProcessing(false);
      return;
    }

    try {
      const retireAge = p.playerDebutAge + p.playerCareerLength;
      const unemployed = p.isUnemployed || !p.currentClub;
      const res = await generateTransferMarketAction({
        currentClubId: p.currentClub?.id ?? null,
        currentClubPrestige: unemployed ? 2 : (p.currentClub?.prestige ?? 3),
        currentClubLeagueTier: unemployed ? 1 : resolveLeagueTier(),
        currentOvr: p.currentOvr,
        currentAge: p.currentAge,
        retireAge,
        matchRating: p.yearSimResult?.matchRating ?? (unemployed ? 6.0 : 6.0),
        goals: p.yearSimResult?.goals ?? 0,
        assists: p.yearSimResult?.assists ?? 0,
        cleanSheets: p.yearSimResult?.cleanSheets ?? 0,
        position: p.position,
        contractYearsRemaining: p.contractYearsRemaining,
        contractYearsTotal: p.contractYearsTotal,
        currentWageAnnual: p.currentWageAnnual,
        willingToMove: overrides?.willingToMove ?? p.willingToMove,
        isUnemployed: unemployed,
      });

      p.setTransferMarket(res);
      p.setMarketValue(res.marketValue);
      p.setTransferOffer(res.inbound[0] ?? res.renewal ?? null);
      p.setCareerSubStep("transfer");
    } catch (err) {
      console.error("Error checking transfer market:", err);
      p.setCareerSubStep("resolved");
    } finally {
      p.setIsProcessing(false);
    }
  }

  function handleSpinComplete(subStep: string, result: any) {
    if (COMPETITION_STEPS.has(subStep)) return;

    if (subStep === "dir_increase") {
      if (result === "yes") {
        p.setYearEvolution((prev) => ({ ...prev, direction: "increase" }));
        p.setCareerSubStep("count");
      } else {
        p.setCareerSubStep("dir_decrease");
      }
      p.setIsProcessing(false);
    } else if (subStep === "dir_decrease") {
      if (result === "yes") {
        p.setYearEvolution((prev) => ({ ...prev, direction: "decrease" }));
        p.setCareerSubStep("count");
        p.setIsProcessing(false);
      } else {
        p.setYearEvolution((prev) => ({ ...prev, direction: "maintain" }));
        triggerTransferCheck();
      }
    } else if (subStep === "count") {
      let count = result as number;
      if (p.yearEvolution.direction === "increase") {
        const availableCount = Object.values(p.currentStats).filter((v) => v < 99).length;
        count = Math.min(count, Math.max(1, availableCount));
      }
      p.setYearEvolution((prev) => ({ ...prev, count }));
      p.setSelectorIndex(0);
      p.setSelectedStatsList(() => []);
      p.setTempSelectedStat(null);
      p.setCareerSubStep("selector");
      p.setIsProcessing(false);
    } else if (subStep === "selector") {
      p.setTempSelectedStat(result);
      p.setSelectedStatsList((prev) => [...prev, result]);
      p.setCareerSubStep("magnitude");
      p.setIsProcessing(false);
    } else if (subStep === "magnitude") {
      const delta = p.yearEvolution.direction === "increase" ? result : -result;
      const evolutions = [...p.evolvedStatsThisYear, { stat: p.tempSelectedStat!, delta }];
      p.setEvolvedStatsThisYear(evolutions);

      const nextIdx = p.selectorIndex + 1;
      if (nextIdx < (p.yearEvolution.count ?? 1)) {
        p.setSelectorIndex(nextIdx);
        p.setTempSelectedStat(null);
        p.setCareerSubStep("selector");
        p.setIsProcessing(false);
      } else {
        evolvePlayerStatsAction({
          currentStats: p.currentStats,
          position: p.position,
          evolutions,
        })
          .then((res) => {
            p.setCurrentStats(res.nextStats);
            p.setCurrentOvr(res.nextOvr);
            triggerTransferCheck();
          })
          .catch((err) => {
            console.error("Error evolving player stats on backend:", err);
            triggerTransferCheck();
          });
      }
    } else if (subStep === "ballon_dor_nomination") {
      if (result === "yes") {
        p.setCareerSubStep("ballon_dor_ranking");
      } else {
        p.setCareerSubStep("dir_increase");
      }
      p.setIsProcessing(false);
    } else if (subStep === "ballon_dor_ranking") {
      const rank = result as number;
      p.setBallonDorRank(rank);
      if (rank === 1) p.setHasBallonDorWinner(true);
      p.setCareerSubStep("dir_increase");
      p.setIsProcessing(false);
    }
  }

  return { handleSpinComplete, triggerTransferCheck };
}
