import { randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  simulatePlayerSeasonService,
  type SimulatedSeasonResult,
} from "@/features/season/services/season-simulator.service";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getNationalTournamentName } from "@/features/wheel/lib/simulation-helpers";
import { isShopItemActiveForSeason, type ShopInventoryEntry } from "@/lib/shop-catalog";
import { persistAwardSimulation, syncAchievementCache } from "./award-persistence.service";
import type { StatSnapshot } from "@/types/domain";
import type {
  CommitSeasonStatsCommand,
  SeasonStatsCommitDto,
} from "@/features/career/contracts/season-stats.contract";

export type SeasonStatsCommandErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS";

export class SeasonStatsCommandError extends Error {
  constructor(public readonly code: SeasonStatsCommandErrorCode, message: string) {
    super(message);
    this.name = "SeasonStatsCommandError";
  }
}

type PublicSeasonStatsResult = Omit<SeasonStatsCommitDto, "replayed">;

const playerSeasonStatsSelect = {
  id: true,
  name: true,
  revision: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  position: true,
  nationality: true,
  debutAge: true,
  careerLengthYears: true,
  currentContinentalCup: true,
  statsTimeline: true,
  clubStints: true,
  hiddenStats: true,
  shopInventory: true,
  peakOvr: true,
  isUnemployed: true,
  gameSession: { select: { userId: true, formation: true } },
} satisfies Prisma.CareerPlayerSelect;

