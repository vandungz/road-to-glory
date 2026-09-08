import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ResolveWheelCommand,
  WheelCheckpointDto,
} from "@/features/career/contracts/checkpoint.contract";

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

interface PlayerCheckpointState {
  id: string;
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

interface SeasonCheckpointState {
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

const CAREER_PROJECTION_STEPS = new Set([
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
}

const playerCheckpointSelect = {
  id: true,
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

const seasonCheckpointSelect = {
  id: true,
  careerPlayerId: true,
  seasonNumber: true,
  age: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

const seasonStartPlayerSelect = {
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

function toCheckpointDto(
  checkpoint: {
    id: string;
    revisionAfter: number;
    outcome: unknown;
    publicResult: unknown;
  },
  player: PlayerCheckpointState,
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
    outcome: checkpoint.outcome,
    publicResult: checkpoint.publicResult,
    currentOvr: typeof latestRecord.ovr === "number" ? latestRecord.ovr : player.peakOvr,
    currentStats: Object.fromEntries(
      statKeys.map((key) => [key, typeof latestRecord[key] === "number" ? latestRecord[key] : 60]),
    ),
    replayed,
  };
}

/** Starts exactly one in-progress season for the current career projection. */
export async function startCareerSeasonCommand(params: {
  playerId: string;
  expectedRevision: number;
  userId: string;
}): Promise<CareerSeasonStartDto> {
  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: params.playerId },
      select: seasonStartPlayerSelect,
    });
    if (!player || player.gameSession.userId !== params.userId) {
      throw new CheckpointCommandError("FORBIDDEN", "Career không thuộc user hiện tại");
    }
    if (player.checkpointVersion < 2 || player.currentAge === null || player.currentStep === null) {
      throw new CheckpointCommandError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }

    const existingSeason = await tx.careerSeason.findFirst({
      where: {
        careerPlayerId: player.id,
        age: player.currentAge,
        status: "in_progress",
      },
      select: { id: true, seasonNumber: true, age: true },
    });
    if (existingSeason) {
      return {
        seasonId: existingSeason.id,
        seasonNumber: existingSeason.seasonNumber,
        age: existingSeason.age,
        revision: player.revision,
        currentStep: player.currentStep,
      };
    }
    if (player.currentStep !== "idle") {
      throw new CheckpointCommandError("INVALID_STEP", "Career chưa sẵn sàng bắt đầu mùa giải");
    }
    if (player.revision !== params.expectedRevision) {
      throw new CheckpointCommandError("STALE_REVISION", "Career đã có thay đổi mới hơn");
    }

    const latestSeason = await tx.careerSeason.aggregate({
      where: { careerPlayerId: player.id },
      _max: { seasonNumber: true },
    });
    const seasonNumber = (latestSeason._max.seasonNumber ?? 0) + 1;
    const lastStint = Array.isArray(player.clubStints)
      ? (player.clubStints.at(-1) as { clubId?: string; clubName?: string; leagueId?: string; leagueName?: string } | undefined)
      : undefined;

    const reserved = await tx.careerPlayer.updateMany({
      where: { id: player.id, revision: params.expectedRevision, currentStep: "idle" },
      data: {
        revision: { increment: 1 },
        currentStep: player.isUnemployed ? "dir_increase" : "standing",
        currentWheel: "career",
      },
    });
    if (reserved.count !== 1) {
      throw new CheckpointCommandError("STALE_REVISION", "Không thể bắt đầu mùa giải đồng thời");
    }

    const season = await tx.careerSeason.create({
      data: {
        careerPlayerId: player.id,
        seasonNumber,
        age: player.currentAge,
        clubId: lastStint?.clubId,
        clubName: lastStint?.clubName,
        leagueId: lastStint?.leagueId,
        leagueName: lastStint?.leagueName,
        status: "in_progress",
        runtimeState: {
          // Keep the competition assigned to this season immutable in the
          // season row. The player projection may later be updated to the
          // ticket for the next season.
          continentalCupType: player.currentContinentalCup,
        },
      },
    });
    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        type: "season_started",
        label: `Bắt đầu mùa giải tuổi ${player.currentAge}`,
        payload: { seasonNumber, revision: params.expectedRevision + 1 },
      },
    });

    return {
      seasonId: season.id,
      seasonNumber,
      age: player.currentAge,
      revision: params.expectedRevision + 1,
      currentStep: player.isUnemployed ? "dir_increase" : "standing",
    };
  });
}

