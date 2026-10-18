import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { syncAchievementCache } from "@/features/career/services/award-persistence.service";
import { getHonourResultLabel, getSpecificHonourLabel } from "@/features/career/lib/honour-display";
import { AWARD_LABELS } from "@/types/awards";

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
  const counters = { players: players.length, seasons: 0, honours: 0, runnerUps: 0, snapshots: 0, ambiguous: 0 };
  for (const player of players) {
    for (const season of player.seasons) {
      counters.seasons += 1;
      const runtime = asRecord(season.runtimeState);
      const summary = asRecord(season.summary);
      const record = asRecord(summary.seasonRecord ?? asRecord(player.seasonHistory)[String(season.age)]);
      const continentalRecord = asRecord(record.continentalCup);
      const nationalRecord = asRecord(record.nationalTeam);
      const trophies = [
        record.standing === 1 || record.standing === 2 ? {
          key: "league_title",
          scope: "league",
          result: record.standing === 2 ? "runner_up" as const : "winner" as const,
          label: getHonourResultLabel(getSpecificHonourLabel("league_title", "Vô địch giải quốc gia", { leagueId: season.leagueId, leagueName: season.leagueName }), record.standing === 2 ? "runner_up" : "winner"),
        } : null,
        record.domesticCup === "Winner" || record.domesticCup === "Runner-Up" ? {
          key: "domestic_cup_title",
          scope: "domestic_cup",
          result: record.domesticCup === "Runner-Up" ? "runner_up" as const : "winner" as const,
          label: getHonourResultLabel(getSpecificHonourLabel("domestic_cup_title", "Vô địch Cúp quốc gia", { leagueId: season.leagueId, leagueName: season.leagueName }), record.domesticCup === "Runner-Up" ? "runner_up" : "winner"),
        } : null,
        continentalRecord.result === "Winner" || continentalRecord.result === "Runner-Up" ? {
          key: "continental_title",
          scope: "continental",
          result: continentalRecord.result === "Runner-Up" ? "runner_up" as const : "winner" as const,
          label: getHonourResultLabel(getSpecificHonourLabel("continental_title", "Vô địch cúp châu lục", { continentalType: asString(continentalRecord.type) }), continentalRecord.result === "Runner-Up" ? "runner_up" : "winner"),
        } : null,
        nationalRecord.result === "Winner" || nationalRecord.result === "Runner-Up" ? {
          key: "national_team_title",
          scope: "national_team",
          result: nationalRecord.result === "Runner-Up" ? "runner_up" as const : "winner" as const,
          label: getHonourResultLabel(getSpecificHonourLabel("national_team_title", "Vô địch giải quốc tế", { nationalTeamType: asString(nationalRecord.type) }), nationalRecord.result === "Runner-Up" ? "runner_up" : "winner"),
        } : null,
      ].filter((value): value is { key: string; scope: string; result: "winner" | "runner_up"; label: string } => value !== null);
      counters.honours += trophies.length;
      counters.runnerUps += trophies.filter((trophy) => trophy.result === "runner_up").length;
      const simulation = asRecord(runtime.awardSimulation);
      const snapshots = Array.isArray(simulation.snapshots) ? simulation.snapshots : [];
      counters.snapshots += snapshots.length;
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          for (const trophy of trophies) {
            await tx.careerHonour.upsert({
              where: { careerPlayerId_awardInstanceKey: { careerPlayerId: player.id, awardInstanceKey: `${season.id}:${trophy.key}` } },
              create: {
                careerPlayerId: player.id, seasonId: season.id, age: season.age, seasonLabel: `Tuổi ${season.age}`,
                category: "team_trophy", awardKey: trophy.key, scope: trophy.scope, scopeKey: season.leagueId,
                awardInstanceKey: `${season.id}:${trophy.key}`, result: trophy.result, label: trophy.label,
                clubId: season.clubId, clubName: season.clubName, leagueId: season.leagueId,
                metrics: { source: "seasonHistory", standing: asNumber(record.standing) },
                modelVersion: "legacy-backfill-v1", resolutionVersion: "legacy-evidence-v1", source: "legacy_backfill",
              },
              update: { label: trophy.label, result: trophy.result, scopeKey: season.leagueId },
            });
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
            const playerEntry = snapshot.entries
              .map((entry) => asRecord(entry))
              .find((entry) => entry.isCareerPlayer === true && entry.rank === 2 && entry.slotKey == null);
            if (playerEntry && awardKey !== "league_best_xi") {
              const awardInstanceKey = awardKey === "ballon_dor"
                ? `${season.id}:ballon_dor:result`
                : `${season.id}:${awardKey}:winner`;
              await tx.careerHonour.upsert({
                where: { careerPlayerId_awardInstanceKey: { careerPlayerId: player.id, awardInstanceKey } },
                create: {
                  careerPlayerId: player.id,
                  seasonId: season.id,
                  age: season.age,
                  seasonLabel: `Tuổi ${season.age}`,
                  category: awardKey === "ballon_dor" ? "ballon_dor" : "individual_award",
                  awardKey,
                  scope: asString(snapshot.scope) ?? "unknown",
                  scopeKey: asString(snapshot.scopeKey),
                  awardInstanceKey,
                  rank: 2,
                  result: "runner_up",
                  label: AWARD_LABELS[awardKey as keyof typeof AWARD_LABELS] ?? awardKey,
                  clubId: season.clubId,
                  clubName: season.clubName,
                  leagueId: season.leagueId,
                  metrics: asRecord(playerEntry.metrics) as Prisma.InputJsonValue,
                  modelVersion: "legacy-backfill-v1",
                  resolutionVersion: "legacy-evidence-v1",
                  source: awardKey === "ballon_dor" ? "ballon_dor_wheel" : "legacy_backfill",
                },
                update: { rank: 2, result: "runner_up", metrics: asRecord(playerEntry.metrics) as Prisma.InputJsonValue },
              });
            }
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
