import { prisma } from "@/lib/prisma";
import type { CareerProgressDto } from "@/features/career/contracts/career-progress.contract";
import { normalizeClubStints } from "@/features/career/services/career-summary.service";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function publicCurrentStats(value: unknown): Record<string, number> {
  const latest = asRecord(asArray(value).at(-1));
  return Object.fromEntries(
    Object.entries(latest).filter(
      ([, entry]) => typeof entry === "number" && Number.isFinite(entry),
    ),
  ) as Record<string, number>;
}

function publicInventory(value: unknown): unknown[] {
  return asArray(value).map((entry) => {
    const item = asRecord(entry);
    return {
      itemId: typeof item.itemId === "string" ? item.itemId : "",
      purchasedAtAge: typeof item.purchasedAtAge === "number" ? item.purchasedAtAge : 0,
      appliedSeason: typeof item.appliedSeason === "number" ? item.appliedSeason : 0,
      consumed: item.consumed === true,
    };
  });
}

function publicCurrentClub(value: unknown, isUnemployed: boolean) {
  if (isUnemployed) return null;
  const stint = asRecord(asArray(value).at(-1));
  if (typeof stint.clubId !== "string" || typeof stint.clubName !== "string") return null;
  return {
    id: stint.clubId,
    name: stint.clubName,
    leagueId: typeof stint.leagueId === "string" ? stint.leagueId : "",
    leagueName: typeof stint.leagueName === "string" ? stint.leagueName : "",
  };
}

const PUBLIC_RUNTIME_KEYS = [
  "yearSimResult", "standingResult", "domesticCupResult", "continentalCupResult",
  "nationalCallupResult", "nationalTournamentResult", "selectedStatsList", "selectorIndex",
  "yearEvolutionDirection", "ballonDorNominationWeight", "ballonDorRankWeights",
  "ballonDorRank", "evolvedStatsThisYear", "evolutionCount", "lastWheel",
] as const;

function publicRuntimeState(value: unknown): Record<string, unknown> {
  const runtime = asRecord(value);
  return Object.fromEntries(
    PUBLIC_RUNTIME_KEYS
      .filter((key) => runtime[key] !== undefined)
      .map((key) => [key, runtime[key]]),
  );
}

type SeasonRow = {
  id: string;
  seasonNumber: number;
  age: number;
  status: string;
  clubId: string | null;
  clubName: string | null;
  leagueId: string | null;
  leagueName: string | null;
  startedAt: Date;
  completedAt: Date | null;
  _count: { wheelCheckpoints: number };
  runtimeState?: unknown;
  wheelCheckpoints?: Array<{
    stepKey: string;
    outcome: unknown;
    publicResult: unknown;
    revisionAfter: number;
    createdAt: Date;
  }>;
};

function toSeasonDto(season: SeasonRow): CareerProgressDto["seasons"][number] {
  return {
    seasonId: season.id,
    seasonNumber: season.seasonNumber,
    age: season.age,
    status: season.status,
    clubId: season.clubId,
    clubName: season.clubName,
    leagueId: season.leagueId,
    leagueName: season.leagueName,
    startedAt: season.startedAt.toISOString(),
    completedAt: season.completedAt?.toISOString() ?? null,
    checkpointCount: season._count.wheelCheckpoints,
    checkpoints: (season.wheelCheckpoints ?? []).map((checkpoint) => ({
      stepKey: checkpoint.stepKey,
      outcome: checkpoint.outcome,
      publicResult: checkpoint.publicResult,
      revision: checkpoint.revisionAfter,
      createdAt: checkpoint.createdAt.toISOString(),
    })),
    runtimeState: publicRuntimeState(season.runtimeState),
  };
}

/** Public, bounded read model for resume/query consumers. */
export async function getCareerProgressQuery(params: {
  playerId: string;
  userId: string;
}): Promise<CareerProgressDto> {
  const player = await prisma.careerPlayer.findUnique({
    where: { id: params.playerId },
    select: {
      id: true,
      name: true,
      nationality: true,
      position: true,
      debutAge: true,
      careerLengthYears: true,
      statsTimeline: true,
      clubStints: true,
      seasonHistory: true,
      currentAge: true,
      currentStep: true,
      currentWheel: true,
      checkpointVersion: true,
      revision: true,
      isRetired: true,
      isUnemployed: true,
      currentContinentalCup: true,
      walletBalance: true,
      shopInventory: true,
      gameSession: { select: { userId: true } },
    },
  });

  if (!player || player.gameSession.userId !== params.userId) {
    throw new Error("Forbidden");
  }

  const seasons = await prisma.careerSeason.findMany({
    where: { careerPlayerId: player.id },
    orderBy: [{ age: "asc" }, { seasonNumber: "asc" }],
    select: {
      id: true,
      seasonNumber: true,
      age: true,
      status: true,
      clubId: true,
      clubName: true,
      leagueId: true,
      leagueName: true,
      startedAt: true,
      completedAt: true,
      runtimeState: true,
      _count: { select: { wheelCheckpoints: true } },
    },
  });

  const currentSeason = seasons.find((season) => season.status === "in_progress") ?? null;
  const normalizedClubStints = normalizeClubStints(
    (Array.isArray(player.clubStints) ? player.clubStints : []) as unknown as import("@/types/domain").ClubStint[],
    player.seasonHistory,
  );
  const currentSeasonCheckpoints = currentSeason
    ? await prisma.wheelCheckpoint.findMany({
        where: { careerPlayerId: player.id, seasonId: currentSeason.id },
        orderBy: [{ revisionAfter: "asc" }, { createdAt: "asc" }],
        select: {
          stepKey: true,
          outcome: true,
          publicResult: true,
          revisionAfter: true,
          createdAt: true,
        },
      })
    : [];
  const latestCheckpoint = currentSeason
    ? await prisma.wheelCheckpoint.findFirst({
        where: { careerPlayerId: player.id, seasonId: currentSeason.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stepKey: true,
          revisionAfter: true,
          outcome: true,
          publicResult: true,
          createdAt: true,
        },
      })
    : null;

  return {
    player: {
      id: player.id,
      name: player.name,
      nationality: player.nationality,
      position: player.position,
      debutAge: player.debutAge,
      careerLengthYears: player.careerLengthYears,
      currentAge: player.currentAge,
      currentStep: player.currentStep,
      currentWheel: player.currentWheel,
      checkpointVersion: player.checkpointVersion,
      revision: player.revision,
      isRetired: player.isRetired,
      isUnemployed: player.isUnemployed,
      currentContinentalCup: player.currentContinentalCup,
      currentStats: publicCurrentStats(player.statsTimeline),
      currentClub: publicCurrentClub(normalizedClubStints, player.isUnemployed),
      walletBalance: player.walletBalance,
      shopInventory: publicInventory(player.shopInventory),
    },
    currentSeason: currentSeason
      ? toSeasonDto({ ...currentSeason, wheelCheckpoints: currentSeasonCheckpoints })
      : null,
    seasons: seasons.map(toSeasonDto),
    latestCheckpoint: latestCheckpoint
      ? {
          checkpointId: latestCheckpoint.id,
          stepKey: latestCheckpoint.stepKey,
          revision: latestCheckpoint.revisionAfter,
          outcome: latestCheckpoint.outcome,
          publicResult: latestCheckpoint.publicResult,
          createdAt: latestCheckpoint.createdAt.toISOString(),
        }
      : null,
  };
}