const seasonStatsSelect = {
  id: true,
  careerPlayerId: true,
  age: true,
  clubId: true,
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

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function currentStats(value: unknown, position: string): Record<string, number> {
  const latest = asRecord(asArray(value).at(-1));
  const keys = position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return Object.fromEntries(keys.map((key) => [key, asNumber(latest[key], 60)]));
}

function currentOvr(value: unknown): number {
  return asNumber(asRecord(asArray(value).at(-1)).ovr, 60);
}

function runtimeForSeason(value: unknown): Record<string, unknown> {
  return asRecord(value);
}

function requiredOutcome(runtime: Record<string, unknown>, key: string): string | number | null {
  const result = runtime[key];
  if (typeof result === "string" || typeof result === "number") return result;
  return null;
}

function seasonTimelineWithStats(
  value: unknown,
  age: number,
  result: SimulatedSeasonResult,
): StatSnapshot[] {
  const timeline = asArray(value) as StatSnapshot[];
  const hasAge = timeline.some((entry) => entry.age === age);
  if (hasAge) {
    return timeline.map((entry) => entry.age === age
      ? {
          ...entry,
          apps: result.apps,
          goals: result.goals,
          assists: result.assists,
          cleanSheets: result.cleanSheets,
          matchRating: result.matchRating,
        }
      : entry);
  }

  // Repair V2 rows created before the per-age projection was appended. Their
  // last snapshot contains the latest attributes but carries an old age.
  const latest = timeline.at(-1);
  if (!latest) return timeline;
  return [...timeline, {
    ...latest,
    age,
    apps: result.apps,
    goals: result.goals,
    assists: result.assists,
    cleanSheets: result.cleanSheets,
    matchRating: result.matchRating,
  }].sort((left, right) => left.age - right.age);
}

function parseReplayResult(value: unknown): SeasonStatsCommitDto {
  const result = value as PublicSeasonStatsResult;
  if (
    !result || typeof result !== "object" ||
    typeof result.commandId !== "string" ||
    typeof result.seasonId !== "string" ||
    typeof result.revision !== "number" ||
    typeof result.nextStep !== "string" ||
    !result.seasonStats || typeof result.seasonStats !== "object"
  ) {
    throw new SeasonStatsCommandError("COMMAND_EXISTS", "Idempotency record không hợp lệ");
  }
  return { ...result, replayed: true };
}

function secureRandom(): number {
  return randomInt(0, 1_000_001) / 1_000_001;
}

/**
 * Runs the existing season simulation with server-owned inputs and random
 * source, then commits the result exactly once to the active season.
 */
export async function commitSeasonStatsCommand(params: {
  input: CommitSeasonStatsCommand;
  userId: string;
}): Promise<SeasonStatsCommitDto> {
  const { input, userId } = params;

  return prisma.$transaction(async (tx) => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: input.playerId },
      select: playerSeasonStatsSelect,
    });
    if (!player || player.gameSession.userId !== userId) {
      throw new SeasonStatsCommandError("FORBIDDEN", "Career không thuộc user hiện tại");
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
      const replayInput = replay.input as { seasonId?: string } | null;
      if (replay.commandType !== "season_stats_commit" || replayInput?.seasonId !== input.seasonId) {
        throw new SeasonStatsCommandError("COMMAND_EXISTS", "Idempotency key đã được dùng cho command khác");
      }
      return parseReplayResult(replay.result);
    }

    if (
      player.checkpointVersion < 2 ||
      player.currentAge === null ||
      player.currentStep === null
    ) {
      throw new SeasonStatsCommandError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }
    if (player.currentStep !== "season_stats") {
      throw new SeasonStatsCommandError(
        "INVALID_TRANSITION",
        "Chưa đến bước chốt thống kê mùa giải",
      );
    }
    if (player.revision !== input.expectedRevision) {
      throw new SeasonStatsCommandError("STALE_REVISION", "Career đã có thay đổi mới hơn");
    }

    const season = await tx.careerSeason.findUnique({
      where: { id: input.seasonId },
      select: seasonStatsSelect,
    });
    if (
      !season ||
      season.careerPlayerId !== player.id ||
      season.age !== player.currentAge
    ) {
      throw new SeasonStatsCommandError("SEASON_NOT_FOUND", "Mùa giải hiện tại không tồn tại");
    }
    if (season.status !== "in_progress") {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Mùa giải đã được chốt");
    }

    const runtime = runtimeForSeason(season.runtimeState);
    const standing = requiredOutcome(runtime, "standingResult");
    const domesticCup = asString(runtime.domesticCupResult);
    const continentalCup = asString(runtime.continentalCupResult);
    const callup = asString(runtime.nationalCallupResult);
    const tournament = asString(runtime.nationalTournamentResult);
    const seasonContinentalCup = asString(runtime.continentalCupType) ?? player.currentContinentalCup;
    const hasContinentalCup = seasonContinentalCup !== "none";
    const hasNationalWheel = season.age % 2 === 0;

    if (typeof standing !== "number" || typeof domesticCup !== "string") {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Thiếu kết quả wheel thi đấu");
    }
    if (hasContinentalCup && typeof continentalCup !== "string") {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Thiếu kết quả cúp châu lục");
    }
    if (hasNationalWheel && typeof callup !== "string") {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Thiếu kết quả wheel ĐTQG");
    }
    if (callup === "called_up" && typeof tournament !== "string") {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Thiếu kết quả giải đấu ĐTQG");
    }

    const lastStint = asRecord(asArray(player.clubStints).at(-1));
    const clubId = season.clubId ?? asString(lastStint.clubId);
    const clubRow = !player.isUnemployed && clubId
      ? await tx.club.findUnique({
          where: { id: clubId },
          select: {
            id: true,
            name: true,
            leagueId: true,
            prestige: true,
            league: { select: { name: true, tier: true } },
          },
        })
      : null;
    if (!clubRow) {
      throw new SeasonStatsCommandError("INVALID_TRANSITION", "Không xác định được CLB mùa giải");
    }
    const leagueClubs = await tx.club.findMany({
      where: { leagueId: clubRow.leagueId },
      select: { id: true, name: true, prestige: true },
      orderBy: { name: "asc" },
    });
    const inventory = Array.isArray(player.shopInventory)
      ? player.shopInventory as unknown as ShopInventoryEntry[]
      : [];
    const simulated = simulatePlayerSeasonService({
      seasonId: season.id,
      playerId: player.id,
      playerName: player.name,
      formation: player.gameSession.formation,
      age: season.age,
      ovr: currentOvr(player.statsTimeline),
      position: player.position,
      luckRating: Math.max(1, Math.min(20, Math.round(asNumber(asRecord(player.hiddenStats).luckRating, 10)))),
      professionalism: Math.max(1, Math.min(20, Math.round(asNumber(asRecord(player.hiddenStats).professionalism, 10)))),
      clubPrestige: clubRow.prestige,
      clubName: clubRow.name,
      leagueName: clubRow.league.name,
      leagueTier: clubRow.league.tier,
      leagueClubsCount: leagueClubs.length,
      leagueClubs,
      hasContinentalCup,
      playerNationality: player.nationality,
      currentStats: currentStats(player.statsTimeline, player.position),
      standingResult: standing,
      domesticCupResult: domesticCup,
      continentalCupResult: continentalCup,
      continentalCupType: hasContinentalCup ? seasonContinentalCup : null,
      nationalCallupResult: callup,
      nationalTournamentResult: tournament,
      nationalTournamentType: callup === "called_up"
        ? getNationalTournamentName(player.nationality, season.age, player.debutAge, getNationalContinentalCup)
        : null,
      trainingCampActive: isShopItemActiveForSeason(inventory, "training_camp", season.age),
      appearancePackActive: isShopItemActiveForSeason(inventory, "appearance_pack", season.age),
      randomSource: secureRandom,
    });
    await persistAwardSimulation({
      tx,
      playerId: player.id,
      seasonId: season.id,
      age: season.age,
      club: { id: clubRow.id, name: clubRow.name, leagueId: clubRow.leagueId },
      simulation: simulated.awardSimulation,
    });
    const achievementCache = await syncAchievementCache(tx, player.id);
    const nextStep = simulated.ballonDor.eligible
      ? "ballon_dor_nomination"
      : "dir_increase";
    const nextRevision = input.expectedRevision + 1;
    const nextRuntime = {
      ...runtime,
      yearSimResult: simulated,
      ballonDorNominationWeight: simulated.ballonDor.nominationWeight,
      ballonDorRankWeights: simulated.ballonDor.rankWeights,
      awardSimulationVersion: simulated.awardSimulation.modelVersion,
      lastWheel: { stepKey: "season_stats", result: "committed" },
    };
    const nextTimeline = seasonTimelineWithStats(player.statsTimeline, season.age, simulated);

    const reserved = await tx.careerPlayer.updateMany({
      where: {
        id: player.id,
        revision: input.expectedRevision,
        currentStep: "season_stats",
      },
      data: {
        revision: { increment: 1 },
        currentStep: nextStep,
        currentWheel: "career",
        statsTimeline: nextTimeline as unknown as Prisma.InputJsonValue,
        achievements: achievementCache as unknown as Prisma.InputJsonValue,
      },
    });
    if (reserved.count !== 1) {
      throw new SeasonStatsCommandError("STALE_REVISION", "Không thể commit thống kê đồng thời");
    }

    await tx.careerSeason.update({
      where: { id: season.id },
      data: { runtimeState: nextRuntime as unknown as Prisma.InputJsonValue },
    });

    const commandId = randomUUID();
    const result: PublicSeasonStatsResult = {
      commandId,
      seasonId: season.id,
      revision: nextRevision,
      nextStep,
      seasonStats: simulated,
    };
    await tx.careerCommand.create({
      data: {
        id: commandId,
        careerPlayerId: player.id,
        seasonId: season.id,
        commandType: "season_stats_commit",
        idempotencyKey: input.idempotencyKey,
        input: { seasonId: season.id } as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        revisionBefore: input.expectedRevision,
        revisionAfter: nextRevision,
      },
    });
    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        type: "season_stats_committed",
        label: `Đã chốt thống kê mùa tuổi ${season.age}`,
        payload: {
          commandId,
          revisionBefore: input.expectedRevision,
          revisionAfter: nextRevision,
          nextStep,
        },
      },
    });

    return { ...result, replayed: false };
  });
}
