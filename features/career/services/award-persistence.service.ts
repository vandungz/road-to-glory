import type { Prisma } from "@/app/generated/prisma/client";
import type { AchievementRecord, SeasonAwardRecord, TrophyRecord } from "@/types/domain";
import {
  AWARD_MODEL_VERSION,
  AWARD_RESOLUTION_VERSION,
  TOP_TEN_LIMIT,
  isDeprecatedAwardKey,
  type AwardHonourInput,
  type AwardRankingSnapshotInput,
  type AwardSimulationResult,
} from "@/types/awards";
import { getSpecificHonourLabel } from "@/features/career/lib/honour-display";

type AwardTransaction = Prisma.TransactionClient;

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function snapshotData(
  input: AwardRankingSnapshotInput,
  playerId: string,
  seasonId: string,
  modelVersion: string,
  resolutionVersion: string,
) {
  const resolution = {
    ...(input.resolution ?? {}),
    ...(input.revealStage ? { revealStage: input.revealStage } : {}),
    ...(input.formation ? { formation: input.formation } : {}),
  };
  return {
    careerPlayerId: playerId,
    seasonId,
    age: input.age,
    seasonLabel: input.seasonLabel,
    snapshotKey: input.snapshotKey,
    awardKey: input.awardKey,
    scope: input.scope,
    scopeKey: input.scopeKey,
    modelVersion,
    resolutionVersion,
    status: input.status,
    entries: json(input.entries),
    resolution: json(resolution),
  };
}

function honourData(input: AwardHonourInput, playerId: string, seasonId: string, age: number, club: { id?: string | null; name?: string | null; leagueId?: string | null }) {
  return {
    careerPlayerId: playerId,
    seasonId,
    age,
    seasonLabel: `Tuổi ${age}`,
    category: input.category,
    awardKey: input.awardKey,
    scope: input.scope,
    scopeKey: input.scopeKey,
    awardInstanceKey: input.awardInstanceKey,
    slotKey: input.slotKey,
    rank: input.rank,
    result: input.result,
    label: input.label,
    clubId: club.id ?? undefined,
    clubName: club.name ?? undefined,
    leagueId: club.leagueId ?? undefined,
    metrics: json(input.metrics),
    modelVersion: input.modelVersion,
    resolutionVersion: input.resolutionVersion,
    source: input.source,
  };
}

export async function persistAwardSimulation(params: {
  tx: AwardTransaction;
  playerId: string;
  seasonId: string;
  age: number;
  club: { id?: string | null; name?: string | null; leagueId?: string | null };
  simulation?: AwardSimulationResult;
}): Promise<void> {
  if (!params.simulation) return;
  for (const snapshot of params.simulation.snapshots) {
    await params.tx.careerAwardRankingSnapshot.upsert({
      where: { snapshotKey: snapshot.snapshotKey },
      create: snapshotData(
        snapshot,
        params.playerId,
        params.seasonId,
        params.simulation.modelVersion,
        params.simulation.resolutionVersion,
      ),
      update: {
        entries: json(snapshot.entries),
        status: snapshot.status,
        resolution: json({
          ...(snapshot.resolution ?? {}),
          ...(snapshot.revealStage ? { revealStage: snapshot.revealStage } : {}),
          ...(snapshot.formation ? { formation: snapshot.formation } : {}),
        }),
        modelVersion: params.simulation.modelVersion,
        resolutionVersion: params.simulation.resolutionVersion,
      },
    });
  }
  for (const honour of params.simulation.honours) {
    await params.tx.careerHonour.upsert({
      where: {
        careerPlayerId_awardInstanceKey: {
          careerPlayerId: params.playerId,
          awardInstanceKey: honour.awardInstanceKey,
        },
      },
      create: honourData(honour, params.playerId, params.seasonId, params.age, params.club),
      update: {
        rank: honour.rank,
        result: honour.result,
        metrics: json(honour.metrics),
        source: honour.source,
      },
    });
  }
}