/**
 * Commits one server-resolved wheel result. The resolver is deliberately
 * injected by the server-only caller so a client cannot provide outcome/weight
 * data. Revision reservation happens before resolution, preventing two
 * concurrent requests from resolving the same career revision.
 */
export async function resolveWheelCheckpointCommand(params: {
  input: ResolveWheelCommand;
  userId: string;
  resolve: ServerWheelResolver;
}): Promise<WheelCheckpointDto> {
  const { input, userId, resolve } = params;

  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: input.playerId },
      select: playerCheckpointSelect,
    });
    if (!player || player.gameSession.userId !== userId) {
      throw new CheckpointCommandError("FORBIDDEN", "Career không thuộc user hiện tại");
    }

    const season = await tx.careerSeason.findUnique({
      where: { id: input.seasonId },
      select: seasonCheckpointSelect,
    });
    if (!season || season.careerPlayerId !== player.id) {
      throw new CheckpointCommandError("SEASON_NOT_FOUND", "Mùa giải không tồn tại");
    }

    // Idempotent replay must be checked before current-state guards. A retry
    // can arrive after the season has moved on, but it still must receive the
    // original committed outcome instead of a new error or a second resolve.
    const replay = await tx.wheelCheckpoint.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: player.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (replay) {
      if (replay.seasonId !== season.id || replay.stepKey !== input.stepKey) {
        throw new CheckpointCommandError(
          "CHECKPOINT_EXISTS",
          "Idempotency key đã được dùng cho command khác",
        );
      }
      return toCheckpointDto(replay, player, true);
    }

    if (season.status !== "in_progress") {
      throw new CheckpointCommandError("SEASON_NOT_ACTIVE", "Mùa giải đã đóng");
    }
    if (player.checkpointVersion < 2 || player.currentStep === null) {
      throw new CheckpointCommandError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }
    if (player.currentAge !== season.age) {
      throw new CheckpointCommandError("INVALID_STEP", "Tuổi hiện tại không khớp mùa giải");
    }
    if (player.currentStep !== input.stepKey) {
      throw new CheckpointCommandError("INVALID_STEP", "Wheel không đúng bước hiện tại");
    }

    const completedStep = await tx.wheelCheckpoint.findUnique({
      where: {
        careerPlayerId_seasonId_stepKey_revisionBefore: {
          careerPlayerId: player.id,
          seasonId: season.id,
          stepKey: input.stepKey,
          revisionBefore: input.expectedRevision,
        },
      },
    });
    if (completedStep) {
      throw new CheckpointCommandError("CHECKPOINT_EXISTS", "Wheel này đã có checkpoint");
    }
    if (player.revision !== input.expectedRevision) {
      throw new CheckpointCommandError("STALE_REVISION", "Career đã có thay đổi mới hơn");
    }

    const reserved = await tx.careerPlayer.updateMany({
      where: { id: player.id, revision: input.expectedRevision },
      data: { revision: { increment: 1 } },
    });
    if (reserved.count !== 1) {
      // Another request may have committed the same idempotency key while this
      // transaction was waiting on the revision row lock. Re-read the unique
      // key after the lock is released so concurrent retries receive the
      // committed outcome instead of an avoidable stale error.
      const concurrentCheckpoint = await tx.wheelCheckpoint.findUnique({
        where: {
          careerPlayerId_idempotencyKey: {
            careerPlayerId: player.id,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (concurrentCheckpoint) {
        const latestPlayer = await tx.careerPlayer.findUnique({
          where: { id: player.id },
          select: playerCheckpointSelect,
        });
        if (latestPlayer) return toCheckpointDto(concurrentCheckpoint, latestPlayer, true);
      }
      throw new CheckpointCommandError("STALE_REVISION", "Career đã có thay đổi đồng thời");
    }

    const lastStint = Array.isArray(player.clubStints)
      ? (player.clubStints.at(-1) as { clubId?: string } | undefined)
      : undefined;
    const clubRow = !player.isUnemployed && lastStint?.clubId
      ? await tx.club.findUnique({
          where: { id: lastStint.clubId },
          select: {
            id: true,
            name: true,
            leagueId: true,
            prestige: true,
            continentalType: true,
            league: { select: { name: true, tier: true } },
          },
        })
      : null;
    const leagueSize = clubRow
      ? await tx.club.count({ where: { leagueId: clubRow.leagueId } })
      : 10;

    const resolution = await resolve({
      player,
      season,
      choice: input.choice,
      currentClub: clubRow
        ? {
            id: clubRow.id,
            name: clubRow.name,
            leagueId: clubRow.leagueId,
            leagueName: clubRow.league.name,
            leagueTier: clubRow.league.tier,
            prestige: clubRow.prestige,
            continentalType: clubRow.continentalType,
          }
        : null,
      leagueSize,
    });
    if (!resolution.nextStep || resolution.nextStep.length > 80 || !CAREER_PROJECTION_STEPS.has(resolution.nextStep)) {
      throw new CheckpointCommandError("INVALID_STEP", "Resolver trả về bước tiếp theo không hợp lệ");
    }

    const checkpointInput = input.choice === undefined ? {} : { choice: input.choice };
    const checkpoint = await tx.wheelCheckpoint.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        stepKey: input.stepKey,
        wheelType: input.wheelType,
        resolverVersion: "checkpoint-v2",
        input: checkpointInput as Prisma.InputJsonValue,
        outcome: resolution.outcome as Prisma.InputJsonValue,
        ...(resolution.publicResult !== undefined
          ? { publicResult: resolution.publicResult as Prisma.InputJsonValue }
          : {}),
        revisionBefore: input.expectedRevision,
        revisionAfter: input.expectedRevision + 1,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const nextAge = resolution.nextAge ?? player.currentAge;
    const updated = await tx.careerPlayer.updateMany({
      where: { id: player.id, revision: input.expectedRevision + 1 },
      data: {
        currentAge: nextAge,
        currentStep: resolution.nextStep,
        ...(resolution.nextWheel !== undefined ? { currentWheel: resolution.nextWheel } : {}),
        ...(resolution.statsTimeline !== undefined
          ? { statsTimeline: resolution.statsTimeline as Prisma.InputJsonValue }
          : {}),
        ...(resolution.peakOvr !== undefined ? { peakOvr: resolution.peakOvr } : {}),
        lastCheckpointId: checkpoint.id,
        lastCheckpointAt: checkpoint.createdAt,
      },
    });
    if (updated.count !== 1) {
      throw new CheckpointCommandError("STALE_REVISION", "Không thể commit projection career");
    }

    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        type: "wheel_resolved",
        label: `Wheel ${input.stepKey} đã hoàn tất`,
        payload: {
          checkpointId: checkpoint.id,
          wheelType: input.wheelType,
          revisionBefore: input.expectedRevision,
          revisionAfter: input.expectedRevision + 1,
        },
      },
    });

    if (resolution.seasonRuntimeState !== undefined || resolution.seasonStatus !== undefined) {
      await tx.careerSeason.update({
        where: { id: season.id },
        data: {
          ...(resolution.seasonRuntimeState !== undefined
            ? { runtimeState: resolution.seasonRuntimeState as Prisma.InputJsonValue }
            : {}),
          ...(resolution.seasonStatus !== undefined ? { status: resolution.seasonStatus } : {}),
        },
      });
    }

    return toCheckpointDto(
      checkpoint,
      {
        ...player,
        revision: input.expectedRevision + 1,
        currentAge: nextAge,
        currentStep: resolution.nextStep,
        currentWheel: resolution.nextWheel ?? player.currentWheel,
        ...(resolution.statsTimeline !== undefined ? { statsTimeline: resolution.statsTimeline } : {}),
        ...(resolution.peakOvr !== undefined ? { peakOvr: resolution.peakOvr } : {}),
      },
      false,
    );
  });
}
