import type { Prisma } from "@/app/generated/prisma/client";
import type { ResolveWheelCommand, WheelCheckpointDto } from "@/features/career/contracts/checkpoint.contract";

export type CheckpointJson =
  | null
  | string
  | number
  | boolean
  | { [key: string]: CheckpointJson }
  | CheckpointJson[];

export type CheckpointCommandErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "SEASON_NOT_ACTIVE"
  | "INVALID_STEP"
  | "CHECKPOINT_EXISTS"
  | "STALE_REVISION";

export class CheckpointCommandError extends Error {
  constructor(public readonly code: CheckpointCommandErrorCode, message: string) {
    super(message);
    this.name = "CheckpointCommandError";
  }
}

export interface PlayerCheckpointState {
  id: string;
  name?: string;
  gameSessionId: string;
  revision: number;
  peakOvr: number;
  currentAge: number | null;
  currentStep: string | null;
  currentWheel: string | null;
  checkpointVersion: number;
  debutAge: number;
  careerLengthYears: number;
  position: string;
  nationality: string;
  currentContinentalCup: string;
  statsTimeline: unknown;
  clubStints: unknown;
  seasonHistory: unknown;
  hiddenStats: unknown;
  shopInventory: unknown;
  isUnemployed: boolean;
  gameSession: { userId: string };
}

export interface SeasonCheckpointState {
  id: string;
  careerPlayerId: string;
  seasonNumber: number;
  age: number;
  status: string;
  runtimeState: unknown;
}

export interface WheelCheckpointResolverContext {
  player: PlayerCheckpointState;
  season: SeasonCheckpointState;
  choice: ResolveWheelCommand["choice"];
  currentClub: {
    id: string;
    name: string;
    leagueId: string;
    leagueName: string;
    leagueTier: number;
    prestige: number;
    continentalType: string;
  } | null;
  leagueSize: number;
}

export interface WheelResolution {
  outcome: CheckpointJson;
  publicResult?: CheckpointJson;
  nextAge?: number;
  nextStep: string;
  nextWheel?: string;
  seasonRuntimeState?: CheckpointJson;
  seasonStatus?: string;
  statsTimeline?: CheckpointJson;
  peakOvr?: number;
}

export type ServerWheelResolver = (
  context: WheelCheckpointResolverContext,
) => Promise<WheelResolution> | WheelResolution;

export const CAREER_PROJECTION_STEPS = new Set([
  "idle",
  "standing",
  "domestic_cup",
  "continental_cup",
  "national_callup",
  "national_tournament",
  "season_stats",
  "ballon_dor_nomination",
  "ballon_dor_ranking",
  "dir_increase",
  "dir_decrease",
  "count",
  "selector",
  "magnitude",
  "transfer",
  "resolved",
  "retired",
]);

export interface CareerSeasonStartDto {
  seasonId: string;
  seasonNumber: number;
  age: number;
  revision: number;
  currentStep: string;
  /** Ticket assigned to this exact season, not the player's next-season projection. */
  seasonContinentalCup: string;
}

export const playerCheckpointSelect = {
  id: true,
  name: true,
  gameSessionId: true,
  revision: true,
  peakOvr: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  checkpointVersion: true,
  debutAge: true,
  careerLengthYears: true,
  position: true,
  nationality: true,
  currentContinentalCup: true,
  statsTimeline: true,
  clubStints: true,
  seasonHistory: true,
  hiddenStats: true,
  shopInventory: true,
  isUnemployed: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

export const seasonCheckpointSelect = {
  id: true,
  careerPlayerId: true,
  seasonNumber: true,
  age: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

export const seasonStartPlayerSelect = {
  id: true,
  gameSessionId: true,
  revision: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  checkpointVersion: true,
  currentContinentalCup: true,
  clubStints: true,
  isUnemployed: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

export function toCheckpointDto(
  checkpoint: {
    id: string;
    revisionAfter: number;
    outcome: unknown;
    publicResult: unknown;
  },
  player: PlayerCheckpointState,
  seasonRuntimeState: unknown,
  replayed: boolean,
): WheelCheckpointDto {
  const latest = Array.isArray(player.statsTimeline)
    ? player.statsTimeline.at(-1)
    : null;
  const latestRecord = latest !== null && typeof latest === "object" && !Array.isArray(latest)
    ? latest as Record<string, unknown>
    : {};
  const statKeys = player.position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return {
    checkpointId: checkpoint.id,
    revision: checkpoint.revisionAfter,
    currentAge: player.currentAge,
    currentStep: player.currentStep,
    currentWheel: player.currentWheel,
    // Legacy in-progress rows may predate the runtime ticket. Once a season
    // is missing that field, the projection is the only compatible fallback;
    // startCareerSeasonCommand repairs the row for subsequent requests.
    seasonContinentalCup: readSeasonContinentalCup(seasonRuntimeState) ?? player.currentContinentalCup,
    outcome: checkpoint.outcome,
    publicResult: checkpoint.publicResult,
    currentOvr: typeof latestRecord.ovr === "number" ? latestRecord.ovr : player.peakOvr,
    currentStats: Object.fromEntries(
      statKeys.map((key) => [key, typeof latestRecord[key] === "number" ? latestRecord[key] : 60]),
    ),
    replayed,
  };
}

export function readSeasonContinentalCup(runtimeState: unknown): string | null {
  if (runtimeState !== null && typeof runtimeState === "object" && !Array.isArray(runtimeState)) {
    const value = (runtimeState as Record<string, unknown>).continentalCupType;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** Starts exactly one in-progress season for the current career projection. */
