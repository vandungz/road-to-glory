"use client";

import { useMemo, useState } from "react";
import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

interface UseCareerRecordsProps {
  currentAge: number;
}

export function useCareerRecords({ currentAge }: UseCareerRecordsProps) {
  const [seasonRecords, setSeasonRecords] = useState<Record<number, SeasonRecord>>({});
  const [selectedAgeForStats, setSelectedAgeForStats] = useState<number>(18);

  function applySimResultToRecords(age: number, result: SimulatedSeasonResult) {
    setSeasonRecords((previous) => {
      const record = { ...previous[age] };
      record.apps = result.apps;
      record.goals = result.goals;
      record.assists = result.assists;
      record.matchRating = result.matchRating;
      record.cleanSheets = result.cleanSheets;
      record.leagueStats = result.leagueStats;
      record.domesticCupStats = result.domesticCupStats;
      if (result.continentalStats) record.continentalStats = result.continentalStats;
      if (result.nationalStats) record.nationalStats = result.nationalStats;
      if (result.awardSimulation) {
        record.honours = result.awardSimulation.honours.map((honour) => ({
          awardKey: honour.awardKey,
          label: honour.label,
          rank: honour.rank ?? null,
          slotKey: honour.slotKey,
          result: honour.result,
          metrics: honour.metrics,
        }));
        record.awardModelVersion = result.awardSimulation.modelVersion;
      }
      return { ...previous, [age]: record };
    });
  }

  function finalizeSeasonRecord(
    standingResult: number | null,
    domesticCupResult: string | null,
    continentalCupResult: string | null,
    nationalCallupResult: string | null,
    nationalTournamentResult: string | null,
    yearSimResult: SimulatedSeasonResult | null,
    ballonDorRank: number | null,
  ) {
    setSeasonRecords((previous) => {
      const record = previous[currentAge];
      if (!record) return previous;

      const finalized: SeasonRecord = { ...record };
      if (standingResult !== null) finalized.standing = standingResult;
      if (domesticCupResult !== null) finalized.domesticCup = domesticCupResult;
      if (finalized.continentalCup && continentalCupResult !== null) {
        finalized.continentalCup = { ...finalized.continentalCup, result: continentalCupResult };
      }
      if (finalized.nationalTeam && nationalCallupResult !== null) {
        finalized.nationalTeam = {
          ...finalized.nationalTeam,
          callup: nationalCallupResult === "called_up" ? "Được triệu tập" : "Không được gọi",
        };
      }
      if (finalized.nationalTeam && nationalTournamentResult !== null) {
        finalized.nationalTeam = { ...finalized.nationalTeam, result: nationalTournamentResult };
      }
      if (yearSimResult) {
        finalized.apps = yearSimResult.apps;
        finalized.goals = yearSimResult.goals;
        finalized.assists = yearSimResult.assists;
        finalized.cleanSheets = yearSimResult.cleanSheets;
        finalized.matchRating = yearSimResult.matchRating;
        finalized.leagueStats = yearSimResult.leagueStats;
        finalized.domesticCupStats = yearSimResult.domesticCupStats;
        if (yearSimResult.continentalStats) finalized.continentalStats = yearSimResult.continentalStats;
        if (yearSimResult.nationalStats) finalized.nationalStats = yearSimResult.nationalStats;
        finalized.honours = yearSimResult.awardSimulation.honours.map((honour) => ({
          awardKey: honour.awardKey,
          label: honour.label,
          rank: honour.rank ?? null,
          slotKey: honour.slotKey,
          result: honour.result,
          metrics: honour.metrics,
        }));
        finalized.awardModelVersion = yearSimResult.awardSimulation.modelVersion;
      }
      if (ballonDorRank !== null) finalized.ballonDorResult = ballonDorRank;

      return { ...previous, [currentAge]: finalized };
    });
  }

  const activeRecord = useMemo(
    () => seasonRecords[selectedAgeForStats] || null,
    [seasonRecords, selectedAgeForStats],
  );

  return {
    seasonRecords,
    setSeasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    applySimResultToRecords,
    finalizeSeasonRecord,
    activeRecord,
  };
}
