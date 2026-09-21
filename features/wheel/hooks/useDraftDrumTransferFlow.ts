"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  resolveTransferNegotiationCommandAction,
  searchTransferClubsCommandAction,
} from "@/actions/career-transfer.actions";
import {
  resolveShortlistApproachAction,
  resolveProactiveRenewalAction,
  searchClubsForApproachAction,
} from "@/actions/season.actions";
import {
  applyTransferFeeDealChance,
  approachChancePercent,
  computeEffectivePositionOvr,
  type TransferFeeDealOption,
} from "@/lib/transfer-economy";
import type { WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type {
  ContractOfferCard,
  ShortlistClubCard,
  TransferMarketResult,
} from "@/features/transfer/services/transfer.service";
import type { CareerSubStep, ClubSummary } from "@/types/domain";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";
import { useDraftDrumTransferCommit } from "./useDraftDrumTransferCommit";

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;

interface TransferStatFlow {
  triggerTransferCheck(input: { willingToMove: boolean; stayOnWindow: boolean }): Promise<void> | void;
}

export interface DraftDrumTransferFlowProps {
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  statFlow: TransferStatFlow;
  clubs: ClubSummary[];
  position: string;
  currentStats: Record<string, number>;
  currentOvr: number;
  currentAge: number;
  currentClub: ClubSummary | null;
  playerDebutAge: number;
  playerCareerLength: number;
  yearSimResult: SimulatedSeasonResult | null;
  transferOffer: ContractOfferCard | null;
  transferMarket: TransferMarketResult | null;
  isProcessing: boolean;
  careerSubStep: CareerSubStep;
  approachRejects: ApproachRejectState;
  proactiveRenewalRejectedAge: number | null;
  transferCommandKeyRef: MutableRefObject<string | null>;
  proactiveRenewalInFlightRef: MutableRefObject<boolean>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setApproachBanner: Dispatch<SetStateAction<string | null>>;
  setTransferOffer: Dispatch<SetStateAction<ContractOfferCard | null>>;
  setTransferMarket: Dispatch<SetStateAction<TransferMarketResult | null>>;
  setShowShortlist: Dispatch<SetStateAction<boolean>>;
  setApproachRejects: Dispatch<SetStateAction<ApproachRejectState>>;
  setWillingToMove: Dispatch<SetStateAction<boolean>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
  setProactiveRenewalRejectedAge: Dispatch<SetStateAction<number | null>>;
}

export function useDraftDrumTransferFlow({
  statsProps,
  checkpointSync,
  statFlow,
  clubs,
  position,
  currentStats,
  currentOvr,
  currentAge,
  currentClub,
  playerDebutAge,
  playerCareerLength,
  yearSimResult,
  transferOffer,
  transferMarket,
  isProcessing,
  careerSubStep,
  approachRejects,
  proactiveRenewalRejectedAge,
  transferCommandKeyRef,
  proactiveRenewalInFlightRef,
  setIsProcessing,
  setApproachBanner,
  setTransferOffer,
  setTransferMarket,
  setShowShortlist,
  setApproachRejects,
  setWillingToMove,
  setCareerSubStep,
  setProactiveRenewalRejectedAge,
}: DraftDrumTransferFlowProps) {
  const commitFlow = useDraftDrumTransferCommit({
    statsProps,
    checkpointSync,
    clubs,
    transferOffer,
    transferMarket,
    isProcessing,
    currentClub,
    transferCommandKeyRef,
    setIsProcessing,
    setApproachBanner,
    setTransferOffer,
    setTransferMarket,
    setShowShortlist,
    setApproachRejects,
    setWillingToMove,
    setCareerSubStep,
  });
  const {
    handleAcceptTransfer,
    handleAcceptMarketOffer,
    handleRejectTransferWindow,
  } = commitFlow;
  async function handleApproachShortlist(club: ShortlistClubCard, feeOption?: TransferFeeDealOption): Promise<boolean> {
    if (isProcessing || !transferMarket || !club.canApproach || club.acceptChance == null) return false;
    if (approachRejects[club.clubId]) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    try {
      const selectedOption = feeOption ?? "standard";
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      let res;
      if (checkpointSync.isEnabled) {
        if (!syncPlayerId || !seasonId || revision === null) {
          throw new Error("Thiếu checkpoint mùa hiện tại");
        }
        res = await resolveTransferNegotiationCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          kind: "approach",
          clubId: club.clubId,
          feeOption: selectedOption,
        });
      } else {
        const adjustedChance = applyTransferFeeDealChance(club.acceptChance, selectedOption);
        const effPosOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
        res = await resolveShortlistApproachAction({
          clubId: club.clubId,
          clubName: club.clubName,
          leagueId: club.leagueId,
          leagueName: club.leagueName,
          prestige: club.prestige,
          leagueTier: club.leagueTier,
          previewFee: club.previewFee,
          previewWage: club.previewWage,
          previewYears: club.previewYears,
          mandatoryBuyout: transferMarket.mandatoryBuyout,
          feeOption: selectedOption,
          clientAcceptChance: adjustedChance,
          currentOvr,
          effPositionOvr: effPosOvr,
          currentAge,
          matchRating: yearSimResult?.matchRating ?? 6.0,
          contractYearsRemaining: statsProps.contractYearsRemaining,
          isUnemployed: statsProps.isUnemployed || !currentClub,
          influenceScore: statsProps.influenceScore,
        });
      }

      if (res.accepted) {
        console.log(`[Transfer Flow] Approach to ${club.clubName} ACCEPTED!`);
        setApproachBanner(`${club.clubName} đồng ý ký (${approachChancePercent(res.acceptChance)}%)`);
        // The approach only issues an offer. The user must still negotiate the
        // salary on the next screen; completing here made that step falsely
        // look like a guaranteed confirmation.
        setTransferOffer(res.offer);
        return true;
      } else {
        console.log(`[Transfer Flow] Approach to ${club.clubName} REJECTED.`);
        setApproachRejects((prev) => ({
          ...prev,
          [club.clubId]: { chance: res.acceptChance, reason: res.rejectReason },
        }));
        setApproachBanner(
          `${club.clubName} đã từ chối (Tỷ lệ đàm phán ${approachChancePercent(res.acceptChance)}%) — ${res.rejectReason}`,
        );
        return false;
      }
    } catch (err) {
      console.error("Approach resolve failed:", err);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      setApproachBanner("Không thể ngỏ lời — thử lại");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleProactiveRenewal(wageOption?: WageDealOption): Promise<boolean> {
    if (
      isProcessing ||
      !currentClub ||
      proactiveRenewalInFlightRef.current ||
      proactiveRenewalRejectedAge === currentAge
    ) return false;
    proactiveRenewalInFlightRef.current = true;
    setIsProcessing(true);
    setApproachBanner(null);
    const retireAge = playerDebutAge + playerCareerLength;
    try {
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      let res;
      if (checkpointSync.isEnabled) {
        if (!syncPlayerId || !seasonId || revision === null) {
          throw new Error("Thiếu checkpoint mùa hiện tại");
        }
        res = await resolveTransferNegotiationCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          kind: "renewal",
          wageOption,
        });
      } else {
        res = await resolveProactiveRenewalAction({
          currentClubId: currentClub.id,
          currentClubName: currentClub.name,
          currentClubLeagueId: currentClub.leagueId,
          currentClubLeagueName: currentClub.leagueName,
          currentClubPrestige: currentClub.prestige,
          currentClubLeagueTier: currentClub.leagueTier,
          currentOvr,
          currentStats: statsProps.statsTimeline?.[statsProps.statsTimeline.length - 1] as Record<string, number> | undefined,
          position,
          currentAge,
          retireAge,
          matchRating: yearSimResult?.matchRating ?? 6.0,
          goals: yearSimResult?.goals ?? 0,
          assists: yearSimResult?.assists ?? 0,
          cleanSheets: yearSimResult?.cleanSheets ?? 0,
          contractYearsRemaining: statsProps.contractYearsRemaining,
          currentWageAnnual: statsProps.currentWageAnnual,
          wageOption,
        });
      }

      if (res.accepted) {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} ACCEPTED!`);
        setApproachBanner(`Gia hạn thành công với ${currentClub.name}!`);
        setTransferOffer(res.offer);
        return true;
      } else {
        console.log(`[Transfer Flow] Proactive renewal with ${currentClub.name} REJECTED.`);
        setProactiveRenewalRejectedAge(currentAge);
        setApproachBanner(`Gia hạn không thành công — ${res.rejectReason}`);
        return false;
      }
    } catch (err) {
      console.error("Proactive renewal failed:", err);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      setApproachBanner("Không thể gửi đề nghị gia hạn — thử lại");
      return false;
    } finally {
      proactiveRenewalInFlightRef.current = false;
      setIsProcessing(false);
    }
  }

  function clearPendingTransferOffer() {
    setTransferOffer(null);
  }

  async function handleSearchClubs(params: {
    query?: string;
    leagueId?: string;
    prestigeMin?: number;
    prestigeMax?: number;
    page: number;
  }) {
    const retireAge = playerDebutAge + playerCareerLength;
    const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
    if (checkpointSync.isEnabled) {
      if (!syncPlayerId || !seasonId || revision === null) {
        throw new Error("Thiếu checkpoint mùa hiện tại");
      }
      return searchTransferClubsCommandAction({
        playerId: syncPlayerId,
        seasonId,
        expectedRevision: revision,
        query: params.query,
        leagueId: params.leagueId,
        prestigeMin: params.prestigeMin,
        prestigeMax: params.prestigeMax,
        page: params.page,
        pageSize: 8,
      });
    }
    return searchClubsForApproachAction({
      ...params,
      currentClubId: currentClub?.id ?? null,
      currentOvr,
      currentStats: statsProps.statsTimeline?.[statsProps.statsTimeline.length - 1] as Record<string, number> | undefined,
      currentAge,
      retireAge,
      matchRating: yearSimResult?.matchRating ?? 6.0,
      position,
      contractYearsRemaining: statsProps.contractYearsRemaining,
      isUnemployed: statsProps.isUnemployed || !currentClub,
      influenceScore: statsProps.influenceScore,
    });
  }

  function handleSetWillingToMove(v: boolean) {
    setWillingToMove(v);
    if (careerSubStep === "transfer") {
      setIsProcessing(true);
      setApproachRejects({});
      void statFlow.triggerTransferCheck({ willingToMove: v, stayOnWindow: true });
    }
  }
  return {
    handleAcceptTransfer,
    handleAcceptMarketOffer,
    clearPendingTransferOffer,
    handleRejectTransferWindow,
    handleApproachShortlist,
    handleProactiveRenewal,
    handleSearchClubs,
    handleSetWillingToMove,
  };
}
