"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  purchaseShopItemAction,
  updateSeasonProgressAction,
} from "@/actions/season.actions";
import { purchaseShopItemCommandAction } from "@/actions/career-command.actions";
import type { ShopInventoryEntry } from "@/lib/shop-catalog";
import type { AchievementRecord, ClubStint, CurrentClub, SeasonHistory, StatSnapshot } from "@/types/domain";
import { getNationalTournamentName } from "../lib/simulation-helpers";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import type { useCareerStats } from "./useCareerStats";
import type { useCareerCheckpointSync } from "@/features/career/hooks/useCareerCheckpointSync";

type StatsController = ReturnType<typeof useCareerStats>;
type CheckpointController = ReturnType<typeof useCareerCheckpointSync>;
type DraftMode = "setup" | "career" | "retired";

interface SaveSnapshot {
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: AchievementRecord;
  currentContinentalCup: string;
  seasonHistory: SeasonHistory;
  contractYearsTotal: number;
  contractYearsRemaining: number;
  currentWageAnnual: number;
  marketValue: number;
  isUnemployed: boolean;
  currentAge: number;
  peakOvr: number;
  debutAge: number;
  careerLength: number;
  clubPrestige: number;
  matchRatingThisSeason: number;
  transferFeeThisSeason: number;
}

export interface DraftDrumPersistenceProps {
  statsProps: StatsController;
  checkpointSync: CheckpointController;
  mode: DraftMode;
  currentAge: number;
  currentClub: CurrentClub | null;
  currentContinentalCup: string;
  playerNationality: string;
  careerSubStep: string;
  playerDebutAge: number;
  playerCareerLength: number;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: AchievementRecord;
  seasonRecords: SeasonHistory;
  isProcessing: boolean;
  shopCommandKeysRef: MutableRefObject<Map<string, string>>;
  prevAgeRef: MutableRefObject<number | null>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setSelectedAgeForStats: (age: number) => void;
}

