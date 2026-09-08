import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdvanceCareerSeasonCommand,
  CareerSeasonAdvanceDto,
} from "@/features/career/contracts/season-transition.contract";
import { calculateContinentalQualification } from "@/features/wheel/lib/simulation-helpers";
import {
  appendMissingSeasonIncomeEntries,
  type WalletLedgerEntry,
} from "@/lib/wallet";

export type SeasonTransitionErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS";

export class SeasonTransitionError extends Error {
  constructor(
    public readonly code: SeasonTransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SeasonTransitionError";
  }
}

type PublicResult = Omit<CareerSeasonAdvanceDto, "replayed">;

const playerSeasonTransitionSelect = {
  id: true,
  revision: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  retireAge: true,
  isRetired: true,
  currentContinentalCup: true,
  peakOvr: true,
  currentWageAnnual: true,
  contractYearsRemaining: true,
  walletBalance: true,
  walletLedger: true,
  statsTimeline: true,
  clubStints: true,
  seasonHistory: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

const seasonTransitionSelect = {
  id: true,
  careerPlayerId: true,
  seasonNumber: true,
  age: true,
  clubId: true,
  clubName: true,
  leagueId: true,
  leagueName: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readSeasonRecord(history: unknown, age: number): unknown {
  return asRecord(history)[String(age)] ?? null;
}

function readLatestTimelineEntry(timeline: unknown, age: number): unknown {
  const entry = asArray(timeline).findLast((item) => {
    const record = asRecord(item);
    return record.age === age;
  });
  return entry ?? null;
}

const SEASON_SNAPSHOT_KEYS = new Set([
  "apps",
  "goals",
  "assists",
  "cleanSheets",
  "matchRating",
]);

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The stat timeline is the server projection used by subsequent wheel
 * resolutions. A season-stats commit enriches the current snapshot, then the
 * season transition must carry the resulting player attributes into the next
 * age. Without this append, every later server wheel keeps reading the debut
 * snapshot and the timeline is permanently stuck at one age.
 */
function advanceStatsTimeline(value: unknown, completedAge: number, nextAge: number | null): unknown[] {
  const timeline = asArray(value)
    .map(asRecord)
    .filter((entry) => finiteNumber(entry.age) !== null);
  if (timeline.length === 0) return timeline;

  const completed = timeline.findLast((entry) => entry.age === completedAge) ?? timeline.at(-1);
  if (!completed) return timeline;
  const hasCompletedAge = timeline.some((entry) => entry.age === completedAge);
  const completedTimeline = hasCompletedAge
    ? timeline
    : [...timeline, { ...completed, age: completedAge }];
  if (nextAge === null) return completedTimeline;

  const nextSnapshot = Object.fromEntries(
    Object.entries(completed).filter(([key]) => key !== "age" && !SEASON_SNAPSHOT_KEYS.has(key)),
  );
  nextSnapshot.age = nextAge;

  return [
    ...completedTimeline.filter((entry) => entry.age !== nextAge),
    nextSnapshot,
  ].sort((left, right) => (finiteNumber(left.age) ?? 0) - (finiteNumber(right.age) ?? 0));
}

/**
 * Keep the active stint aligned with the season just closed. Transfer creates
 * the destination stint one age ahead, so it must remain in the array while
 * the current stint is extended. The terminal branch intentionally drops an
 * unplayed future destination.
 */
function advanceClubStints(value: unknown, completedAge: number, isRetired: boolean): unknown[] {
  const stints = asArray(value).map(asRecord);
  const activeIndex = stints.findLastIndex((stint) => {
    const startAge = finiteNumber(stint.startAge);
    return startAge !== null && startAge <= completedAge;
  });
  if (activeIndex < 0) return stints;

  const updated = isRetired ? stints.slice(0, activeIndex + 1) : [...stints];
  const active = { ...updated[activeIndex] };
  const startAge = finiteNumber(active.startAge) ?? completedAge;
  const endAge = Math.max(startAge, completedAge);
  active.endAge = endAge;
  active.yearsAtClub = endAge - startAge + 1;
  updated[activeIndex] = active;
  return updated;
}

function currentTimelineOvr(value: unknown, fallback: number): number {
  const latest = asRecord(asArray(value).at(-1));
  return finiteNumber(latest.ovr) ?? fallback;
}

function careerTotals(history: unknown): { apps: number; goals: number; assists: number } {
  return Object.values(asRecord(history)).reduce<{ apps: number; goals: number; assists: number }>(
    (totals, value) => {
      const record = asRecord(value);
      return {
        apps: totals.apps + (finiteNumber(record.apps) ?? 0),
        goals: totals.goals + (finiteNumber(record.goals) ?? 0),
        assists: totals.assists + (finiteNumber(record.assists) ?? 0),
      };
    },
    { apps: 0, goals: 0, assists: 0 },
  );
}

function nextContinentalCup(params: {
  currentContinentalCup: string;
  clubStints: unknown;
  seasonClubId: string | null;
  seasonLeagueId: string | null;
  runtimeState: unknown;
}): string {
  const runtime = asRecord(params.runtimeState);
  const transferResolution = asRecord(runtime.transferResolution);
  const lastStint = asRecord(asArray(params.clubStints).at(-1));
  const movedToAnotherClub = transferResolution.kind === "transfer" ||
    transferResolution.kind === "free_agent" ||
    (typeof params.seasonClubId === "string" &&
      typeof lastStint.clubId === "string" &&
      lastStint.clubId !== params.seasonClubId);

  // A ticket belongs to the club, not the player. A transfer command has
  // already assigned the destination club's ticket, so never re-qualify that
  // ticket using the previous club's league position.
  if (movedToAnotherClub) return params.currentContinentalCup;

  const standing = runtime.standingResult;
  if (typeof standing !== "number") return params.currentContinentalCup;
  return calculateContinentalQualification(
    params.seasonLeagueId ?? "",
    standing,
    typeof runtime.continentalCupResult === "string" ? runtime.continentalCupResult : null,
    params.currentContinentalCup,
  );
}

function completedSeasonRecord(
  history: unknown,
  runtimeState: unknown,
  season: {
    age: number;
    clubName: string | null;
    leagueId: string | null;
    leagueName: string | null;
  },
  currentContinentalCup: string,
  seasonOvr: number,
): Record<string, unknown> {
  const existing = asRecord(readSeasonRecord(history, season.age));
  const runtime = asRecord(runtimeState);
  const simulated = asRecord(runtime.yearSimResult);
  const nationalTeam = asRecord(existing.nationalTeam);
  const hasNationalTeam = Object.keys(nationalTeam).length > 0 || season.age % 2 === 0;
  const record: Record<string, unknown> = {
    ...existing,
    age: season.age,
    clubName: season.clubName ?? existing.clubName ?? "Không CLB",
    leagueName: season.leagueName ?? existing.leagueName ?? "Thất nghiệp",
    ...(season.leagueId ? { leagueId: season.leagueId } : {}),
    ovr: seasonOvr,
    standing: typeof runtime.standingResult === "number"
      ? runtime.standingResult
      : existing.standing ?? null,
    domesticCup: typeof runtime.domesticCupResult === "string"
      ? runtime.domesticCupResult
      : existing.domesticCup ?? null,
  };

  if (typeof simulated.apps === "number") record.apps = simulated.apps;
  if (typeof simulated.goals === "number") record.goals = simulated.goals;
  if (typeof simulated.assists === "number") record.assists = simulated.assists;
  if (typeof simulated.cleanSheets === "number") record.cleanSheets = simulated.cleanSheets;
  if (typeof simulated.matchRating === "number") record.matchRating = simulated.matchRating;
  if (simulated.leagueStats) record.leagueStats = simulated.leagueStats;
  if (simulated.domesticCupStats) record.domesticCupStats = simulated.domesticCupStats;
  if (simulated.continentalStats) record.continentalStats = simulated.continentalStats;
  if (simulated.nationalStats) record.nationalStats = simulated.nationalStats;

  const runtimeContinentalCup = typeof runtime.continentalCupType === "string"
    ? runtime.continentalCupType
    : currentContinentalCup;
  if (runtimeContinentalCup !== "none" || existing.continentalCup !== undefined) {
    const continentalCup = asRecord(existing.continentalCup);
    record.continentalCup = {
      ...continentalCup,
      type: typeof continentalCup.type === "string" ? continentalCup.type : runtimeContinentalCup,
      ...(typeof runtime.continentalCupResult === "string"
        ? { result: runtime.continentalCupResult }
        : {}),
    };
  }
  if (hasNationalTeam) {
    record.nationalTeam = {
      ...nationalTeam,
      ...(typeof runtime.nationalCallupResult === "string"
        ? { callup: runtime.nationalCallupResult }
        : {}),
      ...(typeof runtime.nationalTournamentResult === "string"
        ? { result: runtime.nationalTournamentResult }
        : {}),
    };
  }
  if (typeof runtime.ballonDorRank === "number") {
    record.ballonDorResult = runtime.ballonDorRank;
  }
  return record;
}

function parseReplayResult(value: unknown): CareerSeasonAdvanceDto {
  const result = value as PublicResult;
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.commandId !== "string" ||
    typeof result.completedSeasonId !== "string" ||
    typeof result.completedAge !== "number" ||
    typeof result.revision !== "number" ||
    (typeof result.nextAge !== "number" && result.nextAge !== null) ||
    typeof result.nextStep !== "string" ||
    typeof result.isRetired !== "boolean" ||
    (result.shopDecision !== "completed" && result.shopDecision !== "skipped")
  ) {
    throw new SeasonTransitionError(
      "COMMAND_EXISTS",
      "Idempotency record không hợp lệ",
    );
  }
  return { ...result, replayed: true };
}

/**
 * Closes exactly one active season and advances the projection. The command
 * intentionally accepts a shop acknowledgement instead of trusting a route
 * transition, so a future client cannot accidentally skip the off-season gate.
 */
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
