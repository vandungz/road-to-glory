"use client";

import { useState, useMemo } from "react";
import { type SeasonRecord } from "@/types/game";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { saveCareerPlayer } from "@/actions/player.actions";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import {
  calculateContinentalQualification,
  getContinentalCupLabel,
  getDomesticCupName,
} from "../lib/simulation-helpers";

interface UseCareerStatsProps {
  gameId: string;
  slotIndex: number;
  position: string;
}

export function useCareerStats({ gameId, slotIndex, position }: UseCareerStatsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [hiddenStats, setHiddenStats] = useState<any>(null);
  const [statsTimeline, setStatsTimeline] = useState<any[]>([]);
  const [clubStints, setClubStints] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any>({
    ballonDor: 0,
    trophies: [],
    seasonAwards: [],
  });

  const [playerNationality, setPlayerNationality] = useState<string>("");
  const [playerDebutAge, setPlayerDebutAge] = useState<number>(18);
  const [playerCareerLength, setPlayerCareerLength] = useState<number>(15);

  const [currentAge, setCurrentAge] = useState<number>(18);
  const [currentOvr, setCurrentOvr] = useState<number>(60);
  const [currentStats, setCurrentStats] = useState<Record<string, number>>(
    position === "GK"
      ? { div: 60, han: 60, kic: 60, ref: 60, spd: 60, pos: 60 }
      : { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 }
  );
  const [currentClub, setCurrentClub] = useState<any>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentContinentalCup, setCurrentContinentalCup] = useState<string>("none");
  const [lastYearStanding, setLastYearStanding] = useState<number>(10);

  const [seasonRecords, setSeasonRecords] = useState<Record<number, SeasonRecord>>({});
  const [selectedAgeForStats, setSelectedAgeForStats] = useState<number>(18);

  function applySimResultToRecords(age: number, result: SimulatedSeasonResult) {
    setSeasonRecords((prev) => {
      const rec = { ...prev[age] };
      rec.apps = result.apps;
      rec.goals = result.goals;
      rec.assists = result.assists;
      rec.matchRating = result.matchRating;
      rec.cleanSheets = result.cleanSheets;
      // Per-competition stats từ server
      rec.leagueStats = result.leagueStats;
      rec.domesticCupStats = result.domesticCupStats;
      if (result.continentalStats) rec.continentalStats = result.continentalStats;
      if (result.nationalStats) rec.nationalStats = result.nationalStats;
      return { ...prev, [age]: rec };
    });
  }

  async function handleSavePlayer() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const peakOvr = Math.max(...statsTimeline.map((s) => s.ovr));
      const retireAge = playerDebutAge + playerCareerLength;
      await saveCareerPlayer({
        gameId,
        slotIndex,
        position,
        name: playerName,
        nationality: playerNationality,
        debutAge: playerDebutAge,
        retireAge,
        careerLength: playerCareerLength,
        peakOvr,
        statsTimeline,
        clubStints,
        hiddenStats,
        achievements,
        currentContinentalCup,
      });
    } catch (err) {
      console.error("Save player error:", err);
      setIsSaving(false);
    }
  }

  const careerTotalStats = useMemo(() => {
    let apps = 0, goals = 0, assists = 0;
    statsTimeline.forEach((snap: any) => {
      apps += snap.apps ?? 0;
      goals += snap.goals ?? 0;
      assists += snap.assists ?? 0;
    });
    return { apps, goals, assists };
  }, [statsTimeline]);

  const peakOvrValue = useMemo(() => {
    if (statsTimeline.length === 0) return currentOvr;
    return Math.max(...statsTimeline.map((s) => s.ovr));
  }, [statsTimeline, currentOvr]);

  const activeRecord = useMemo(() => {
    return seasonRecords[selectedAgeForStats] || null;
  }, [seasonRecords, selectedAgeForStats]);

  function handleStartCareer(draftData: any, initPayload: any, clubs: any[]) {
    setPlayerName(initPayload.playerName);
    setHiddenStats(initPayload.hiddenStats);
    setClubStints([initPayload.initStint]);
    setStatsTimeline(initPayload.initTimeline);
    setCurrentAge(draftData.debutAge!);
    setCurrentOvr(draftData.debutOvr!);
    setCurrentStats(initPayload.initStats);

    const fullClub = clubs.find((c) => c.id === draftData.clubId);
    const selectedClub = {
      id: draftData.clubId!,
      name: draftData.clubName!,
      leagueId: draftData.leagueId!,
      leagueName: draftData.leagueName!,
      prestige: fullClub?.prestige ?? 3,
      continentalType: fullClub?.continentalType ?? "none",
    };
    setCurrentClub(selectedClub);

    setPlayerNationality(draftData.nationality!);
    setPlayerDebutAge(draftData.debutAge!);
    setPlayerCareerLength(draftData.careerLength!);

    setCurrentContinentalCup(selectedClub.continentalType);
    setLastYearStanding(10);

    setSeasonRecords({});
    setSelectedAgeForStats(draftData.debutAge!);
  }

  function handleNextSeason(
    standingResult: number | null,
    domesticCupResult: string | null,
    continentalCupResult: string | null,
    nationalCallupResult: string | null,
    nationalTournamentResult: string | null,
    yearSimResult: SimulatedSeasonResult | null,
    hasBallonDorWinner: boolean
  ): { isRetire: boolean; nextContinentalCup: string } {
    const nextAge = currentAge + 1;
    const actualStint =
      clubStints.find((st: any) => currentAge >= st.startAge && currentAge <= st.endAge) ||
      clubStints[clubStints.length - 1];

    const actualClubName = actualStint?.clubName ?? currentClub.name;
    const actualLeagueName = actualStint?.leagueName ?? currentClub.leagueName;
    const actualStintLeagueId = actualStint?.leagueId ?? currentClub.leagueId;

    if (yearSimResult) {
      applySimResultToRecords(currentAge, yearSimResult);

      setStatsTimeline((prev) =>
        prev.map((item) =>
          item.age === currentAge
            ? {
                ...item,
                apps: yearSimResult.apps,
                goals: yearSimResult.goals,
                assists: yearSimResult.assists,
                cleanSheets: yearSimResult.cleanSheets,
                matchRating: yearSimResult.matchRating,
              }
            : item
        )
      );
    }

    let nextContinentalCup = currentContinentalCup;
    if (standingResult !== null) {
      nextContinentalCup = calculateContinentalQualification(
        actualStintLeagueId,
        standingResult,
        continentalCupResult,
        currentContinentalCup,
      );
      setCurrentContinentalCup(nextContinentalCup);
      setLastYearStanding(standingResult);
    }

    setAchievements((prev: any) => {
      const trophies = [...(prev.trophies ?? [])];
      const seasonAwards = [...(prev.seasonAwards ?? [])];
      let ballonDor = prev.ballonDor ?? 0;

      if (standingResult === 1) {
        trophies.push({ type: "league", name: actualLeagueName || "Giải vô địch quốc gia", club: actualClubName, age: currentAge });
      }
      if (domesticCupResult === "Winner") {
        trophies.push({ type: "cup", name: getDomesticCupName(actualLeagueName), club: actualClubName, age: currentAge });
      }
      if (continentalCupResult === "Winner") {
        trophies.push({ type: "continental", name: getContinentalCupLabel(currentContinentalCup), club: actualClubName, age: currentAge });
      }
      if (nationalCallupResult === "called_up" && nationalTournamentResult === "Winner") {
        const nationCup = getNationalContinentalCup(playerNationality);
        const currentYear = 2026 + (currentAge - playerDebutAge);
        const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
        trophies.push({ type: "international", name: tourney, club: playerNationality, age: currentAge });
      }
      if (hasBallonDorWinner) ballonDor += 1;
      if (yearSimResult) {
        yearSimResult.events.forEach((ev) => {
          if (ev.type === "individual_award") {
            seasonAwards.push({ type: "individual_award", label: ev.label, age: currentAge });
          }
        });
      }

      return { ballonDor, trophies, seasonAwards };
    });

    setStatsTimeline((prev) => [
      ...prev,
      { age: nextAge, ovr: currentOvr, ...currentStats },
    ]);

    setClubStints((prev) => {
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.endAge = nextAge;
      last.yearsAtClub = nextAge - last.startAge + 1;
      last.ovrAtLeaving = currentOvr;
      updated[updated.length - 1] = last;
      return updated;
    });

    const retireAge = playerDebutAge + playerCareerLength;
    if (nextAge > retireAge) {
      return { isRetire: true, nextContinentalCup };
    } else {
      setCurrentAge(nextAge);
      return { isRetire: false, nextContinentalCup };
    }
  }

  // Trả về "national_callup" hoặc "trigger_stats" — caller tự xử lý
  function checkNationalCallupTransition(): "national_callup" | "trigger_stats" {
    return currentAge % 2 === 0 ? "national_callup" : "trigger_stats";
  }

  function handleAcceptTransfer(
    accept: boolean,
    transferOffer: any,
    clubs: any[],
    setTransferOffer: (offer: any) => void,
    setCareerSubStep: (step: any) => void
  ) {
    if (accept && transferOffer) {
      setClubStints((prevStints) => {
        const updated = [...prevStints];
        const last = { ...updated[updated.length - 1] };
        last.endAge = currentAge;
        last.yearsAtClub = last.endAge - last.startAge + 1;
        last.ovrAtLeaving = currentOvr;
        updated[updated.length - 1] = last;

        updated.push({
          clubId: transferOffer.clubId,
          clubName: transferOffer.clubName,
          leagueId: transferOffer.leagueId,
          leagueName: transferOffer.leagueName,
          startAge: currentAge + 1,
          endAge: currentAge + 1,
          yearsAtClub: 1,
          ovrAtJoining: currentOvr,
          ovrAtLeaving: currentOvr,
        });

        return updated;
      });

      const fullClub = clubs.find((c) => c.id === transferOffer.clubId);
      setCurrentClub({
        id: transferOffer.clubId,
        name: transferOffer.clubName,
        leagueId: transferOffer.leagueId,
        leagueName: transferOffer.leagueName,
        prestige: fullClub?.prestige ?? 3,
        continentalType: fullClub?.continentalType ?? "none",
      });
    }

    setTransferOffer(null);
    setCareerSubStep("resolved");
  }

  return {
    isSaving,
    setIsSaving,
    playerId,
    setPlayerId,
    playerName,
    setPlayerName,
    hiddenStats,
    setHiddenStats,
    statsTimeline,
    setStatsTimeline,
    clubStints,
    setClubStints,
    achievements,
    setAchievements,
    playerNationality,
    setPlayerNationality,
    playerDebutAge,
    setPlayerDebutAge,
    playerCareerLength,
    setPlayerCareerLength,
    currentAge,
    setCurrentAge,
    currentOvr,
    setCurrentOvr,
    currentStats,
    setCurrentStats,
    currentClub,
    setCurrentClub,
    currentContinentalCup,
    setCurrentContinentalCup,
    lastYearStanding,
    setLastYearStanding,
    seasonRecords,
    setSeasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    applySimResultToRecords,
    handleSavePlayer,
    careerTotalStats,
    peakOvrValue,
    activeRecord,
    handleStartCareer,
    handleNextSeason,
    checkNationalCallupTransition,
    handleAcceptTransfer,
  };
}
