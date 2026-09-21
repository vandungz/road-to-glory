"use client";

import type { Dispatch, SetStateAction } from "react";
import type { CareerSubStep } from "@/types/domain";

type ModalType = "league" | "cup" | "continental" | "national" | "ballon_dor_nomination" | "season_stats" | "season_recap" | "transfer" | "shop" | null;

export interface DraftDrumNavigationProps {
  isProcessing: boolean;
  shopTargetSeason: number | null;
  careerSubStep: CareerSubStep;
  isFinalCareerSeason: boolean;
  setActiveModal: Dispatch<SetStateAction<ModalType>>;
  handleStartSeason: () => void | Promise<void>;
  advanceToNextSeason: (autoStart?: boolean, shopDecision?: "completed" | "skipped") => void | Promise<void>;
}

export function useDraftDrumNavigation({
  isProcessing,
  shopTargetSeason,
  careerSubStep,
  isFinalCareerSeason,
  setActiveModal,
  handleStartSeason,
  advanceToNextSeason,
}: DraftDrumNavigationProps) {
  function handleNextSeason() {
    void advanceToNextSeason(false, isFinalCareerSeason ? "skipped" : "completed");
  }

  function handleContinueFromShop() {
    if (isProcessing || shopTargetSeason === null) return;
    if (careerSubStep === "idle") {
      setActiveModal(null);
      void handleStartSeason();
      return;
    }
    if (careerSubStep === "resolved") {
      void advanceToNextSeason(true, "completed");
    }
  }

  function handleShopReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      void advanceToNextSeason(true, "completed");
      return;
    }
    if (careerSubStep === "idle") handleStartSeason();
  }

  function handleTransferReturn(action: "start" | "advance") {
    if (isProcessing) return;
    if (action === "advance") {
      void advanceToNextSeason(true, "completed");
      return;
    }
    if (careerSubStep === "idle") handleStartSeason();
  }
  return { handleNextSeason, handleContinueFromShop, handleShopReturn, handleTransferReturn };
}
