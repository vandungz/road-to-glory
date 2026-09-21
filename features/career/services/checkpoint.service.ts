import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { finalizeBallonDorRanking, syncAchievementCache } from "./award-persistence.service";
import type { ResolveWheelCommand, WheelCheckpointDto } from "@/features/career/contracts/checkpoint.contract";
import { CheckpointCommandError, playerCheckpointSelect, seasonCheckpointSelect, seasonStartPlayerSelect, toCheckpointDto, readSeasonContinentalCup, CAREER_PROJECTION_STEPS, type CareerSeasonStartDto, type ServerWheelResolver } from "./checkpoint-helpers";
export * from "./checkpoint-helpers";

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
      select: { id: true, seasonNumber: true, age: true, runtimeState: true },
    });
    if (existingSeason) {
      const existingRuntime = existingSeason.runtimeState !== null &&
        typeof existingSeason.runtimeState === "object" &&
        !Array.isArray(existingSeason.runtimeState)
        ? existingSeason.runtimeState as Record<string, unknown>
        : {};
      const seasonContinentalCup = readSeasonContinentalCup(existingRuntime) ?? player.currentContinentalCup;
      // Rows created before the immutable season ticket was introduced may not
      // contain it. Repair that row once, then every client receives the same
      // source of truth instead of falling back to a stale UI projection.
      if (readSeasonContinentalCup(existingRuntime) === null) {
        await tx.careerSeason.update({
          where: { id: existingSeason.id },
          data: {
            runtimeState: {
              ...existingRuntime,
              continentalCupType: seasonContinentalCup,
            } as Prisma.InputJsonValue,
          },
        });
      }
      return {
        seasonId: existingSeason.id,
        seasonNumber: existingSeason.seasonNumber,
        age: existingSeason.age,
        revision: player.revision,
        currentStep: player.currentStep,
        seasonContinentalCup,
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
      seasonContinentalCup: player.currentContinentalCup,
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
      return toCheckpointDto(replay, player, season.runtimeState, true);
    }

    if (season.status !== "in_progress") {
      throw new CheckpointCommandError("SEASON_NOT_ACTIVE", "Mùa giải đã đóng");
    }

    const existingRuntime = season.runtimeState !== null &&
      typeof season.runtimeState === "object" &&
      !Array.isArray(season.runtimeState)
      ? season.runtimeState as Record<string, unknown>
      : {};
    const seasonRuntimeTicket = readSeasonContinentalCup(existingRuntime);
    const authoritativeSeasonRuntimeState = seasonRuntimeTicket !== null
      ? season.runtimeState
      : {
          ...existingRuntime,
          // Backfill legacy in-progress rows before resolving their next
          // wheel, so resolver and client receive the same season ticket.
          continentalCupType: player.currentContinentalCup,
        };
    if (seasonRuntimeTicket === null) {
      await tx.careerSeason.update({
        where: { id: season.id },
        data: { runtimeState: authoritativeSeasonRuntimeState as Prisma.InputJsonValue },
      });
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
        if (latestPlayer) return toCheckpointDto(concurrentCheckpoint, latestPlayer, season.runtimeState, true);
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
      season: { ...season, runtimeState: authoritativeSeasonRuntimeState },
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

    let achievementCache: Awaited<ReturnType<typeof syncAchievementCache>> | null = null;
    if (input.stepKey === "ballon_dor_ranking" && typeof resolution.outcome === "number") {
      await finalizeBallonDorRanking({
        tx,
        playerId: player.id,
        seasonId: season.id,
        age: season.age,
        rank: resolution.outcome,
        player: { name: player.name ?? "Career Player", position: player.position },
        club: clubRow ? { id: clubRow.id, name: clubRow.name, leagueId: clubRow.leagueId } : {},
      });
      achievementCache = await syncAchievementCache(tx, player.id);
    }

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
        ...(achievementCache ? { achievements: achievementCache as unknown as Prisma.InputJsonValue } : {}),
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
      resolution.seasonRuntimeState ?? authoritativeSeasonRuntimeState,
      false,
    );
  });
}
