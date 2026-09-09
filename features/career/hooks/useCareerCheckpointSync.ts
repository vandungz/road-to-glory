"use client";

import { useCallback, useRef, useState } from "react";
import { getCareerProgressAction } from "@/actions/career-progress.actions";
import {
  resolveWheelCheckpointAction,
  startCareerSeasonAction,
} from "@/actions/career-checkpoint.actions";
import { commitSeasonStatsAction } from "@/actions/career-season-stats.actions";
import { advanceCareerSeasonAction } from "@/actions/career-season.actions";
import { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";
import type { CareerProgressDto } from "@/features/career/contracts/career-progress.contract";
import type { WheelCheckpointDto } from "@/features/career/contracts/checkpoint.contract";
import type { SeasonStatsCommitDto } from "@/features/career/contracts/season-stats.contract";
import type { TransferCompletionDto } from "@/features/career/contracts/transfer-transition.contract";

export interface CareerCheckpointSyncState {
  playerId: string | null;
  seasonId: string | null;
  revision: number | null;
  checkpointVersion: number;
  currentAge: number | null;
  currentStep: string | null;
  currentWheel: string | null;
  seasonContinentalCup: string | null;
}

const INITIAL_STATE: CareerCheckpointSyncState = {
  playerId: null,
  seasonId: null,
  revision: null,
  checkpointVersion: 1,
  currentAge: null,
  currentStep: null,
  currentWheel: null,
  seasonContinentalCup: null,
};

function readSeasonContinentalCup(runtimeState: unknown): string | null {
  if (runtimeState !== null && typeof runtimeState === "object" && !Array.isArray(runtimeState)) {
    const value = (runtimeState as Record<string, unknown>).continentalCupType;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export function isCareerRevisionConflict(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return code === "STALE_REVISION" || code === "INVALID_STEP" || code === "SEASON_NOT_ACTIVE";
  }
  return false;
}

/**
 * Client transport boundary for V2 career commands. It contains no game
 * decisions: the server returns the outcome, revision and next step; this
 * hook only keeps the FE transport cursor aligned with that response.
 */
export function useCareerCheckpointSync() {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const pendingWheelKeysRef = useRef(new Map<string, string>());
  const pendingSeasonStatsKeysRef = useRef(new Map<string, string>());

  const applyState = useCallback((next: CareerCheckpointSyncState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const applyCheckpoint = useCallback((checkpoint: WheelCheckpointDto) => {
    const current = stateRef.current;
    applyState({
      ...current,
      revision: checkpoint.revision,
      currentAge: checkpoint.currentAge,
      currentStep: checkpoint.currentStep,
      currentWheel: checkpoint.currentWheel,
      seasonContinentalCup: checkpoint.seasonContinentalCup,
    });
  }, [applyState]);

  const applyProgress = useCallback((progress: CareerProgressDto) => {
    const currentSeason = progress.currentSeason;
    applyState({
      playerId: progress.player.id,
      seasonId: currentSeason?.seasonId ?? null,
      revision: progress.player.revision,
      checkpointVersion: progress.player.checkpointVersion,
      currentAge: progress.player.currentAge,
      currentStep: progress.player.currentStep,
      currentWheel: progress.player.currentWheel,
      seasonContinentalCup: currentSeason
        ? readSeasonContinentalCup(currentSeason.runtimeState) ?? progress.player.currentContinentalCup
        : null,
    });
  }, [applyState]);

  const hydrate = useCallback(async (playerId: string): Promise<CareerProgressDto> => {
    const progress = await getCareerProgressAction({ playerId });
    applyProgress(progress);
    return progress;
  }, [applyProgress]);

  const recoverFromRevisionConflict = useCallback(async (playerId: string, requestKey: string) => {
    pendingWheelKeysRef.current.delete(requestKey);
    pendingSeasonStatsKeysRef.current.delete(requestKey);
    try {
      await hydrate(playerId);
    } catch (hydrateError) {
      // Preserve the original command error for the existing UI error path;
      // a later explicit retry can attempt hydration again.
      console.error("Career conflict recovery hydration failed:", hydrateError);
    }
  }, [hydrate]);

  const resync = useCallback(async (): Promise<CareerProgressDto | null> => {
    const playerId = stateRef.current.playerId;
    if (!playerId) return null;
    try {
      return await hydrate(playerId);
    } catch (error) {
      console.error("Career authoritative resync failed:", error);
      return null;
    }
  }, [hydrate]);

  const attach = useCallback((params: {
    playerId: string;
    revision: number;
    checkpointVersion: number;
    currentAge: number | null;
    currentStep: string | null;
    currentWheel: string | null;
    seasonId?: string | null;
    seasonContinentalCup?: string | null;
  }) => {
    applyState({
      playerId: params.playerId,
      seasonId: params.seasonId ?? null,
      revision: params.revision,
      checkpointVersion: params.checkpointVersion,
      currentAge: params.currentAge,
      currentStep: params.currentStep,
      currentWheel: params.currentWheel,
      seasonContinentalCup: params.seasonContinentalCup ?? null,
    });
  }, [applyState]);

  const startSeason = useCallback(async () => {
    const current = stateRef.current;
    if (!current.playerId || current.checkpointVersion < 2 || current.revision === null) return null;
    const started = await startCareerSeasonAction({
      playerId: current.playerId,
      expectedRevision: current.revision,
    });
    applyState({
      ...current,
      seasonId: started.seasonId,
      revision: started.revision,
      currentAge: started.age,
      currentStep: started.currentStep,
      currentWheel: "career",
      seasonContinentalCup: started.seasonContinentalCup,
    });
    return started;
  }, [applyState]);

  const resolveWheel = useCallback(async (params: {
    stepKey: string;
    wheelType?: string;
    choice?: string | number | boolean;
  }) => {
    const current = stateRef.current;
    if (!current.playerId || !current.seasonId || current.checkpointVersion < 2 || current.revision === null) {
      throw new Error("Career checkpoint sync chưa sẵn sàng");
    }
    const wheelType = params.wheelType ?? getWheelTypeForStep(params.stepKey);
    if (!wheelType) throw new Error("Wheel step không hợp lệ");

    const requestKey = `${current.playerId}:${current.seasonId}:${params.stepKey}:${current.revision}`;
    const idempotencyKey = pendingWheelKeysRef.current.get(requestKey) ?? newIdempotencyKey();
    pendingWheelKeysRef.current.set(requestKey, idempotencyKey);
    try {
      const checkpoint = await resolveWheelCheckpointAction({
        playerId: current.playerId,
        seasonId: current.seasonId,
        stepKey: params.stepKey,
        wheelType,
        expectedRevision: current.revision,
        idempotencyKey,
        ...(params.choice === undefined ? {} : { choice: params.choice }),
      });
      pendingWheelKeysRef.current.delete(requestKey);
      applyCheckpoint(checkpoint);
      return checkpoint;
    } catch (error) {
      if (isCareerRevisionConflict(error)) {
        await recoverFromRevisionConflict(current.playerId, requestKey);
      }
      // Keep the key for transport failures so a timeout/retry replays the
      // same server result instead of requesting a second random outcome.
      throw error;
    }
  }, [applyCheckpoint, recoverFromRevisionConflict]);

  const commitSeasonStats = useCallback(async (): Promise<SeasonStatsCommitDto> => {
    const current = stateRef.current;
    if (!current.playerId || !current.seasonId || current.checkpointVersion < 2 || current.revision === null) {
      throw new Error("Career checkpoint sync chưa sẵn sàng");
    }
    const requestKey = `${current.playerId}:${current.seasonId}:${current.revision}`;
    const idempotencyKey = pendingSeasonStatsKeysRef.current.get(requestKey) ?? newIdempotencyKey();
    pendingSeasonStatsKeysRef.current.set(requestKey, idempotencyKey);
    try {
      const response = await commitSeasonStatsAction({
        playerId: current.playerId,
        seasonId: current.seasonId,
        expectedRevision: current.revision,
        idempotencyKey,
      });
      pendingSeasonStatsKeysRef.current.delete(requestKey);
      applyState({
        ...current,
        revision: response.revision,
        currentStep: response.nextStep,
        currentWheel: "career",
      });
      return response;
    } catch (error) {
      if (isCareerRevisionConflict(error)) {
        await recoverFromRevisionConflict(current.playerId, requestKey);
      }
      // Keep the key for transport failures so a retry after a timeout replays
      // the same simulation.
      throw error;
    }
  }, [applyState, recoverFromRevisionConflict]);

  const applyTransferCompletion = useCallback((response: TransferCompletionDto) => {
    const current = stateRef.current;
    applyState({
      ...current,
      revision: response.revision,
      currentAge: response.currentAge,
      currentStep: response.nextStep,
      currentWheel: "career",
    });
  }, [applyState]);

  const applyShopPurchase = useCallback((revision: number) => {
    const current = stateRef.current;
    applyState({ ...current, revision });
  }, [applyState]);

  const advanceSeason = useCallback(async (
    shopDecision: "completed" | "skipped" = "completed",
  ) => {
    const current = stateRef.current;
    if (!current.playerId || !current.seasonId || current.checkpointVersion < 2 || current.revision === null) {
      throw new Error("Career checkpoint sync chưa sẵn sàng");
    }
    const requestKey = [
      current.playerId,
      current.seasonId,
      current.revision,
      shopDecision,
    ].join(":");
    const idempotencyKey = pendingSeasonStatsKeysRef.current.get(requestKey) ?? newIdempotencyKey();
    pendingSeasonStatsKeysRef.current.set(requestKey, idempotencyKey);
    try {
      const response = await advanceCareerSeasonAction({
        playerId: current.playerId,
        seasonId: current.seasonId,
        expectedRevision: current.revision,
        idempotencyKey,
        shopDecision,
      });
      pendingSeasonStatsKeysRef.current.delete(requestKey);
      applyState({
        ...current,
        revision: response.revision,
        currentAge: response.nextAge,
        currentStep: response.nextStep,
        currentWheel: response.isRetired ? null : "career",
        seasonId: response.isRetired ? current.seasonId : null,
        seasonContinentalCup: null,
      });
      return response;
    } catch (error) {
      if (isCareerRevisionConflict(error)) {
        await recoverFromRevisionConflict(current.playerId, requestKey);
      }
      // Keep the key for transport failures so a timeout retries the same
      // season transition.
      throw error;
    }
  }, [applyState, recoverFromRevisionConflict]);

  const isV2 = Boolean(state.playerId && state.checkpointVersion >= 2 && state.revision !== null);

  return {
    state,
    isEnabled: isV2,
    hydrate,
    resync,
    attach,
    startSeason,
    resolveWheel,
    commitSeasonStats,
    applyTransferCompletion,
    applyShopPurchase,
    advanceSeason,
  };
}
