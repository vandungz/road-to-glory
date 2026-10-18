"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { completeTransferCommandAction } from "@/actions/career-transfer.actions";
import type { WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "../components/TransferWindowPanel";
import type { ContractOfferCard, TransferDealAttemptResult, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { TransferCommandResult } from "@/features/career/contracts/transfer-transition.contract";
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
  ): Promise<TransferDealAttemptResult & { offer?: ContractOfferCard }> {
    if (!checkpointSync.isEnabled) return { resolution: "accepted", offer };
    const { playerId: syncPlayerId, seasonId, revision } = checkpointSync.state;
    if (!syncPlayerId || !seasonId || revision === null) {
      setApproachBanner("Không thể xác nhận chuyển nhượng — thiếu checkpoint mùa hiện tại.");
      return { resolution: "error" };
    }
    try {
      const result: TransferCommandResult = await completeTransferCommandAction({
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
      if (result.status !== "accepted") {
        setApproachBanner(result.message);
        return {
          resolution: result.status === "cancelled" ? "cancelled" : "rejected",
          failedWageOptions: result.failedWageOptions,
        };
      }
      checkpointSync.applyTransferCompletion(result.transfer);
      statsProps.setWalletBalance(result.transfer.walletBalance);
      return {
        resolution: "accepted",
        offer: {
          ...offer,
          clubId: result.transfer.clubId ?? offer.clubId,
          clubName: result.transfer.clubName,
          leagueName: result.transfer.leagueName,
          transferFee: result.transfer.fee,
          contractYears: result.transfer.contractYears,
          wageAnnual: result.transfer.wageAnnual,
        },
      };
    } catch (error) {
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      const message = error instanceof Error ? error.message : "";
      setApproachBanner(message || "Không thể chốt chuyển nhượng — hãy thử lại.");
      return { resolution: "error" };
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
  ): Promise<TransferDealAttemptResult> {
    const ownsProcessing = !isProcessing;
    if (ownsProcessing) setIsProcessing(true);
    try {
      const committed = await commitTransferSelection(offer, wageOption);
      if (committed.resolution !== "accepted" || !committed.offer) return committed;
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
      return committed;
    } catch (error) {
      setApproachBanner(error instanceof Error ? error.message : "Không thể chốt chuyển nhượng — hãy thử lại.");
      return { resolution: "error" };
    } finally {
      if (ownsProcessing) setIsProcessing(false);
    }
  }

  async function handleRejectTransferWindow() {
    if (isProcessing) return;
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
        if (result.status !== "accepted") {
          setApproachBanner(result.message);
          setIsProcessing(false);
          return;
        }
        checkpointSync.applyTransferCompletion(result.transfer);
      } catch {
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
