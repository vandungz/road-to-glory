import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { syncAchievementCache } from "@/features/career/services/award-persistence.service";
import { getSpecificHonourLabel } from "@/features/career/lib/honour-display";

const dryRun = process.argv.includes("--dry-run");

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null { return typeof value === "string" ? value : null; }
function asNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

async function main() {
  const players = await prisma.careerPlayer.findMany({
    select: { id: true, seasonHistory: true, seasons: { select: { id: true, age: true, clubId: true, clubName: true, leagueId: true, leagueName: true, runtimeState: true, summary: true } } },
  });
  const counters = { players: players.length, seasons: 0, honours: 0, snapshots: 0, ambiguous: 0 };
  for (const player of players) {
    for (const season of player.seasons) {
      counters.seasons += 1;
      const runtime = asRecord(season.runtimeState);
      const summary = asRecord(season.summary);
      const record = asRecord(summary.seasonRecord ?? asRecord(player.seasonHistory)[String(season.age)]);
      const continentalRecord = asRecord(record.continentalCup);
      const nationalRecord = asRecord(record.nationalTeam);
      const trophies = [
        record.standing === 1 ? {
          key: "league_title",
          scope: "league",
          label: getSpecificHonourLabel("league_title", "Vô địch giải quốc gia", { leagueId: season.leagueId, leagueName: season.leagueName }),
        } : null,
        record.domesticCup === "Winner" ? {
          key: "domestic_cup_title",
          scope: "domestic_cup",
          label: getSpecificHonourLabel("domestic_cup_title", "Vô địch Cúp quốc gia", { leagueId: season.leagueId, leagueName: season.leagueName }),
        } : null,
        continentalRecord.result === "Winner" ? {
          key: "continental_title",
          scope: "continental",
          label: getSpecificHonourLabel("continental_title", "Vô địch cúp châu lục", { continentalType: asString(continentalRecord.type) }),
        } : null,
        nationalRecord.result === "Winner" ? {
          key: "national_team_title",
          scope: "national_team",
          label: getSpecificHonourLabel("national_team_title", "Vô địch giải quốc tế", { nationalTeamType: asString(nationalRecord.type) }),
        } : null,
      ].filter((value): value is { key: string; scope: string; label: string } => value !== null);
      const simulation = asRecord(runtime.awardSimulation);
      const snapshots = Array.isArray(simulation.snapshots) ? simulation.snapshots : [];
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          for (const trophy of trophies) {
            await tx.careerHonour.upsert({
              where: { careerPlayerId_awardInstanceKey: { careerPlayerId: player.id, awardInstanceKey: `${season.id}:${trophy.key}` } },
              create: {
                careerPlayerId: player.id, seasonId: season.id, age: season.age, seasonLabel: `Tuổi ${season.age}`,
                category: "team_trophy", awardKey: trophy.key, scope: trophy.scope, scopeKey: season.leagueId,
                awardInstanceKey: `${season.id}:${trophy.key}`, result: "winner", label: trophy.label,
                clubId: season.clubId, clubName: season.clubName, leagueId: season.leagueId,
                metrics: { source: "seasonHistory", standing: asNumber(record.standing) },
                modelVersion: "legacy-backfill-v1", resolutionVersion: "legacy-evidence-v1", source: "legacy_backfill",
              },
              update: { label: trophy.label, scopeKey: season.leagueId },
            });
            counters.honours += 1;
          }
          for (const raw of snapshots) {
            const snapshot = asRecord(raw);
            const snapshotKey = asString(snapshot.snapshotKey);
            const awardKey = asString(snapshot.awardKey);
            if (!snapshotKey || !awardKey || !Array.isArray(snapshot.entries)) continue;
            await tx.careerAwardRankingSnapshot.upsert({
              where: { snapshotKey },
              create: {
                careerPlayerId: player.id, seasonId: season.id, age: season.age, seasonLabel: `Tuổi ${season.age}`,
                snapshotKey, awardKey, scope: asString(snapshot.scope) ?? "unknown", scopeKey: asString(snapshot.scopeKey),
                modelVersion: "legacy-backfill-v1", resolutionVersion: "legacy-evidence-v1", status: "generated",
                entries: snapshot.entries.slice(0, 10), resolution: { source: "runtimeState" },
              },
              update: {},
            });
            counters.snapshots += 1;
          }
          const achievements = await syncAchievementCache(tx, player.id);
          await tx.careerPlayer.update({
            where: { id: player.id },
            data: { achievements: achievements as unknown as Prisma.InputJsonValue },
          });
        });
      }
      const legacyAwards: unknown[] = Array.isArray(asRecord(record.achievements).seasonAwards) ? asRecord(record.achievements).seasonAwards as unknown[] : [];
      if (legacyAwards.length > 0 && snapshots.length === 0) counters.ambiguous += legacyAwards.length;
    }
  }
  console.log(JSON.stringify({ dryRun, ...counters }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
