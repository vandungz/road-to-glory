"use client";

import { evolvePlayerStatsAction, generateTransferOfferAction } from "@/actions/season.actions";

interface StatEvolutionFlowProps {
  currentStats: Record<string, number>;
  currentClub: any;
  currentOvr: number;
  position: string;
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
  setYearEvolution: (fn: (prev: any) => any) => void;
  setSelectorIndex: (v: number) => void;
  setTempSelectedStat: (v: string | null) => void;
  setSelectedStatsList: (fn: (prev: string[]) => string[]) => void;
  setEvolvedStatsThisYear: (v: { stat: string; delta: number }[]) => void;
  setCareerSubStep: (v: any) => void;
  setIsProcessing: (v: boolean) => void;
  setTransferOffer: (v: any) => void;
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
  async function triggerTransferCheck() {
    try {
      const res = await generateTransferOfferAction({
        currentClubId: p.currentClub.id,
        currentClubPrestige: p.currentClub.prestige ?? 3,
        currentOvr: p.currentOvr,
        matchRating: p.yearSimResult?.matchRating ?? 6.0,
        goals: p.yearSimResult?.goals ?? 0,
        assists: p.yearSimResult?.assists ?? 0,
        cleanSheets: p.yearSimResult?.cleanSheets ?? 0,
        position: p.position,
      });
      if (res.hasOffer && res.offer) {
        p.setTransferOffer(res.offer);
        p.setCareerSubStep("transfer");
      } else {
        p.setCareerSubStep("resolved");
      }
    } catch (err) {
      console.error("Error checking transfer offer:", err);
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
    }
    else if (subStep === "dir_decrease") {
      if (result === "yes") {
        p.setYearEvolution((prev) => ({ ...prev, direction: "decrease" }));
        p.setCareerSubStep("count");
        p.setIsProcessing(false);
      } else {
        p.setYearEvolution((prev) => ({ ...prev, direction: "maintain" }));
        triggerTransferCheck();
      }
    }
    else if (subStep === "count") {
      // Clamp theo số chỉ số CHƯA đạt max 99 (chỉ khi tăng) — domain count giờ
      // lên tới 6, nếu cầu thủ đã có ≥1 chỉ số max mà roll trúng 6 thì vòng lặp
      // "selector" sẽ không đủ chỉ số hợp lệ để chọn, gây lỗi resolveWeightedOutcome
      // (pool rỗng).
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
    }
    else if (subStep === "selector") {
      p.setTempSelectedStat(result);
      p.setSelectedStatsList((prev) => [...prev, result]);
      p.setCareerSubStep("magnitude");
      p.setIsProcessing(false);
    }
    else if (subStep === "magnitude") {
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
        evolvePlayerStatsAction({ currentStats: p.currentStats, position: p.position, evolutions })
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
    }
    else if (subStep === "ballon_dor_nomination") {
      if (result === "yes") {
        p.setCareerSubStep("ballon_dor_ranking");
      } else {
        p.setCareerSubStep("dir_increase");
      }
      p.setIsProcessing(false);
    }
    else if (subStep === "ballon_dor_ranking") {
      const rank = result as number;
      p.setBallonDorRank(rank);
      if (rank === 1) p.setHasBallonDorWinner(true);
      p.setCareerSubStep("dir_increase");
      p.setIsProcessing(false);
    }
  }

  return { handleSpinComplete, triggerTransferCheck };
}