export function useDraftDrumPersistence({
  statsProps,
  checkpointSync,
  mode,
  currentAge,
  currentClub,
  currentContinentalCup,
  playerNationality,
  careerSubStep,
  playerDebutAge,
  playerCareerLength,
  statsTimeline,
  clubStints,
  achievements,
  seasonRecords,
  isProcessing,
  shopCommandKeysRef,
  prevAgeRef,
  setIsProcessing,
  setSelectedAgeForStats,
}: DraftDrumPersistenceProps) {
  // Background save after each season — serialize để tránh 2 request bay song
  // song rồi về KHÔNG THEO THỨ TỰ gửi đi (network jitter), khiến 1 save cũ đè lên
  // save mới hơn trong DB. Chỉ cho phép 1 request tại 1 thời điểm; nếu có request
  // mới muốn gửi trong lúc request trước còn đang chạy, đánh dấu "pending" và gửi
  // NGAY sau khi request hiện tại xong, luôn lấy snapshot MỚI NHẤT tại thời điểm
  // gửi (không phải snapshot lúc bị hoãn) để đảm bảo cuối cùng luôn lưu đúng data
  // mới nhất.
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestSaveSnapshotRef = useRef<SaveSnapshot | null>(null);

  useEffect(() => {
    // Real transfer fee credited only if the LAST club stint started exactly this
    // season (derived from clubStints — no separate state to keep in sync/reset).
    const lastStint = clubStints[clubStints.length - 1];
    const transferFeeThisSeason =
      lastStint && lastStint.startAge === currentAge ? lastStint.feePaid ?? 0 : 0;

    latestSaveSnapshotRef.current = {
      statsTimeline, clubStints, achievements, currentContinentalCup,
      seasonHistory: seasonRecords,
      contractYearsTotal: statsProps.contractYearsTotal,
      contractYearsRemaining: statsProps.contractYearsRemaining,
      currentWageAnnual: statsProps.currentWageAnnual,
      marketValue: statsProps.marketValue,
      isUnemployed: statsProps.isUnemployed,
      currentAge,
      peakOvr: statsProps.peakOvrValue,
      debutAge: playerDebutAge,
      careerLength: playerCareerLength,
      clubPrestige: currentClub?.prestige ?? 2,
      // Season just completed is currentAge - 1 (this effect fires after currentAge
      // has already advanced to the season about to be played).
      matchRatingThisSeason: seasonRecords[currentAge - 1]?.matchRating ?? 6.0,
      transferFeeThisSeason,
    };
  });

  function runBackgroundSave(pid: string) {
    // V2 checkpoints already persist the complete authoritative transition.
    // Do not send the legacy aggregate snapshot after a season transition:
    // it would increment revision again and reintroduce client-owned writes.
    if (checkpointSync.isEnabled) return;
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    const snapshot = latestSaveSnapshotRef.current;
    if (!snapshot) return;
    saveInFlightRef.current = true;
    updateSeasonProgressAction({ playerId: pid, ...snapshot })
      .then((result) => {
        statsProps.setWalletBalance(result.walletBalance);
        statsProps.setInfluenceScore(result.influenceScore);
        statsProps.setShopInventory(result.shopInventory);
      })
      .catch((err) => console.error("Background save failed:", err))
      .finally(() => {
        saveInFlightRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          runBackgroundSave(pid);
        }
      });
  }

  // Module pages unmount this hook. Persist the completed season before
  // navigating to transfer/shop; waiting for an age change is too late because
  // the wheel result still only exists in React state at that point.
  async function persistCurrentProgress(): Promise<boolean> {
    if (checkpointSync.isEnabled) return !isProcessing;
    const pid = statsProps.playerId;
    const snapshot = latestSaveSnapshotRef.current;
    if (!pid || !snapshot || isProcessing) return !isProcessing;

    setIsProcessing(true);
    try {
      const result = await updateSeasonProgressAction({ playerId: pid, ...snapshot });
      statsProps.setWalletBalance(result.walletBalance);
      statsProps.setInfluenceScore(result.influenceScore);
      statsProps.setShopInventory(result.shopInventory);
      return true;
    } catch (err) {
      console.error("Progress save before module navigation failed:", err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  // Two valid shopping windows — both are "the upcoming season's wheels haven't spun
  // yet", just viewed from either side of the "Next Season" click:
  //  - "resolved": season `currentAge` just finished, target `currentAge + 1`.
  //  - "idle": season `currentAge` about to start, target `currentAge` itself.
  const isFinalCareerSeason = currentAge >= playerDebutAge + playerCareerLength;
  const shopTargetSeason =
    !isFinalCareerSeason && careerSubStep === "resolved" ? currentAge + 1
      : !isFinalCareerSeason && careerSubStep === "idle" ? currentAge
        : null;

  async function handlePurchaseShopItem(itemId: string): Promise<void> {
    const pid = statsProps.playerId;
    if (!pid || isProcessing || shopTargetSeason === null) return;
    setIsProcessing(true);
    try {
      const { revision } = checkpointSync.state;
      const requestKey = `${pid}:${itemId}:${shopTargetSeason}:${revision ?? "legacy"}`;
      const idempotencyKey = shopCommandKeysRef.current.get(requestKey) ?? globalThis.crypto.randomUUID();
      shopCommandKeysRef.current.set(requestKey, idempotencyKey);
      if (checkpointSync.isEnabled && revision === null) {
        throw new Error("Thiếu revision checkpoint hiện tại");
      }
      const result = checkpointSync.isEnabled
        ? await purchaseShopItemCommandAction({
            playerId: pid,
            itemId,
            targetSeason: shopTargetSeason,
            expectedRevision: revision,
            idempotencyKey,
          })
        : await purchaseShopItemAction({
            playerId: pid,
            itemId,
            currentAge,
            targetSeason: shopTargetSeason,
          });
      shopCommandKeysRef.current.delete(requestKey);
      statsProps.setWalletBalance(result.walletBalance);
      statsProps.setShopInventory(result.shopInventory as ShopInventoryEntry[]);
      if ("revision" in result) checkpointSync.applyShopPurchase(result.revision);
    } catch (err) {
      console.error("Purchase shop item failed:", err);
      if (checkpointSync.isEnabled) await checkpointSync.resync();
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    const previousAge = prevAgeRef.current;
    prevAgeRef.current = currentAge;
    // Hydration also changes currentAge from its placeholder value to the
    // persisted value. That is not a completed season and must not trigger a
    // background save with partially restored state.
    if (mode !== "career" || previousAge === null || previousAge === currentAge) return;
    const pid = statsProps.playerId;
    if (pid) runBackgroundSave(pid);
  // The save snapshot is maintained in refs so this effect only tracks a season change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge]);

  // Init season record for current age
  useEffect(() => {
    if (mode === "career" && currentClub) {
      statsProps.setSeasonRecords((prev) => {
        if (prev[currentAge]) return prev;
        return {
          ...prev,
          [currentAge]: {
            age: currentAge, clubId: currentClub.id, clubName: currentClub.name, leagueName: currentClub.leagueName,
            leagueId: currentClub.leagueId,
            standing: null, domesticCup: "Chờ quay",
            continentalCup: currentContinentalCup !== "none" ? { type: currentContinentalCup, result: "Chờ quay" } : null,
            nationalTeam: (currentAge % 2 === 0) ? {
              type: getNationalTournamentName(
                playerNationality, currentAge, playerDebutAge, getNationalContinentalCup,
              ),
              callup: "Chờ gọi", result: null,
            } : null,
          },
        };
      });
      setSelectedAgeForStats(currentAge);
    }
  // statsProps is a mutable facade; the listed state inputs are the record boundaries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge, mode, currentClub, currentContinentalCup, playerNationality, playerDebutAge]);
  return {
    isFinalCareerSeason,
    shopTargetSeason,
    persistCurrentProgress,
    handlePurchaseShopItem,
  };
}
