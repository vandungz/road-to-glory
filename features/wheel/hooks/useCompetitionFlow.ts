"use client";

import { useRef } from "react";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getContinentalCupLabel, getNationalTournamentName } from "../lib/simulation-helpers";
import {
  simulatePlayerSeasonAction,
  generateLeagueTableAction,
  generateCupJourneyAction,
} from "@/actions/season.actions";
import type { ModalType } from "./useDraftDrum";
import type { CareerSubStep, CurrentClub, HiddenStats } from "@/types/domain";
import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

interface CompetitionFlowProps {
  playerId: string | null;
  currentAge: number;
  currentOvr: number;
  position: string;
  currentClub: CurrentClub;
  currentContinentalCup: string;
  playerNationality: string;
  playerDebutAge: number;
  hiddenStats: HiddenStats | null;
  currentStats: Record<string, number>;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  yearSimResult: SimulatedSeasonResult | null;
  setStandingResult: (v: number | null) => void;
  setDomesticCupResult: (v: string | null) => void;
  setContinentalCupResult: (v: string | null) => void;
  setNationalCallupResult: (v: string | null) => void;
  setNationalTournamentResult: (v: string | null) => void;
  setCareerSubStep: (v: CareerSubStep) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (v: ModalType) => void;
  setYearSimResult: (v: SimulatedSeasonResult | null) => void;
  setBallonDorNominationWeight: (v: number) => void;
  setBallonDorRankWeights: (v: number[]) => void;
  applySimResultToRecords: (age: number, result: SimulatedSeasonResult) => void;
  setSeasonRecords: (fn: (prev: Record<number, SeasonRecord>) => Record<number, SeasonRecord>) => void;
  checkNationalCallupTransition: () => "national_callup" | "trigger_stats";
  /** V2 path: server commits the simulation; legacy careers keep the old action. */
  commitSeasonStats?: () => Promise<{ seasonStats: SimulatedSeasonResult }>;
}

