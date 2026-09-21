"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { completeTransferCommandAction } from "@/actions/career-transfer.actions";
import type { WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type { ContractOfferCard, TransferDealResolution, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { CareerSubStep, ClubSummary } from "@/types/domain";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;

export interface DraftDrumTransferCommitProps {
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  clubs: ClubSummary[];
  transferOffer: ContractOfferCard | null;
  transferMarket: TransferMarketResult | null;
  isProcessing: boolean;
  currentClub: ClubSummary | null;
  transferCommandKeyRef: MutableRefObject<string | null>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setApproachBanner: Dispatch<SetStateAction<string | null>>;
  setTransferOffer: Dispatch<SetStateAction<ContractOfferCard | null>>;
  setTransferMarket: Dispatch<SetStateAction<TransferMarketResult | null>>;
  setShowShortlist: Dispatch<SetStateAction<boolean>>;
  setApproachRejects: Dispatch<SetStateAction<ApproachRejectState>>;
  setWillingToMove: Dispatch<SetStateAction<boolean>>;
  setCareerSubStep: Dispatch<SetStateAction<CareerSubStep>>;
}

export function useDraftDrumTransferCommit({
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
}: DraftDrumTransferCommitProps) {
  async function commitTransferSelection(
    offer: ContractOfferCard,
    wageOption: WageDealOption = "standard",
  ): Promise<{ resolution: TransferDealResolution; offer?: ContractOfferCard }> {
    if (!checkpointSync.isEnabled) return { resolution: "accepted", offer };
    const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
    if (!syncPlayerId || !seasonId || revision === null) {
      setApproachBanner("Không thể xác nhận chuyển nhượng — thiếu checkpoint mùa hiện tại.");
      return { resolution: "error" };
    }
    try {
      const result = await completeTransferCommandAction({
        playerId: syncPlayerId,
        seasonId,
        expectedRevision: revision,
        idempotencyKey: transferCommandKeyRef.current ?? (
          transferCommandKeyRef.current = globalThis.crypto.randomUUID()
        ),
        kind: offer.kind,
        clubId: offer.clubId,
        wageOption,
      });
      checkpointSync.applyTransferCompletion(result);
      statsProps.setWalletBalance(result.walletBalance);
      return {
        resolution: "accepted",
        offer: {
          ...offer,
          clubId: result.clubId ?? offer.clubId,
          clubName: result.clubName,
          leagueName: result.leagueName,
          transferFee: result.fee,
          contractYears: result.contractYears,
          wageAnnual: result.wageAnnual,
        },
      };
    } catch (error) {
      console.error("Transfer completion command failed:", error);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      const message = error instanceof Error ? error.message : "";
      const cancelled = message.includes("thương vụ") || message.includes("đã bị hủy");
      const rejected = message.includes("mức lương") || message.includes("lương");
      setApproachBanner(message || "Không thể chốt chuyển nhượng — hãy thử lại.");
      return { resolution: cancelled ? "cancelled" : rejected ? "rejected" : "error" };
    }
  }

  async function handleAcceptTransfer(accept: boolean, offerOverride?: ContractOfferCard | null) {
    const selectedOffer = offerOverride ?? transferOffer;
    if (isProcessing || !accept || !selectedOffer) return;
    const committed = await commitTransferSelection(selectedOffer);
    if (committed.resolution !== "accepted" || !committed.offer) return;
    statsProps.handleAcceptTransfer(
      true,
      committed.offer,
      clubs,
      setTransferOffer,
      setCareerSubStep,
      () => {
        setTransferMarket(null);
        setShowShortlist(false);
        setApproachRejects({});
        setApproachBanner(null);
      },
    );
  }

  async function handleAcceptMarketOffer(
    offer: ContractOfferCard,
    wageOption: WageDealOption = "standard",
  ): Promise<TransferDealResolution> {
    console.log("[Transfer Flow] User accepted offer:", offer.clubName, offer);
    const ownsProcessing = !isProcessing;
    if (ownsProcessing) setIsProcessing(true);
    try {
      const committed = await commitTransferSelection(offer, wageOption);
      if (committed.resolution !== "accepted" || !committed.offer) return committed.resolution;
      const authoritativeOffer = committed.offer;
      const finalizedOffer = checkpointSync.isEnabled
        ? authoritativeOffer
        : {
            ...authoritativeOffer,
            wageAnnual: Math.round(
              authoritativeOffer.wageAnnual *
                (wageOption === "lower" ? 0.8 : wageOption === "higher" ? 1.15 : 1),
            ),
          };
      setTransferOffer(finalizedOffer);
      statsProps.handleAcceptTransfer(
        true,
        finalizedOffer,
        clubs,
        setTransferOffer,
        setCareerSubStep,
        () => {
          setTransferMarket(null);
          setShowShortlist(false);
          setWillingToMove(false);
          setApproachRejects({});
          setApproachBanner(null);
        },
      );
      return "accepted";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return message.includes("thương vụ") || message.includes("đã bị hủy") ? "cancelled" : message.includes("mức lương") || message.includes("lương") ? "rejected" : "error";
    } finally {
      if (ownsProcessing) setIsProcessing(false);
    }
  }

  async function handleRejectTransferWindow() {
    if (isProcessing) return;
    console.log("[Transfer Flow] User bypassed/rejected transfer window. Staying at current club. Transitioning careerSubStep to 'resolved'.");
    const remaining = transferMarket?.contract.yearsRemaining ?? statsProps.contractYearsRemaining;
    const fa = remaining <= 0 || statsProps.isUnemployed || !currentClub;
    if (checkpointSync.isEnabled) {
      const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
      if (!syncPlayerId || !seasonId || revision === null) {
        setApproachBanner("Không thể chốt ở lại — thiếu checkpoint mùa hiện tại.");
        return;
      }
      setIsProcessing(true);
      try {
        const result = await completeTransferCommandAction({
          playerId: syncPlayerId,
          seasonId,
          expectedRevision: revision,
          idempotencyKey: transferCommandKeyRef.current ?? (
            transferCommandKeyRef.current = globalThis.crypto.randomUUID()
          ),
          kind: "stay",
        });
        checkpointSync.applyTransferCompletion(result);
      } catch (error) {
        console.error("Stay transfer command failed:", error);
        await checkpointSync.resync();
        setApproachBanner("Không thể chốt ở lại — hãy thử lại.");
        setIsProcessing(false);
        return;
      }
    }
    if (fa) {
      statsProps.enterUnemployed();
    }
    setTransferOffer(null);
    setTransferMarket(null);
    setShowShortlist(false);
    setApproachRejects({});
    setApproachBanner(null);
    setCareerSubStep("resolved");
    setIsProcessing(false);
  }
  return {
    handleAcceptTransfer,
    handleAcceptMarketOffer,
    handleRejectTransferWindow,
  };
}
