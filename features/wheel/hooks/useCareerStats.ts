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
  getNationalTournamentName,
} from "../lib/simulation-helpers";
import { type ShopInventoryEntry } from "@/lib/shop-catalog";
import type { AchievementRecord, CareerSubStep, ClubStint, ClubSummary, CurrentClub, HiddenStats, StatSnapshot } from "@/types/domain";
import type { CareerSetupResult } from "@/features/career/services/career-setup.service";
import type { ContractOfferCard } from "@/features/transfer/services/transfer.service";
import type { DraftData } from "../stores/useWheelUiStore";

interface UseCareerStatsProps {
  gameId: string;
  slotIndex: number;
  position: string;
}

export function useCareerStats({ gameId, slotIndex, position }: UseCareerStatsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [hiddenStats, setHiddenStats] = useState<HiddenStats | null>(null);
  const [statsTimeline, setStatsTimeline] = useState<StatSnapshot[]>([]);
  const [clubStints, setClubStints] = useState<ClubStint[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord>({
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
  const [currentClub, setCurrentClub] = useState<CurrentClub | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentContinentalCup, setCurrentContinentalCup] = useState<string>("none");
  const [lastYearStanding, setLastYearStanding] = useState<number>(10);

  // Contract economy (€ nghìn)
  const [contractYearsTotal, setContractYearsTotal] = useState(3);
  const [contractYearsRemaining, setContractYearsRemaining] = useState(3);
  const [currentWageAnnual, setCurrentWageAnnual] = useState(0);
  const [marketValue, setMarketValue] = useState(0);
  const [isUnemployed, setIsUnemployed] = useState(false);

  // Wallet & Influence (docs/core-currency-shop-design.md) — server-authoritative,
  // updated from updateSeasonProgressAction/saveCareerPlayer's return value only.
  const [walletBalance, setWalletBalance] = useState(0);
  const [influenceScore, setInfluenceScore] = useState(0);
  const [shopInventory, setShopInventory] = useState<ShopInventoryEntry[]>([]);

  // Club và continental cup PHẢI đổi cùng nhau — vé cúp châu lục thuộc về CLB,
  // không thuộc về cầu thủ. Đây là điểm duy nhất được phép set currentClub,
  // để tránh currentContinentalCup bị lệch (bug: giữ nguyên vé cúp của CLB cũ
  // sau khi transfer sang CLB mới).
  // Ngoại lệ: enterUnemployed() clear cả cặp khi FA không ký được.
  function setClubAndContinental(club: {
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
    prestige: number;
    continentalType: string;
  }) {
    setCurrentClub(club);
    setCurrentContinentalCup(club.continentalType ?? "none");
    setIsUnemployed(false);
  }

  /** FA window không ký — clear club cho mùa tới. Stint cuối đã đóng ở tuổi hiện tại. */
  function enterUnemployed() {
    setClubStints((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.endAge = currentAge;
      last.yearsAtClub = last.endAge - last.startAge + 1;
      last.ovrAtLeaving = currentOvr;
      updated[updated.length - 1] = last;
      return updated;
    });
    setCurrentClub(null);
    setCurrentContinentalCup("none");
    setCurrentWageAnnual(0);
    setContractYearsRemaining(0);
    setIsUnemployed(true);
  }

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
      // Real transfer fee credited only if the LAST club stint started this exact
      // season (derived from clubStints, not separate state — avoids a reset-timing
      // bug where clearing a "this season's fee" flag would race the same React
      // batch that advances the season).
      const lastStint = clubStints[clubStints.length - 1];
      const transferFeeThisSeason =
        lastStint && lastStint.startAge === currentAge ? lastStint.feePaid ?? 0 : 0;

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
        ...(hiddenStats ? { hiddenStats } : {}),
        achievements,
        currentContinentalCup,
        contractYearsTotal,
        contractYearsRemaining,
        currentWageAnnual,
        marketValue,
        isUnemployed,
        seasonHistory: seasonRecords,
        clubPrestige: currentClub?.prestige ?? 2,
        matchRatingThisSeason: seasonRecords[currentAge]?.matchRating ?? 6.0,
        transferFeeThisSeason,
      });
    } catch (err) {
      console.error("Save player error:", err);
      setIsSaving(false);
    }
  }

  const careerTotalStats = useMemo(() => {
    let apps = 0, goals = 0, assists = 0;
    statsTimeline.forEach((snap) => {
      apps += snap.apps ?? 0;
      goals += snap.goals ?? 0;
      assists += snap.assists ?? 0;
    });
    return { apps, goals, assists };
  }, [statsTimeline]);

  const peakOvrValue = useMemo(() => {
    const allOvrs = [currentOvr, ...statsTimeline.map((s) => (typeof s?.ovr === "number" ? s.ovr : 0))];
    return Math.max(1, ...allOvrs);
  }, [statsTimeline, currentOvr]);

  const activeRecord = useMemo(() => {
    return seasonRecords[selectedAgeForStats] || null;
  }, [seasonRecords, selectedAgeForStats]);

  function handleStartCareer(draftData: DraftData, initPayload: CareerSetupResult, clubs: ClubSummary[]) {
    const debutOvr = initPayload.debutOvr ?? initPayload.initTimeline?.[0]?.ovr ?? draftData.debutOvr!;
    setPlayerName(initPayload.playerName);
    setHiddenStats(initPayload.hiddenStats);
    setClubStints([initPayload.initStint]);
    setStatsTimeline(initPayload.initTimeline);
    setCurrentAge(draftData.debutAge!);
    setCurrentOvr(debutOvr);
    setCurrentStats(initPayload.initStats);

    const fullClub = clubs.find((c) => c.id === draftData.clubId);
    setClubAndContinental({
      id: draftData.clubId!,
      name: draftData.clubName!,
      leagueId: draftData.leagueId!,
      leagueName: draftData.leagueName!,
      prestige: fullClub?.prestige ?? 3,
      continentalType: fullClub?.continentalType ?? "none",
    });

    setPlayerNationality(draftData.nationality!);
    setPlayerDebutAge(draftData.debutAge!);
    setPlayerCareerLength(draftData.careerLength!);

    setContractYearsTotal(initPayload.contractYearsTotal ?? 3);
    setContractYearsRemaining(initPayload.contractYearsRemaining ?? 3);
    setCurrentWageAnnual(initPayload.currentWageAnnual ?? 0);
    setMarketValue(initPayload.marketValue ?? 0);

    setLastYearStanding(10);

    setSeasonRecords({});
    setSelectedAgeForStats(draftData.debutAge!);
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
    setSeasonRecords((prev) => {
      const record = prev[currentAge];
      if (!record) return prev;

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
      }
      if (ballonDorRank !== null) finalized.ballonDorResult = ballonDorRank;

      return { ...prev, [currentAge]: finalized };
    });
  }

  function handleNextSeason(
    standingResult: number | null,
    domesticCupResult: string | null,
    continentalCupResult: string | null,
    nationalCallupResult: string | null,
    nationalTournamentResult: string | null,
    yearSimResult: SimulatedSeasonResult | null,
    ballonDorRank: number | null,
  ): { isRetire: boolean; nextContinentalCup: string } {
    const nextAge = currentAge + 1;
    const actualStint =
      clubStints.find((st) => currentAge >= st.startAge && currentAge <= st.endAge) ||
      clubStints[clubStints.length - 1];

    const actualClubName = actualStint?.clubName ?? currentClub?.name ?? "Không CLB";
    const actualLeagueName = actualStint?.leagueName ?? currentClub?.leagueName ?? "";
    const actualStintLeagueId = actualStint?.leagueId ?? currentClub?.leagueId ?? "";

    // Nếu cầu thủ đã accept transfer TRƯỚC khi bấm "mùa giải tiếp theo" (currentClub
    // đã là CLB mới, nhưng actualStint vẫn là CLB vừa thi đấu mùa này), thì KHÔNG
    // được áp vé cúp châu lục tính từ standing của CLB CŨ — vé đó thuộc về CLB cũ,
    // không đi theo cầu thủ. currentContinentalCup lúc này đã đúng theo CLB mới rồi
    // (do handleAcceptTransfer set qua setClubAndContinental).
    const hasTransferredAway = !!(
      actualStint?.clubId && currentClub?.id && actualStint.clubId !== currentClub.id
    );

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

    // Persist the complete season outcome in one final record update before
    // currentAge advances. This prevents a placeholder created at season start
    // from replacing the wheel results in the background save snapshot.
    finalizeSeasonRecord(
      standingResult,
      domesticCupResult,
      continentalCupResult,
      nationalCallupResult,
      nationalTournamentResult,
      yearSimResult,
      ballonDorRank,
    );

    let nextContinentalCup = currentContinentalCup;
    if (standingResult !== null) {
      if (hasTransferredAway) {
        // Giữ nguyên currentContinentalCup (đã đúng theo CLB mới) — không ghi đè
        // bằng vé kiếm được ở CLB cũ.
        setLastYearStanding(standingResult);
      } else {
        nextContinentalCup = calculateContinentalQualification(
          actualStintLeagueId,
          standingResult,
          continentalCupResult,
          currentContinentalCup,
        );
        setCurrentContinentalCup(nextContinentalCup);
        setLastYearStanding(standingResult);
      }
    }

    setAchievements((prev) => {
      const trophies = [...(prev.trophies ?? [])];
      const seasonAwards = [...(prev.seasonAwards ?? [])];
      let ballonDor = prev.ballonDor ?? 0;

      if (standingResult === 1) {
        trophies.push({ type: "league", name: actualLeagueName || "Giải vô địch quốc gia", club: actualClubName, age: currentAge });
      }
      if (domesticCupResult === "Winner") {
        trophies.push({ type: "cup", name: getDomesticCupName(actualLeagueName, actualStintLeagueId), club: actualClubName, age: currentAge });
      }
      if (continentalCupResult === "Winner") {
        trophies.push({ type: "continental", name: getContinentalCupLabel(currentContinentalCup), club: actualClubName, age: currentAge });
      }
      if (nationalCallupResult === "called_up" && nationalTournamentResult === "Winner") {
        const tourney = getNationalTournamentName(
          playerNationality, currentAge, playerDebutAge, getNationalContinentalCup,
        );
        trophies.push({ type: "international", name: tourney, club: playerNationality, age: currentAge });
      }
      if (ballonDorRank !== null) {
        // top 10 nomination
        prev.ballonDorNominations = (prev.ballonDorNominations ?? 0) + 1;
      }
      if (ballonDorRank === 1) ballonDor += 1;
      if (yearSimResult) {
        yearSimResult.events.forEach((ev) => {
          if (ev.type === "individual_award") {
            seasonAwards.push({ type: "individual_award", label: ev.label, age: currentAge });
          }
        });
      }

      return { ballonDor, trophies, seasonAwards };
    });

    const retireAge = playerDebutAge + playerCareerLength;
    const isRetiring = nextAge > retireAge;

    if (isRetiring) {
      // Chốt snapshot của mùa cuối bằng OVR/stats sau cùng. Snapshot tuổi
      // retireAge được tạo từ OVR đầu mùa; nếu không cập nhật tại đây thì
      // Peak OVR của mùa cuối chỉ tồn tại trong currentOvr và bị mất khi save.
      const finalSeasonStats = yearSimResult
        ? {
            apps: yearSimResult.apps,
            goals: yearSimResult.goals,
            assists: yearSimResult.assists,
            cleanSheets: yearSimResult.cleanSheets,
            matchRating: yearSimResult.matchRating,
          }
        : {};
      setStatsTimeline((prev) => {
        const hasCurrentAge = prev.some((item) => item.age === currentAge);
        if (!hasCurrentAge) {
          return [...prev, { age: currentAge, ovr: currentOvr, ...currentStats, ...finalSeasonStats }];
        }
        return prev.map((item) =>
          item.age === currentAge
            ? { ...item, ...currentStats, ovr: currentOvr, ...finalSeasonStats }
            : item,
        );
      });

      // Không push timeline/stint tuổi retireAge+1 (entry “ma”) và bỏ stint
      // transfer chưa bao giờ đá (startAge > retireAge).
      setClubStints((prev) => {
        const played = prev.filter((st) => st.startAge <= retireAge);
        if (played.length === 0) return played;
        const updated = [...played];
        const last = { ...updated[updated.length - 1] };
        last.endAge = Math.min(last.endAge ?? currentAge, currentAge);
        if (last.endAge < last.startAge) last.endAge = last.startAge;
        last.yearsAtClub = last.endAge - last.startAge + 1;
        last.ovrAtLeaving = currentOvr;
        updated[updated.length - 1] = last;
        return updated;
      });
      return { isRetire: true, nextContinentalCup };
    }

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

    setCurrentAge(nextAge);
    // HĐ: mỗi mùa trừ 1 năm còn lại (sàn 0 = FA window)
    setContractYearsRemaining((prev) => Math.max(0, prev - 1));
    return { isRetire: false, nextContinentalCup };
  }

  // Trả về "national_callup" hoặc "trigger_stats" — caller tự xử lý
  function checkNationalCallupTransition(): "national_callup" | "trigger_stats" {
    return currentAge % 2 === 0 ? "national_callup" : "trigger_stats";
  }

  function handleAcceptTransfer(
    accept: boolean,
    transferOffer: ContractOfferCard | null,
    clubs: ClubSummary[],
    setTransferOffer: (offer: ContractOfferCard | null) => void,
    setCareerSubStep: (step: CareerSubStep) => void,
    clearMarket?: () => void,
  ) {
    const retireAge = playerDebutAge + playerCareerLength;
    const onFinalSeason = currentAge >= retireAge;

    if (accept && transferOffer && !onFinalSeason) {
      const kind = transferOffer.kind as string | undefined;

      if (kind === "renewal") {
        setContractYearsTotal(transferOffer.contractYears ?? contractYearsTotal);
        setContractYearsRemaining(transferOffer.contractYears ?? contractYearsRemaining);
        setCurrentWageAnnual(transferOffer.wageAnnual ?? currentWageAnnual);
        setIsUnemployed(false);
        setTransferOffer(null);
        clearMarket?.();
        setCareerSubStep("resolved");
        return;
      }

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
          wageAtJoining: transferOffer.wageAnnual,
          feePaid: transferOffer.transferFee,
        });

        return updated;
      });

      const fullClub = clubs.find((c) => c.id === transferOffer.clubId);
      setClubAndContinental({
        id: transferOffer.clubId,
        name: transferOffer.clubName,
        leagueId: transferOffer.leagueId,
        leagueName: transferOffer.leagueName,
        prestige: fullClub?.prestige ?? transferOffer.prestige ?? 3,
        continentalType: fullClub?.continentalType ?? "none",
      });

      if (typeof transferOffer.contractYears === "number") {
        setContractYearsTotal(transferOffer.contractYears);
        setContractYearsRemaining(transferOffer.contractYears);
      }
      if (typeof transferOffer.wageAnnual === "number") {
        setCurrentWageAnnual(transferOffer.wageAnnual);
      }
    }

    setTransferOffer(null);
    clearMarket?.();
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
    contractYearsTotal,
    setContractYearsTotal,
    contractYearsRemaining,
    setContractYearsRemaining,
    currentWageAnnual,
    setCurrentWageAnnual,
    marketValue,
    setMarketValue,
    isUnemployed,
    setIsUnemployed,
    enterUnemployed,
    walletBalance,
    setWalletBalance,
    influenceScore,
    setInfluenceScore,
    shopInventory,
    setShopInventory,
  };
}