export async function persistTeamTrophies(params: {
  tx: AwardTransaction;
  playerId: string;
  seasonId: string;
  age: number;
  club: { id?: string | null; name?: string | null; leagueId?: string | null; leagueName?: string | null };
  standing?: number | null;
  domesticCup?: string | null;
  continentalCup?: { type?: string | null; result?: string | null } | null;
  nationalTeam?: { type?: string | null; result?: string | null } | null;
}): Promise<void> {
  const trophies = [
    params.standing === 1 ? {
      key: "league_title" as const,
      scope: "league",
      label: getSpecificHonourLabel("league_title", "Vô địch giải quốc gia", params.club),
    } : null,
    params.domesticCup === "Winner" ? {
      key: "domestic_cup_title" as const,
      scope: "domestic_cup",
      label: getSpecificHonourLabel("domestic_cup_title", "Vô địch Cúp quốc gia", params.club),
    } : null,
    params.continentalCup?.result === "Winner" ? {
      key: "continental_title" as const,
      scope: "continental",
      label: getSpecificHonourLabel("continental_title", "Vô địch cúp châu lục", { continentalType: params.continentalCup.type }),
    } : null,
    params.nationalTeam?.result === "Winner" ? {
      key: "national_team_title" as const,
      scope: "national_team",
      label: getSpecificHonourLabel("national_team_title", "Vô địch giải quốc tế", { nationalTeamType: params.nationalTeam.type }),
    } : null,
  ].filter((value): value is { key: "league_title" | "domestic_cup_title" | "continental_title" | "national_team_title"; scope: string; label: string } => value !== null);
  for (const trophy of trophies) {
    await params.tx.careerHonour.upsert({
      where: { careerPlayerId_awardInstanceKey: { careerPlayerId: params.playerId, awardInstanceKey: `${params.seasonId}:${trophy.key}` } },
      create: {
        careerPlayerId: params.playerId,
        seasonId: params.seasonId,
        age: params.age,
        seasonLabel: `Tuổi ${params.age}`,
        category: "team_trophy",
        awardKey: trophy.key,
        scope: trophy.scope,
        scopeKey: params.club.leagueId ?? undefined,
        awardInstanceKey: `${params.seasonId}:${trophy.key}`,
        result: "winner",
        label: trophy.label,
        clubId: params.club.id ?? undefined,
        clubName: params.club.name ?? undefined,
        leagueId: params.club.leagueId ?? undefined,
        metrics: json({ standing: params.standing, result: "Winner" }),
        modelVersion: AWARD_MODEL_VERSION,
        resolutionVersion: "season-outcome-v1",
        source: "season_simulation",
      },
      update: { label: trophy.label, metrics: json({ standing: params.standing, result: "Winner" }) },
    });
  }
}

