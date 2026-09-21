import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { persistTeamTrophies, seasonHonoursToProjection, syncAchievementCache } from "./award-persistence.service";
import type { AdvanceCareerSeasonCommand, CareerSeasonAdvanceDto } from "@/features/career/contracts/season-transition.contract";
import { appendMissingSeasonIncomeEntries, type WalletLedgerEntry } from "@/lib/wallet";
import { SeasonTransitionError, parseReplayResult, playerSeasonTransitionSelect, type PublicResult } from "./season-transition-helpers";
import { seasonTransitionSelect, asRecord, asArray, readLatestTimelineEntry, advanceStatsTimeline, advanceClubStints, currentTimelineOvr, careerTotals, nextContinentalCup, completedSeasonRecord } from "./season-transition-helpers";

export async function advanceCareerSeasonCommand(params: {
  input: AdvanceCareerSeasonCommand;
  userId: string;
}): Promise<CareerSeasonAdvanceDto> {
  const { input, userId } = params;

  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: input.playerId },
      select: playerSeasonTransitionSelect,
    });
    if (!player || player.gameSession.userId !== userId) {
      throw new SeasonTransitionError(
        "FORBIDDEN",
        "Career không thuộc user hiện tại",
      );
    }

    const replay = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: player.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { commandType: true, input: true, result: true },
    });
    if (replay) {
      const replayInput = replay.input as {
        seasonId?: string;
        shopDecision?: string;
      } | null;
      if (
        replay.commandType !== "season_advance" ||
        replayInput?.seasonId !== input.seasonId ||
        replayInput.shopDecision !== input.shopDecision
      ) {
        throw new SeasonTransitionError(
          "COMMAND_EXISTS",
          "Idempotency key đã được dùng cho command khác",
        );
      }
      return parseReplayResult(replay.result);
    }

    if (
      player.checkpointVersion < 2 ||
      player.currentAge === null ||
      player.currentStep === null
    ) {
      throw new SeasonTransitionError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }
    const completedAge = player.currentAge;
    const isRetired = completedAge >= player.retireAge;
    // A pre-fix final-season career may already be persisted at `transfer`:
    // the old resolver opened a market even though the final season has no
    // next season. Accept that one terminal compatibility state as an implicit
    // transfer skip, while keeping the normal-season gate strict.
    const canCloseSeason = player.currentStep === "resolved" ||
      (isRetired && player.currentStep === "transfer");
    if (!canCloseSeason) {
      throw new SeasonTransitionError(
        "INVALID_TRANSITION",
        "Career chưa hoàn tất transfer và chưa mở bước chốt mùa",
      );
    }
    if (player.revision !== input.expectedRevision) {
      throw new SeasonTransitionError(
        "STALE_REVISION",
        "Career đã có thay đổi mới hơn",
      );
    }

    const season = await tx.careerSeason.findUnique({
      where: { id: input.seasonId },
      select: seasonTransitionSelect,
    });
    if (
      !season ||
      season.careerPlayerId !== player.id ||
      season.age !== player.currentAge
    ) {
      throw new SeasonTransitionError(
        "SEASON_NOT_FOUND",
        "Mùa giải hiện tại không tồn tại",
      );
    }
    if (season.status !== "in_progress") {
      throw new SeasonTransitionError(
        "INVALID_TRANSITION",
        "Mùa giải này đã được chốt",
      );
    }

    const checkpointCount = await tx.wheelCheckpoint.count({
      where: { careerPlayerId: player.id, seasonId: season.id },
    });
    if (checkpointCount === 0) {
      throw new SeasonTransitionError(
        "INVALID_TRANSITION",
        "Không thể chốt mùa khi chưa có wheel checkpoint",
      );
    }

    const nextAge = isRetired ? null : completedAge + 1;
    const nextStep = isRetired ? "retired" : "idle";
    const nextWheel = isRetired ? null : "career";
    const nextRevision = input.expectedRevision + 1;
    const completedAt = new Date();
    const seasonRecord = completedSeasonRecord(
      player.seasonHistory,
      season.runtimeState,
      season,
      player.currentContinentalCup,
      currentTimelineOvr(player.statsTimeline, player.peakOvr),
    );
    const runtime = asRecord(season.runtimeState);
    const simulated = asRecord(runtime.yearSimResult);
    const continentalRecord = typeof runtime.continentalCupType === "string" && runtime.continentalCupType !== "none"
      ? { type: runtime.continentalCupType, result: typeof runtime.continentalCupResult === "string" ? runtime.continentalCupResult : null }
      : null;
    const nationalRecord = season.age % 2 === 0
      ? { type: typeof runtime.nationalTournamentType === "string" ? runtime.nationalTournamentType : null, result: typeof runtime.nationalTournamentResult === "string" ? runtime.nationalTournamentResult : null }
      : null;
    await persistTeamTrophies({
      tx,
      playerId: player.id,
      seasonId: season.id,
      age: season.age,
      club: { id: season.clubId, name: season.clubName, leagueId: season.leagueId, leagueName: season.leagueName },
      standing: typeof runtime.standingResult === "number" ? runtime.standingResult : null,
      domesticCup: typeof runtime.domesticCupResult === "string" ? runtime.domesticCupResult : null,
      continentalCup: continentalRecord,
      nationalTeam: nationalRecord,
    });
    const seasonHonours = await tx.careerHonour.findMany({
      where: { careerPlayerId: player.id, seasonId: season.id },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
      select: { awardKey: true, label: true, rank: true, slotKey: true, result: true, metrics: true },
    });
    const achievementCache = await syncAchievementCache(tx, player.id);
    (seasonRecord as Record<string, unknown>).honours = seasonHonoursToProjection(seasonHonours);
    (seasonRecord as Record<string, unknown>).awardModelVersion = typeof simulated.awardSimulation === "object"
      ? asRecord(simulated.awardSimulation).modelVersion
      : null;
    const nextCup = nextContinentalCup({
      currentContinentalCup: player.currentContinentalCup,
      clubStints: player.clubStints,
      seasonClubId: season.clubId,
      seasonLeagueId: season.leagueId,
      runtimeState: season.runtimeState,
    });
    const lastStint = asRecord(asArray(player.clubStints).at(-1));
    const wallet = appendMissingSeasonIncomeEntries({
      age: nextAge ?? completedAge,
      currentWageAnnual: player.currentWageAnnual,
      transferFeeThisSeason: lastStint.startAge === nextAge && typeof lastStint.feePaid === "number"
        ? lastStint.feePaid
        : 0,
      ledger: Array.isArray(player.walletLedger)
        ? player.walletLedger as unknown as WalletLedgerEntry[]
        : [],
    });
    const nextContractYearsRemaining = Math.max(0, player.contractYearsRemaining - 1);
    const nextSeasonHistory = {
      ...asRecord(player.seasonHistory),
      [String(completedAge)]: seasonRecord,
    };
    const nextStatsTimeline = advanceStatsTimeline(player.statsTimeline, completedAge, nextAge);
    const nextClubStints = advanceClubStints(player.clubStints, completedAge, isRetired);
    const nextPeakOvr = Math.max(
      player.peakOvr,
      currentTimelineOvr(nextStatsTimeline, player.peakOvr),
    );
    const summary = {
      seasonNumber: season.seasonNumber,
      age: completedAge,
      club: {
        id: season.clubId,
        name: season.clubName,
        leagueId: season.leagueId,
        leagueName: season.leagueName,
      },
      seasonRecord,
      latestTimeline: readLatestTimelineEntry(nextStatsTimeline, completedAge),
      runtimeState: season.runtimeState,
      shopDecision: input.shopDecision,
      checkpointCount,
      nextContinentalCup: nextCup,
      contractYearsRemaining: nextContractYearsRemaining,
      creditedIncome: wallet.creditedIncome,
      completedAt: completedAt.toISOString(),
    };

    const reserved = await tx.careerPlayer.updateMany({
      where: {
        id: player.id,
        revision: input.expectedRevision,
        currentAge: completedAge,
        ...(isRetired
          ? { currentStep: { in: ["resolved", "transfer"] } }
          : { currentStep: "resolved" }),
      },
      data: {
        revision: { increment: 1 },
        currentAge: nextAge,
        currentStep: nextStep,
        currentWheel: nextWheel,
        isRetired,
        currentContinentalCup: nextCup,
        peakOvr: nextPeakOvr,
        contractYearsRemaining: nextContractYearsRemaining,
        walletBalance: { increment: wallet.creditedIncome },
        walletLedger: wallet.ledger as unknown as Prisma.InputJsonValue,
        seasonHistory: nextSeasonHistory as Prisma.InputJsonValue,
        statsTimeline: nextStatsTimeline as Prisma.InputJsonValue,
        clubStints: nextClubStints as Prisma.InputJsonValue,
        achievements: achievementCache as unknown as Prisma.InputJsonValue,
      },
    });
    if (reserved.count !== 1) {
      throw new SeasonTransitionError(
        "STALE_REVISION",
        "Không thể chốt mùa đồng thời",
      );
    }

    await tx.careerSeason.update({
      where: { id: season.id },
      data: {
        status: isRetired ? "retired" : "completed",
        summary: summary as unknown as Prisma.InputJsonValue,
        completedAt,
      },
    });

    const commandId = randomUUID();
    const result: PublicResult = {
      commandId,
      completedSeasonId: season.id,
      completedAge,
      revision: nextRevision,
      nextAge,
      nextStep,
      isRetired,
      shopDecision: input.shopDecision,
      currentContinentalCup: nextCup,
      contractYearsRemaining: nextContractYearsRemaining,
      walletBalance: player.walletBalance + wallet.creditedIncome,
      ...(isRetired
        ? {
            peakOvr: nextPeakOvr,
            careerTotalStats: careerTotals(nextSeasonHistory),
            statsTimeline: nextStatsTimeline,
            clubStints: nextClubStints,
          }
        : {}),
    };
    await tx.careerCommand.create({
      data: {
        id: commandId,
        careerPlayerId: player.id,
        seasonId: season.id,
        commandType: "season_advance",
        idempotencyKey: input.idempotencyKey,
        input: {
          seasonId: input.seasonId,
          shopDecision: input.shopDecision,
        } as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        revisionBefore: input.expectedRevision,
        revisionAfter: nextRevision,
      },
    });

    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        type: isRetired ? "career_retired" : "season_completed",
        label: isRetired
          ? `Khép lại sự nghiệp ở tuổi ${completedAge}`
          : `Hoàn tất mùa giải tuổi ${completedAge}`,
        payload: {
          commandId,
          shopDecision: input.shopDecision,
          revisionBefore: input.expectedRevision,
          revisionAfter: nextRevision,
          nextAge,
          nextStep,
        },
      },
    });

    return { ...result, replayed: false };
  });
}
