"use client";

import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getContinentalCupLabel } from "../lib/simulation-helpers";
import {
  simulatePlayerSeasonAction,
  generateLeagueTableAction,
  generateCupJourneyAction,
} from "@/actions/season.actions";
import type { ModalType } from "./useDraftDrum";

interface CompetitionFlowProps {
  currentAge: number;
  currentOvr: number;
  position: string;
  currentClub: any;
  currentContinentalCup: string;
  playerNationality: string;
  playerDebutAge: number;
  hiddenStats: any;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  yearSimResult: any;
  setStandingResult: (v: number | null) => void;
  setDomesticCupResult: (v: string | null) => void;
  setContinentalCupResult: (v: string | null) => void;
  setNationalCallupResult: (v: string | null) => void;
  setNationalTournamentResult: (v: string | null) => void;
  setCareerSubStep: (v: any) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (v: ModalType) => void;
  setYearSimResult: (v: any) => void;
  setBallonDorNominationWeight: (v: number) => void;
  setBallonDorRankWeights: (v: number[]) => void;
  applySimResultToRecords: (age: number, result: any) => void;
  setSeasonRecords: (fn: (prev: any) => any) => void;
  checkNationalCallupTransition: () => "national_callup" | "trigger_stats";
}

export function useCompetitionFlow(p: CompetitionFlowProps) {
  async function triggerSeasonStats(
    standing: number | null,
    domestic: string | null,
    continental: string | null,
    callup: string | null,
    tournament: string | null
  ) {
    const luck = p.hiddenStats?.luckRating ?? 10;
    const nationCup = getNationalContinentalCup(p.playerNationality);
    const currentYear = 2026 + (p.currentAge - p.playerDebutAge);
    const nationalTournamentType = callup === "called_up"
      ? (currentYear % 4 === 2 ? "FIFA World Cup" : nationCup)
      : null;

    try {
      const simRes = await simulatePlayerSeasonAction({
        age: p.currentAge,
        ovr: p.currentOvr,
        position: p.position,
        luckRating: luck,
        clubPrestige: p.currentClub?.prestige ?? 3,
        clubName: p.currentClub.name,
        leagueName: p.currentClub.leagueName,
        leagueId: p.currentClub.leagueId,
        hasContinentalCup: p.currentContinentalCup !== "none",
        playerNationality: p.playerNationality,
        standingResult: standing,
        domesticCupResult: domestic,
        continentalCupResult: continental,
        continentalCupType: p.currentContinentalCup !== "none" ? p.currentContinentalCup : null,
        nationalCallupResult: callup,
        nationalTournamentResult: tournament,
        nationalTournamentType,
      });

      p.setYearSimResult(simRes);
      p.setBallonDorNominationWeight(simRes.ballonDor.nominationWeight);
      p.setBallonDorRankWeights(simRes.ballonDor.rankWeights);
      p.applySimResultToRecords(p.currentAge, simRes);
      p.setActiveModal("season_stats");
      p.setCareerSubStep("season_stats");
    } catch (err) {
      console.error("Error simulating season:", err);
      p.setCareerSubStep("dir_increase");
    } finally {
      p.setIsProcessing(false);
    }
  }

  function handleSeasonStatsModalClose() {
    p.setActiveModal(null);
    if (p.yearSimResult?.ballonDor.eligible) {
      p.setCareerSubStep("ballon_dor_nomination");
    } else {
      p.setCareerSubStep("dir_increase");
    }
  }

  function handleSpinComplete(subStep: string, result: any) {
    if (subStep === "standing") {
      const standingVal = result as number;
      p.setStandingResult(standingVal);
      generateLeagueTableAction({
        leagueId: p.currentClub.leagueId,
        playerClubId: p.currentClub.id,
        playerClubName: p.currentClub.name,
        playerStanding: standingVal,
      }).then((mockTable) => {
        p.setSeasonRecords((prev) => {
          const rec = { ...prev[p.currentAge] };
          rec.standing = standingVal;
          rec.leagueTable = mockTable;
          return { ...prev, [p.currentAge]: rec };
        });
        p.setActiveModal("league");
        p.setCareerSubStep("domestic_cup");
        p.setIsProcessing(false);
      }).catch((err) => {
        console.error("Error generating league table:", err);
        p.setCareerSubStep("domestic_cup");
        p.setIsProcessing(false);
      });
    }
    else if (subStep === "domestic_cup") {
      const cupVal = result as string;
      p.setDomesticCupResult(cupVal);
      generateCupJourneyAction({
        type: "domestic",
        result: cupVal,
        playerClubId: p.currentClub.id,
        playerClubPrestige: p.currentClub.prestige ?? 3,
      }).then((journey) => {
        p.setSeasonRecords((prev) => {
          const rec = { ...prev[p.currentAge] };
          rec.domesticCup = cupVal;
          rec.domesticCupJourney = journey;
          return { ...prev, [p.currentAge]: rec };
        });
        p.setActiveModal("cup");
        if (p.currentContinentalCup !== "none") {
          p.setCareerSubStep("continental_cup");
          p.setIsProcessing(false);
        } else {
          const next = p.checkNationalCallupTransition();
          if (next === "national_callup") {
            p.setCareerSubStep("national_callup");
            p.setIsProcessing(false);
          } else {
            triggerSeasonStats(p.standingResult, cupVal, p.continentalCupResult, null, null);
          }
        }
      }).catch((err) => {
        console.error("Error generating domestic cup journey:", err);
        if (p.currentContinentalCup !== "none") {
          p.setCareerSubStep("continental_cup");
          p.setIsProcessing(false);
        } else {
          const next = p.checkNationalCallupTransition();
          if (next === "national_callup") {
            p.setCareerSubStep("national_callup");
            p.setIsProcessing(false);
          } else {
            triggerSeasonStats(p.standingResult, cupVal, p.continentalCupResult, null, null);
          }
        }
      });
    }
    else if (subStep === "continental_cup") {
      const contVal = result as string;
      p.setContinentalCupResult(contVal);
      const cupLabel = getContinentalCupLabel(p.currentContinentalCup);
      generateCupJourneyAction({
        type: "continental",
        result: contVal,
        playerClubId: p.currentClub.id,
        playerClubPrestige: p.currentClub.prestige ?? 3,
        cupName: cupLabel,
        cupType: p.currentContinentalCup,
      }).then((journey) => {
        p.setSeasonRecords((prev) => {
          const rec = { ...prev[p.currentAge] };
          if (rec.continentalCup) rec.continentalCup.result = contVal;
          rec.continentalCupJourney = journey;
          return { ...prev, [p.currentAge]: rec };
        });
        p.setActiveModal("continental");
        const next = p.checkNationalCallupTransition();
        if (next === "national_callup") {
          p.setCareerSubStep("national_callup");
          p.setIsProcessing(false);
        } else {
          triggerSeasonStats(p.standingResult, p.domesticCupResult, contVal, null, null);
        }
      }).catch((err) => {
        console.error("Error generating continental cup journey:", err);
        const next = p.checkNationalCallupTransition();
        if (next === "national_callup") {
          p.setCareerSubStep("national_callup");
          p.setIsProcessing(false);
        } else {
          triggerSeasonStats(p.standingResult, p.domesticCupResult, contVal, null, null);
        }
      });
    }
    else if (subStep === "national_callup") {
      const callupVal = result as string;
      p.setNationalCallupResult(callupVal);
      p.setSeasonRecords((prev) => {
        const rec = { ...prev[p.currentAge] };
        if (rec.nationalTeam) rec.nationalTeam.callup = callupVal === "called_up" ? "Được triệu tập" : "Không được gọi";
        return { ...prev, [p.currentAge]: rec };
      });
      if (callupVal === "called_up") {
        p.setCareerSubStep("national_tournament");
        p.setIsProcessing(false);
      } else {
        triggerSeasonStats(p.standingResult, p.domesticCupResult, p.continentalCupResult, callupVal, null);
      }
    }
    else if (subStep === "national_tournament") {
      const tournamentVal = result as string;
      p.setNationalTournamentResult(tournamentVal);
      const nationCup = getNationalContinentalCup(p.playerNationality);
      const currentYear = 2026 + (p.currentAge - p.playerDebutAge);
      const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
      generateCupJourneyAction({
        type: "national",
        result: tournamentVal,
        playerClubId: p.currentClub.id,
        playerClubPrestige: p.currentClub.prestige ?? 3,
        cupName: tourney,
        playerNationality: p.playerNationality,
      }).then((journey) => {
        p.setSeasonRecords((prev) => {
          const rec = { ...prev[p.currentAge] };
          if (rec.nationalTeam) rec.nationalTeam.result = tournamentVal;
          rec.nationalTeamJourney = journey;
          return { ...prev, [p.currentAge]: rec };
        });
        p.setActiveModal("national");
        triggerSeasonStats(p.standingResult, p.domesticCupResult, p.continentalCupResult, p.nationalCallupResult, tournamentVal);
      }).catch((err) => {
        console.error("Error generating national team journey:", err);
        triggerSeasonStats(p.standingResult, p.domesticCupResult, p.continentalCupResult, p.nationalCallupResult, tournamentVal);
      });
    }
  }

  return { triggerSeasonStats, handleSpinComplete, handleSeasonStatsModalClose };
}
