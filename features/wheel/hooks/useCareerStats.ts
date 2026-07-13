"use client";

import { useState, useMemo } from "react";
import { type SeasonRecord } from "@/types/game";
import { type SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { saveCareerPlayer } from "@/actions/player.actions";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { generateFictionalName } from "@/lib/name-gen";
import {
  calculateContinentalQualification,
  getContinentalCupLabel,
  getSeasonYearString,
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
  const [events, setEvents] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any>({
    ballonDor: 0,
    leagues: {},
    cups: {},
    continentals: {},
    internationals: {},
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

  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const [isCupOpen, setIsCupOpen] = useState(false);
  const [isContinentalOpen, setIsContinentalOpen] = useState(false);
  const [isNationalOpen, setIsNationalOpen] = useState(false);

  function applySimResultToRecords(age: number, result: SimulatedSeasonResult) {
    setSeasonRecords((prev) => {
      const rec = { ...prev[age] };
      rec.apps = result.apps;
      rec.goals = result.goals;
      rec.assists = result.assists;
      rec.matchRating = result.matchRating;
      rec.cleanSheets = result.cleanSheets;
      return { ...prev, [age]: rec };
    });
  }

  async function handleSavePlayer() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const peakOvr = Math.max(...statsTimeline.map((s) => s.ovr));
      const retireAge = playerDebutAge + playerCareerLength;

      const finalEvents = [
        ...events,
        {
          type: "RETIREMENT",
          label: `🏁 Giải nghệ bóng đá chuyên nghiệp ở tuổi ${retireAge} tại CLB ${currentClub.name} ở mùa giải ${getSeasonYearString(retireAge, playerDebutAge)}.`,
          age: retireAge,
          clubId: currentClub.id,
        }
      ];

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
        events: finalEvents,
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
    let apps = 0;
    let goals = 0;
    let assists = 0;
    events.forEach((ev) => {
      if (ev.type === "PERFORMANCE") {
        const appsMatch = ev.label.match(/Ra sân (\d+) trận/);
        const goalsMatch = ev.label.match(/ghi (\d+) bàn/);
        const assistsMatch = ev.label.match(/(\d+) kiến tạo/);

        if (appsMatch) apps += parseInt(appsMatch[1], 10);
        if (goalsMatch) goals += parseInt(goalsMatch[1], 10);
        if (assistsMatch) assists += parseInt(assistsMatch[1], 10);
      }
    });
    return { apps, goals, assists };
  }, [events]);

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
    setEvents([initPayload.initEvent]);
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
    const actualStint = clubStints.find((st: any) => currentAge >= st.startAge && currentAge <= st.endAge) 
      || clubStints[clubStints.length - 1];
    
    const actualClubName = actualStint?.clubName ?? currentClub.name;
    const actualLeagueName = actualStint?.leagueName ?? currentClub.leagueName;
    const actualClubId = actualStint?.clubId ?? currentClub.id;

    const currentSeasonStr = getSeasonYearString(currentAge, playerDebutAge);

    if (standingResult !== null) {
      setEvents((prev) => [
        ...prev,
        {
          type: "standing",
          label: `Đứng hạng ${standingResult} giải đấu ${actualLeagueName} cùng CLB ${actualClubName} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: actualClubId,
        }
      ]);
      if (standingResult === 1) {
        setEvents((prev) => [
          ...prev,
          {
            type: "trophy",
            label: `🏆 Vô Địch giải đấu vô địch quốc gia cùng CLB ${actualClubName} ở mùa giải ${currentSeasonStr}!`,
            age: currentAge,
            clubId: actualClubId,
          }
        ]);
      }
    }

    if (domesticCupResult !== null && domesticCupResult !== "Early Exit") {
      setEvents((prev) => [
        ...prev,
        {
          type: "cup",
          label: `${domesticCupResult === "Winner" ? "🏆 Vô Địch" : domesticCupResult === "Runner-Up" ? "Á Quân" : "Bán Kết"} Cup Quốc Gia cùng CLB ${actualClubName} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: actualClubId,
        }
      ]);
    }

    if (continentalCupResult !== null && currentContinentalCup !== "none") {
      const cupLabel = getContinentalCupLabel(currentContinentalCup);
      setEvents((prev) => [
        ...prev,
        {
          type: "continental_cup",
          label: `${continentalCupResult === "Winner" ? `🏆 Vô Địch ${cupLabel} 🏆` : continentalCupResult === "Runner-Up" ? `Á Quân ${cupLabel}` : continentalCupResult === "Semi-Finals" ? `Bán Kết ${cupLabel}` : `Tham dự Vòng Bảng ${cupLabel}`} cùng CLB ${actualClubName} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
          clubId: actualClubId,
        }
      ]);
    }

    if (nationalCallupResult === "called_up" && nationalTournamentResult) {
      const nationCup = getNationalContinentalCup(playerNationality);
      const currentYear = 2026 + (currentAge - playerDebutAge);
      const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;

      setEvents((prev) => [
        ...prev,
        {
          type: "national_team",
          label: `${nationalTournamentResult === "Winner" ? `🏆 VÔ ĐỊCH ${tourney.toUpperCase()} cùng ĐTQG! 🏆` : nationalTournamentResult === "Runner-Up" ? `Á Quân ${tourney} cùng ĐTQG` : `Đồng hành tới ${nationalTournamentResult} ${tourney} cùng ĐTQG`} ở mùa giải ${currentSeasonStr}.`,
          age: currentAge,
        }
      ]);
    }

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

      setEvents((prev) => [
        ...prev,
        {
          type: "PERFORMANCE",
          label: `Thống kê cá nhân mùa giải ${currentSeasonStr}: Ra sân ${yearSimResult.apps} trận, ghi ${yearSimResult.goals} bàn, ${yearSimResult.assists} kiến tạo. Rating: ${yearSimResult.matchRating}.`,
          age: currentAge,
          clubId: actualClubId,
        }
      ]);

      yearSimResult.events.forEach((ev) => {
        setEvents((prev) => [
          ...prev,
          {
            type: ev.type,
            label: `${ev.label} (Mùa giải ${currentSeasonStr})`,
            age: currentAge,
            clubId: actualClubId,
          }
        ]);
      });
    }

    if (hasBallonDorWinner) {
      setEvents((prev) => [
        ...prev,
        {
          type: "individual_award",
          label: `🏆 ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR DANH GIÁ ở mùa giải ${currentSeasonStr}! 🏆`,
          age: currentAge,
        }
      ]);
    }

    let nextContinentalCup = currentContinentalCup;
    if (standingResult !== null) {
      // Dùng leagueId của stint bao phủ currentAge (không phải currentClub.leagueId vì club có thể đã đổi sau transfer)
      const thisSeasonLeagueId = actualStint?.leagueId ?? currentClub.leagueId;
      nextContinentalCup = calculateContinentalQualification(
        thisSeasonLeagueId,
        standingResult,
        continentalCupResult,
        currentContinentalCup,
      );
      setCurrentContinentalCup(nextContinentalCup);
      setLastYearStanding(standingResult);
    }

    setAchievements((prev: any) => {
      const updated = {
        ballonDor: prev.ballonDor || 0,
        leagues: { ...prev.leagues },
        cups: { ...prev.cups },
        continentals: { ...prev.continentals },
        internationals: { ...prev.internationals },
      };

      if (standingResult === 1) {
        const name = actualLeagueName || "Giải vô địch quốc gia";
        const key = actualClubName ? `${name} (${actualClubName})` : name;
        updated.leagues[key] = (updated.leagues[key] || 0) + 1;
      }
      if (domesticCupResult === "Winner") {
        const cupName = getDomesticCupName(actualLeagueName);
        const key = actualClubName ? `${cupName} (${actualClubName})` : cupName;
        updated.cups[key] = (updated.cups[key] || 0) + 1;
      }
      if (continentalCupResult === "Winner") {
        const cupLabel = getContinentalCupLabel(currentContinentalCup);
        const key = actualClubName ? `${cupLabel} (${actualClubName})` : cupLabel;
        updated.continentals[key] = (updated.continentals[key] || 0) + 1;
      }
      if (nationalCallupResult === "called_up" && nationalTournamentResult === "Winner") {
        const nationCup = getNationalContinentalCup(playerNationality);
        const currentYear = 2026 + (currentAge - playerDebutAge);
        const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
        const key = `${tourney} (${playerNationality})`;
        updated.internationals[key] = (updated.internationals[key] || 0) + 1;
      }
      if (hasBallonDorWinner) {
        updated.ballonDor = (updated.ballonDor || 0) + 1;
      }
      return updated;
    });

    setStatsTimeline((prev) => [
      ...prev,
      {
        age: nextAge,
        ovr: currentOvr,
        ...currentStats
      }
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
    if (nextAge >= retireAge) {
      return { isRetire: true, nextContinentalCup };
    } else {
      setCurrentAge(nextAge);
      return { isRetire: false, nextContinentalCup };
    }
  }

  function checkNationalCallupTransition(setCareerSubStep: (step: any) => void) {
    if (currentAge % 2 === 0) {
      setCareerSubStep("national_callup");
      return;
    }
    setCareerSubStep("dir_increase");
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

      setEvents((prevEvents) => [
        ...prevEvents,
        {
          type: "TRANSFER",
          label: `✈️ Chuyển nhượng sang CLB ${transferOffer.clubName} (${transferOffer.leagueName}) ở mùa giải ${getSeasonYearString(currentAge + 1, playerDebutAge)} (tuổi ${currentAge + 1}).`,
          age: currentAge,
          clubId: transferOffer.clubId,
        }
      ]);

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
    events,
    setEvents,
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
    isLeagueOpen,
    setIsLeagueOpen,
    isCupOpen,
    setIsCupOpen,
    isContinentalOpen,
    setIsContinentalOpen,
    isNationalOpen,
    setIsNationalOpen,
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
