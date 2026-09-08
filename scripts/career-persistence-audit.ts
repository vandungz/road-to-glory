import { prisma } from "@/lib/prisma";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function latestTimelineAge(value: unknown): number | null {
  const last = asRecord(asArray(value).at(-1));
  return typeof last.age === "number" ? last.age : null;
}

function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? "null", "utf8");
}

async function measureQuery(
  name: string,
  query: () => Promise<unknown>,
): Promise<{ name: string; durationMs: number; ok: boolean }> {
  const startedAt = performance.now();
  try {
    await query();
    return { name, durationMs: Number((performance.now() - startedAt).toFixed(2)), ok: true };
  } catch {
    return { name, durationMs: Number((performance.now() - startedAt).toFixed(2)), ok: false };
  }
}

async function runReadOnlyBaseline(playerId: string | undefined) {
  const baseline = [
    await measureQuery("career_player_count", () => prisma.careerPlayer.count()),
    await measureQuery("career_season_count", () => prisma.careerSeason.count()),
    await measureQuery("wheel_checkpoint_count", () => prisma.wheelCheckpoint.count()),
    await measureQuery("club_reference_page", () => prisma.club.findMany({
      select: { id: true, leagueId: true, prestige: true },
      orderBy: [{ prestige: "desc" }, { name: "asc" }],
      take: 24,
    })),
  ];
  if (playerId) {
    baseline.push(
      await measureQuery("current_career_projection", () => prisma.careerPlayer.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          currentAge: true,
          currentStep: true,
          revision: true,
          checkpointVersion: true,
        },
      })),
      await measureQuery("career_season_history", () => prisma.careerSeason.findMany({
        where: { careerPlayerId: playerId },
        select: { id: true, age: true, status: true },
        orderBy: [{ age: "asc" }, { seasonNumber: "asc" }],
      })),
      await measureQuery("career_checkpoint_history", () => prisma.wheelCheckpoint.findMany({
        where: { careerPlayerId: playerId },
        select: { id: true, seasonId: true, stepKey: true, revisionAfter: true },
        orderBy: [{ createdAt: "desc" }],
        take: 24,
      })),
    );
  }
  return baseline;
}

async function main() {
  const [players, seasonCount, checkpointCount, eventCount] = await Promise.all([
    prisma.careerPlayer.findMany({
      select: {
        id: true,
        slotIndex: true,
        isRetired: true,
        currentAge: true,
        currentStep: true,
        checkpointVersion: true,
        revision: true,
        debutAge: true,
        statsTimeline: true,
        clubStints: true,
        seasonHistory: true,
        walletLedger: true,
        shopInventory: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.careerSeason.count(),
    prisma.wheelCheckpoint.count(),
    prisma.careerEvent.count(),
  ]);

  const anomalies: Array<Record<string, unknown>> = [];
  let aggregateBytes = 0;
  let missingProjection = 0;
  let legacyProjection = 0;
  let retiredWithoutTerminalStep = 0;

  for (const player of players) {
    const timelineAge = latestTimelineAge(player.statsTimeline);
    const history = asRecord(player.seasonHistory);
    aggregateBytes += [
      player.statsTimeline,
      player.clubStints,
      player.seasonHistory,
      player.walletLedger,
      player.shopInventory,
    ].map((value) => jsonBytes(value)).reduce((total, bytes) => total + bytes, 0);

    if (player.currentAge === null || player.currentStep === null) {
      missingProjection += 1;
    }
    if (player.checkpointVersion < 2) legacyProjection += 1;
    if (player.isRetired && player.currentStep !== "retired") retiredWithoutTerminalStep += 1;
    if (timelineAge !== null && player.currentAge !== null && timelineAge > player.currentAge) {
      anomalies.push({ id: player.id, kind: "timeline_ahead_of_projection", timelineAge, currentAge: player.currentAge });
    }
    if (player.currentAge !== null && player.currentAge < player.debutAge) {
      anomalies.push({ id: player.id, kind: "current_age_before_debut", currentAge: player.currentAge, debutAge: player.debutAge });
    }
    if (Object.keys(history).some((age) => !/^\d+$/.test(age))) {
      anomalies.push({ id: player.id, kind: "non_numeric_season_history_key" });
    }
  }

  const report = {
    players: players.length,
    seasonRows: seasonCount,
    checkpointRows: checkpointCount,
    eventRows: eventCount,
    missingProjection,
    legacyProjection,
    retiredWithoutTerminalStep,
    aggregateJsonBytes: aggregateBytes,
    anomalies,
    queryBaseline: process.argv.includes("--baseline")
      ? await runReadOnlyBaseline(players[0]?.id)
      : undefined,
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("Career persistence audit (read-only)");
    console.table({
      players: report.players,
      seasonRows: report.seasonRows,
      checkpointRows: report.checkpointRows,
      eventRows: report.eventRows,
      missingProjection: report.missingProjection,
      legacyProjection: report.legacyProjection,
      retiredWithoutTerminalStep: report.retiredWithoutTerminalStep,
      aggregateJsonBytes: report.aggregateJsonBytes,
      anomalies: report.anomalies.length,
    });
    if (report.anomalies.length > 0) console.table(report.anomalies);
    if (report.queryBaseline) {
      console.log("Read-only query baseline (single run; not a production SLO):");
      console.table(report.queryBaseline);
    }
  }
}

main()
  .catch((error) => {
    console.error("Career persistence audit failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
