import { prisma } from "@/lib/prisma";
import type { AwardRankingView, CareerHonourView, CareerHonoursView } from "@/features/career/contracts/career-honours.contract";
import { isDeprecatedAwardKey } from "@/types/awards";
import { getSpecificHonourLabel } from "@/features/career/lib/honour-display";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function boundedEntries(value: unknown, awardKey: string): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, awardKey === "league_best_xi" ? 11 : 10).map(asRecord);
}

export async function getCareerHonoursQuery(params: {
  playerId: string;
  userId: string;
  seasonId?: string;
  awardKey?: string;
}): Promise<CareerHonoursView> {
  const player = await prisma.careerPlayer.findUnique({
    where: { id: params.playerId },
    select: { gameSession: { select: { userId: true } } },
  });
  if (!player || player.gameSession.userId !== params.userId) throw new Error("Forbidden");
  const where = {
    careerPlayerId: params.playerId,
    ...(params.seasonId ? { seasonId: params.seasonId } : {}),
    ...(params.awardKey ? { awardKey: params.awardKey } : {}),
  };
  const [honours, rankings] = await Promise.all([
    prisma.careerHonour.findMany({
      where,
      orderBy: [{ age: "asc" }, { rank: "asc" }, { createdAt: "asc" }],
      include: { season: { select: { leagueId: true, leagueName: true, runtimeState: true } } },
    }),
    prisma.careerAwardRankingSnapshot.findMany({ where, orderBy: [{ age: "asc" }, { awardKey: "asc" }] }),
  ]);
  const honourView: CareerHonourView[] = honours.filter((honour) => !isDeprecatedAwardKey(honour.awardKey)).map((honour) => ({
    id: honour.id,
    seasonId: honour.seasonId,
    age: honour.age,
    seasonLabel: honour.seasonLabel,
    category: honour.category,
    awardKey: honour.awardKey,
    scope: honour.scope,
    scopeKey: honour.scopeKey,
    slotKey: honour.slotKey,
    rank: honour.rank,
    result: honour.result,
    label: getSpecificHonourLabel(honour.awardKey, honour.label, {
      leagueId: honour.season.leagueId,
      leagueName: honour.season.leagueName,
      continentalType: asString(asRecord(honour.season.runtimeState).continentalCupType),
      nationalTeamType: asString(asRecord(honour.metrics).nationalType) ?? asString(asRecord(honour.season.runtimeState).nationalTournamentType),
    }),
    clubName: honour.clubName,
    metrics: asRecord(honour.metrics),
    source: honour.source,
  }));
  const rankingView: AwardRankingView[] = rankings.filter((ranking) => !isDeprecatedAwardKey(ranking.awardKey)).map((ranking) => {
    const resolution = ranking.resolution ? asRecord(ranking.resolution) : null;
    return {
      id: ranking.id,
      seasonId: ranking.seasonId,
      age: ranking.age,
      seasonLabel: ranking.seasonLabel,
      snapshotKey: ranking.snapshotKey,
      awardKey: ranking.awardKey,
      scope: ranking.scope,
      scopeKey: ranking.scopeKey,
      modelVersion: ranking.modelVersion,
      status: ranking.status,
      entries: boundedEntries(ranking.entries, ranking.awardKey),
      resolution,
      revealStage: typeof resolution?.revealStage === "string" ? resolution.revealStage : undefined,
      formation: typeof resolution?.formation === "string" ? resolution.formation : undefined,
    };
  });
  return { honours: honourView, rankings: rankingView, legacyFallback: honourView.length === 0 && rankings.length === 0 };
}
