"use client";

import { useState, useMemo } from "react";
import { saveCareerPlayer } from "@/actions/player.actions";
import { type ShopInventoryEntry } from "@/lib/shop-catalog";
import type { AchievementRecord, CareerSubStep, ClubStint, ClubSummary, CurrentClub, HiddenStats, StatSnapshot } from "@/types/domain";
import type { CareerSetupResult } from "@/features/career/services/career-setup.service";
import type { ContractOfferCard } from "@/features/transfer/services/transfer.service";
import type { DraftData } from "../stores/useWheelUiStore";
import { useCareerRecords } from "./useCareerRecords";
import { useCareerSeasonTransition } from "./useCareerSeasonTransition";
import {
  aggregateCareerStats,
  calculatePeakOvr,
} from "@/features/career/services/career-summary.service";

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
  const [peakOvr, setPeakOvr] = useState<number>(60);
  const [currentStats, setCurrentStats] = useState<Record<string, number>>(
    position === "GK"
      ? { div: 60, han: 60, kic: 60, ref: 60, spd: 60, pos: 60 }
      : { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 }
  );
  const [currentClub, setCurrentClub] = useState<CurrentClub | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentContinentalCup, setCurrentContinentalCup] = useState<string>("none");

  const {
    seasonRecords,
    setSeasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    applySimResultToRecords,
    finalizeSeasonRecord,
    activeRecord,
  } = useCareerRecords({ currentAge });

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

  async function handleSavePlayer() {
    if (isSaving) return;
    setIsSaving(true);
    try {
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
        peakOvr: peakOvrValue,
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
    return aggregateCareerStats({ seasonHistory: seasonRecords, statsTimeline });
  }, [seasonRecords, statsTimeline]);

  const peakOvrValue = useMemo(() => {
    return calculatePeakOvr(statsTimeline, Math.max(peakOvr, currentOvr));
  }, [peakOvr, statsTimeline, currentOvr]);

  function handleStartCareer(draftData: DraftData, initPayload: CareerSetupResult, clubs: ClubSummary[]) {
    const debutOvr = initPayload.debutOvr ?? initPayload.initTimeline?.[0]?.ovr ?? draftData.debutOvr!;
    setPlayerName(initPayload.playerName);
    // Hidden modifiers are server-only. V2 wheel resolvers load them from the
    // persisted CareerPlayer row; keeping a client copy would create a second
    // source of truth. Legacy rows use the neutral fallback until retired.
    setHiddenStats(null);
    setClubStints([initPayload.initStint]);
    setStatsTimeline(initPayload.initTimeline);
    setCurrentAge(draftData.debutAge!);
    setCurrentOvr(debutOvr);
    setPeakOvr(debutOvr);
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

    setSeasonRecords({});
    setSelectedAgeForStats(draftData.debutAge!);
  }



  const { handleNextSeason } = useCareerSeasonTransition({
    currentAge,
    clubStints,
    currentClub,
    currentContinentalCup,
    playerNationality,
    playerDebutAge,
    playerCareerLength,
    currentOvr,
    currentStats,
    setStatsTimeline,
    setPeakOvr,
    setClubStints,
    setCurrentContinentalCup,
    setAchievements,
    setCurrentAge,
    setContractYearsRemaining,
    applySimResultToRecords,
    finalizeSeasonRecord,
  });

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
    peakOvr,
    setPeakOvr,
    currentStats,
    setCurrentStats,
    currentClub,
    setCurrentClub,
    currentContinentalCup,
    setCurrentContinentalCup,
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