export async function finalizeBallonDorRanking(params: {
  tx: AwardTransaction;
  playerId: string;
  seasonId: string;
  age: number;
  rank: number;
  player: { name: string; position: string };
  club: { id?: string | null; name?: string | null; leagueId?: string | null };
}): Promise<void> {
  const rank = Math.max(1, Math.min(TOP_TEN_LIMIT, Math.round(params.rank)));
  const snapshot = await params.tx.careerAwardRankingSnapshot.findFirst({
    where: { careerPlayerId: params.playerId, seasonId: params.seasonId, awardKey: "ballon_dor" },
  });
  const existingEntries = Array.isArray(snapshot?.entries) ? snapshot.entries as unknown[] : [];
  const current = existingEntries.find((entry) => {
    const record = entry as Record<string, unknown>;
    return record.isCareerPlayer === true;
  }) as Record<string, unknown> | undefined;
  const others = existingEntries.filter((entry) => entry !== current).map((entry) => ({ ...(entry as Record<string, unknown>) }));
  const playerEntry = {
    ...(current ?? {}),
    candidateKey: `career:${params.playerId}`,
    name: params.player.name,
    position: params.player.position,
    clubName: params.club.name ?? "Không CLB",
    isCareerPlayer: true,
    metrics: current?.metrics ?? {},
    rank,
    result: rank === 1 ? "winner" : "nominee",
  };
  others.splice(Math.min(rank - 1, others.length), 0, playerEntry);
  const entries = others.slice(0, TOP_TEN_LIMIT).map((entry, index) => ({ ...entry, rank: index + 1, result: entry.isCareerPlayer ? (index === 0 ? "winner" : "nominee") : "ranked" }));
  const snapshotKey = snapshot?.snapshotKey ?? `${params.seasonId}:ballon_dor:global-candidate-universe`;
  await params.tx.careerAwardRankingSnapshot.upsert({
    where: { snapshotKey },
    create: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      age: params.age,
      seasonLabel: `Tuổi ${params.age}`,
      snapshotKey,
      awardKey: "ballon_dor",
      scope: "career",
      scopeKey: "global-candidate-universe",
      modelVersion: AWARD_MODEL_VERSION,
      resolutionVersion: AWARD_RESOLUTION_VERSION,
      status: "resolved",
      entries: json(entries),
      resolution: json({ selectedRank: rank, source: "ballon_dor_wheel", revealStage: "ballon_dor_result" }),
    },
    update: {
      status: "resolved",
      entries: json(entries),
      resolution: json({ ...(snapshot?.resolution as Record<string, unknown> | null ?? {}), selectedRank: rank, source: "ballon_dor_wheel" }),
    },
  });
  await params.tx.careerHonour.upsert({
    where: { careerPlayerId_awardInstanceKey: { careerPlayerId: params.playerId, awardInstanceKey: `${params.seasonId}:ballon_dor:result` } },
    create: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      age: params.age,
      seasonLabel: `Tuổi ${params.age}`,
      category: "ballon_dor",
      awardKey: "ballon_dor",
      scope: "career",
      scopeKey: "global-candidate-universe",
      awardInstanceKey: `${params.seasonId}:ballon_dor:result`,
      rank,
      result: rank === 1 ? "winner" : "nominee",
      label: "Quả bóng vàng",
      clubId: params.club.id ?? undefined,
      clubName: params.club.name ?? undefined,
      leagueId: params.club.leagueId ?? undefined,
      metrics: json({ rank }),
      modelVersion: AWARD_MODEL_VERSION,
      resolutionVersion: AWARD_RESOLUTION_VERSION,
      source: "ballon_dor_wheel",
    },
    update: { rank, result: rank === 1 ? "winner" : "nominee", metrics: json({ rank }) },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function syncAchievementCache(tx: AwardTransaction, playerId: string): Promise<AchievementRecord> {
  const honours = await tx.careerHonour.findMany({
    where: { careerPlayerId: playerId },
    orderBy: [{ age: "asc" }, { createdAt: "asc" }],
    include: { season: { select: { leagueId: true, leagueName: true, runtimeState: true } } },
  });
  const trophies: TrophyRecord[] = [];
  const seasonAwards: SeasonAwardRecord[] = [];
  let ballonDor = 0;
  let ballonDorNominations = 0;
  for (const honour of honours) {
    if (isDeprecatedAwardKey(honour.awardKey)) continue;
    const metrics = asRecord(honour.metrics);
    const runtime = asRecord(honour.season.runtimeState);
    const label = getSpecificHonourLabel(honour.awardKey, honour.label, {
      leagueId: honour.season.leagueId,
      leagueName: honour.season.leagueName,
      continentalType: typeof runtime.continentalCupType === "string" ? runtime.continentalCupType : null,
      nationalTeamType: typeof metrics.nationalType === "string" ? metrics.nationalType : typeof runtime.nationalTournamentType === "string" ? runtime.nationalTournamentType : null,
    });
    if (honour.awardKey === "ballon_dor") {
      ballonDorNominations += 1;
      if (honour.rank === 1 || honour.result === "winner") ballonDor += 1;
      continue;
    }
    if (honour.category === "team_trophy") {
      trophies.push({ type: honour.awardKey === "league_title" ? "league" : honour.awardKey === "continental_title" ? "continental" : honour.awardKey === "national_team_title" ? "international" : "cup", name: label, club: honour.clubName ?? "", age: honour.age });
    } else {
      seasonAwards.push({ type: honour.awardKey, label, age: honour.age });
    }
  }
  return { ballonDor, ballonDorNominations, trophies, seasonAwards };
}

export function seasonHonoursToProjection(honours: Array<{ awardKey: string; label: string; rank: number | null; slotKey: string | null; result: string; metrics: unknown }>): Array<Record<string, unknown>> {
  return honours.filter((honour) => !isDeprecatedAwardKey(honour.awardKey)).map((honour) => ({ awardKey: honour.awardKey, label: honour.label, rank: honour.rank, slotKey: honour.slotKey, result: honour.result, metrics: asRecord(honour.metrics) }));
}