export function useCompetitionFlow(p: CompetitionFlowProps) {
  const pendingAfterCompetitionModalRef = useRef<(() => void) | null>(null);

  function updateCurrentSeasonRecord(updater: (record: SeasonRecord) => SeasonRecord) {
    p.setSeasonRecords((prev) => {
      const existing = prev[p.currentAge];
      if (!existing) return prev;
      return { ...prev, [p.currentAge]: updater({ ...existing }) };
    });
  }

  function showCompetitionResultModal(type: "league" | "cup" | "continental", continueAfterClose?: () => void) {
    pendingAfterCompetitionModalRef.current = continueAfterClose ?? null;
    p.setActiveModal(type);
  }

  async function triggerSeasonStats(
    standing: number | null,
    domestic: string | null,
    continental: string | null,
    callup: string | null,
    tournament: string | null
  ) {
    const luck = p.hiddenStats?.luckRating ?? 10;
    const nationalTournamentType = callup === "called_up"
      ? getNationalTournamentName(
          p.playerNationality, p.currentAge, p.playerDebutAge, getNationalContinentalCup,
        )
      : null;

    try {
      const simRes = p.commitSeasonStats
        ? (await p.commitSeasonStats()).seasonStats
        : await simulatePlayerSeasonAction({
            playerId: p.playerId,
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
            currentStats: p.currentStats,
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
    pendingAfterCompetitionModalRef.current = null;
    p.setActiveModal(null);
    if (p.yearSimResult?.ballonDor.eligible) {
      p.setCareerSubStep("ballon_dor_nomination");
    } else {
      p.setCareerSubStep("dir_increase");
    }
  }

  function handleCompetitionResultModalClose() {
    const continueAfterClose = pendingAfterCompetitionModalRef.current;
    pendingAfterCompetitionModalRef.current = null;
    p.setActiveModal(null);
    continueAfterClose?.();
  }

  function handleSpinComplete(subStep: string, result: string | number) {
    pendingAfterCompetitionModalRef.current = null;
    if (subStep === "standing") {
      const standingVal = result as number;
      p.setStandingResult(standingVal);
      generateLeagueTableAction({
        leagueId: p.currentClub.leagueId,
        playerClubId: p.currentClub.id,
        playerClubName: p.currentClub.name,
        playerStanding: standingVal,
      }).then((mockTable) => {
        updateCurrentSeasonRecord((record) => ({ ...record, standing: standingVal, leagueTable: mockTable }));
        p.setCareerSubStep("domestic_cup");
        p.setIsProcessing(false);
        showCompetitionResultModal("league");
      }).catch((err) => {
        console.error("Error generating league table:", err);
        updateCurrentSeasonRecord((record) => ({ ...record, standing: standingVal }));
        p.setCareerSubStep("domestic_cup");
        p.setIsProcessing(false);
        showCompetitionResultModal("league");
      });
    }
    else if (subStep === "domestic_cup") {
      const cupVal = result as string;
      p.setDomesticCupResult(cupVal);

      const advanceFromDomesticCup = () => {
        if (p.currentContinentalCup !== "none") {
          p.setCareerSubStep("continental_cup");
          p.setIsProcessing(false);
          showCompetitionResultModal("cup");
          return;
        }

        const next = p.checkNationalCallupTransition();
        if (next === "national_callup") {
          p.setCareerSubStep("national_callup");
          p.setIsProcessing(false);
          showCompetitionResultModal("cup");
          return;
        }

        p.setIsProcessing(false);
        showCompetitionResultModal("cup", () => {
          void triggerSeasonStats(p.standingResult, cupVal, p.continentalCupResult, null, null);
        });
      };

      generateCupJourneyAction({
        type: "domestic",
        result: cupVal,
        playerClubId: p.currentClub.id,
        playerClubPrestige: p.currentClub.prestige ?? 3,
      }).then((journey) => {
        updateCurrentSeasonRecord((record) => ({ ...record, domesticCup: cupVal, domesticCupJourney: journey }));
        advanceFromDomesticCup();
      }).catch((err) => {
        console.error("Error generating domestic cup journey:", err);
        updateCurrentSeasonRecord((record) => ({ ...record, domesticCup: cupVal }));
        advanceFromDomesticCup();
      });
    }
    else if (subStep === "continental_cup") {
      const contVal = result as string;
      p.setContinentalCupResult(contVal);
      const cupLabel = getContinentalCupLabel(p.currentContinentalCup);

      const advanceFromContinentalCup = () => {
        const next = p.checkNationalCallupTransition();
        if (next === "national_callup") {
          p.setCareerSubStep("national_callup");
          p.setIsProcessing(false);
          showCompetitionResultModal("continental");
          return;
        }

        p.setIsProcessing(false);
        showCompetitionResultModal("continental", () => {
          void triggerSeasonStats(p.standingResult, p.domesticCupResult, contVal, null, null);
        });
      };

      generateCupJourneyAction({
        type: "continental",
        result: contVal,
        playerClubId: p.currentClub.id,
        playerClubPrestige: p.currentClub.prestige ?? 3,
        cupName: cupLabel,
        cupType: p.currentContinentalCup,
      }).then((journey) => {
        updateCurrentSeasonRecord((record) => ({
          ...record,
          continentalCup: record.continentalCup
            ? { ...record.continentalCup, result: contVal }
            : record.continentalCup,
          continentalCupJourney: journey,
        }));
        advanceFromContinentalCup();
      }).catch((err) => {
        console.error("Error generating continental cup journey:", err);
        updateCurrentSeasonRecord((record) => ({
          ...record,
          continentalCup: record.continentalCup
            ? { ...record.continentalCup, result: contVal }
            : record.continentalCup,
        }));
        advanceFromContinentalCup();
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
      const tourney = getNationalTournamentName(
        p.playerNationality, p.currentAge, p.playerDebutAge, getNationalContinentalCup,
      );
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
        triggerSeasonStats(p.standingResult, p.domesticCupResult, p.continentalCupResult, p.nationalCallupResult, tournamentVal);
      }).catch((err) => {
        console.error("Error generating national team journey:", err);
        triggerSeasonStats(p.standingResult, p.domesticCupResult, p.continentalCupResult, p.nationalCallupResult, tournamentVal);
      });
    }
  }

  return {
    triggerSeasonStats,
    handleSpinComplete,
    handleSeasonStatsModalClose,
    handleCompetitionResultModalClose,
  };
}
