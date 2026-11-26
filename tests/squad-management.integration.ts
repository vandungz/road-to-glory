import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { databaseConnectionConfig } from "../lib/database-connection";
import { FORMATION_SLOTS } from "../types/squad";
import { completeSquad, deleteSquad, emptyMatchingSlots, moveSquadPlayer, removeSquadPlayer } from "../features/squad/services/squad-management.service";

assert.deepEqual(emptyMatchingSlots("4-3-3", [5], "CM").map((slot) => slot.index), [7]);
assert.deepEqual(emptyMatchingSlots("unknown", [], "CM"), []);
const pool = new pg.Pool({ ...databaseConnectionConfig(process.env.DIRECT_URL!), max: 1 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const rollback = new Error("ROLLBACK_TEST_FIXTURES");
async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      const column = await tx.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_sessions' AND column_name='playerMoveUsed') AS exists`;
      if (!column[0].exists) await tx.$executeRawUnsafe(readFileSync("prisma/migrations/20261126000100_squad_player_move/migration.sql", "utf8").replace(/^\uFEFF/, ""));
      const owner = randomUUID(), foreign = randomUUID();
      await tx.$executeRaw`INSERT INTO auth.users (id, aud, role) VALUES (${owner}::uuid, 'authenticated', 'authenticated'), (${foreign}::uuid, 'authenticated', 'authenticated')`;
      const source = await tx.gameSession.create({ data: { name: "Rollback source", userId: owner } });
      const target = await tx.gameSession.create({ data: { name: "Rollback target", userId: owner } });
      const outsider = await tx.gameSession.create({ data: { name: "Rollback foreign", userId: foreign } });
      const player = await tx.careerPlayer.create({ data: { gameSessionId: source.id, slotIndex: 5, name: "Rollback player", nationality: "Vietnam", position: "CM", height: 180, preferredFoot: "Right", debutAge: 18, retireAge: 35, careerLengthYears: 18, debutOvr: 70, peakOvr: 85, cardRarity: "gold", statsTimeline: [{ age: 18, ovr: 70 }], clubStints: [], events: [], hiddenStats: {}, seasonHistory: { "18": { apps: 30 } }, isRetired: true } });
      await tx.pveTournament.create({ data: { gameSessionId: source.id, userId: owner, status: "completed", state: {} } });
      // Services run inside the outer rollback transaction, including their locks and real ORM queries.
      const db = { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient;
      const move = (targetId = target.id, slotIndex = 5) => moveSquadPlayer(db, owner, { gameId: source.id, playerId: player.id, targetId, slotIndex });
      await assert.rejects(move(source.id), /invalidTarget/);
      await assert.rejects(move(outsider.id), /invalidTarget/);
      await assert.rejects(move(target.id, 9), /slotUnavailable/);
      await tx.careerPlayer.update({ where: { id: player.id }, data: { isRetired: false } });
      await assert.rejects(move(), /playerMissing/);
      await tx.careerPlayer.update({ where: { id: player.id }, data: { isRetired: true } });
      await assert.rejects(completeSquad(db, owner, source.id), /incomplete/);
      const season = await tx.careerSeason.create({ data: { careerPlayerId: player.id, seasonNumber: 1, age: 18, status: "completed", runtimeState: { fixture: true } } });
      const victim = await tx.careerPlayer.create({ data: { gameSessionId: target.id, slotIndex: 5, name: "Rollback victim", nationality: "Vietnam", position: "CM", height: 180, preferredFoot: "Right", debutAge: 18, retireAge: 35, careerLengthYears: 18, debutOvr: 70, peakOvr: 80, cardRarity: "gold", statsTimeline: [], clubStints: [], events: [], hiddenStats: {}, isRetired: true } });
      const victimSeason = await tx.careerSeason.create({ data: { careerPlayerId: victim.id, seasonNumber: 1, age: 18, runtimeState: {} } });
      for (const slot of FORMATION_SLOTS["4-3-3"].filter((slot) => slot.index !== 5)) await tx.careerPlayer.create({ data: { gameSessionId: target.id, slotIndex: slot.index, name: "Rollback teammate", nationality: "Vietnam", position: slot.position, height: 180, preferredFoot: "Right", debutAge: 18, retireAge: 35, careerLengthYears: 18, debutOvr: 70, peakOvr: 80, cardRarity: "gold", statsTimeline: [], clubStints: [], events: [], hiddenStats: {}, isRetired: true } });
      await tx.gameSession.update({ where: { id: target.id }, data: { status: "completed" } });
      await assert.rejects(move(), /replacementRequired/);
      const replace = (replacement: { id: string; updatedAt: string; confirmation: "DELETE" }) => moveSquadPlayer(db, owner, { gameId: source.id, playerId: player.id, targetId: target.id, slotIndex: 5, replacement });
      await assert.rejects(replace({ id: randomUUID(), updatedAt: victim.updatedAt.toISOString(), confirmation: "DELETE" }), /destinationChanged/);
      await assert.rejects(replace({ id: victim.id, updatedAt: "2000-01-01T00:00:00.000Z", confirmation: "DELETE" }), /destinationChanged/);
      assert.equal(await tx.careerPlayer.count({ where: { id: victim.id } }), 1);
      assert.equal((await tx.gameSession.findUniqueOrThrow({ where: { id: source.id } })).playerMoveUsed, false);
      await replace({ id: victim.id, updatedAt: victim.updatedAt.toISOString(), confirmation: "DELETE" });
      const completedTarget = await tx.gameSession.findUniqueOrThrow({ where: { id: target.id } });
      assert.equal(completedTarget.status, "completed"); assert.equal(completedTarget.squadRating, 80);
      assert.equal(completedTarget.playerMoveUsed, false);
      assert.equal(await tx.careerPlayer.count({ where: { gameSessionId: target.id } }), 11);
      assert.equal(await tx.careerPlayer.count({ where: { id: victim.id } }), 0);
      assert.equal(await tx.careerSeason.count({ where: { id: victimSeason.id } }), 0);
      const moved = await tx.careerPlayer.findUniqueOrThrow({ where: { id: player.id } });
      assert.equal(moved.gameSessionId, target.id); assert.equal(moved.slotIndex, 5); assert.deepEqual(moved.statsTimeline, player.statsTimeline); assert.deepEqual(moved.seasonHistory, player.seasonHistory);
      assert.equal((await tx.gameSession.findUniqueOrThrow({ where: { id: source.id } })).playerMoveUsed, true);
      assert.equal(await tx.pveTournament.count({ where: { gameSessionId: source.id } }), 0);
      assert.equal(await tx.careerEvent.count({ where: { careerPlayerId: player.id, type: "squad_player_moved" } }), 1);
      await assert.rejects(move(), /moveUsed/);
      await assert.rejects(removeSquadPlayer(db, owner, source.id, player.id), /playerMissing/);
      await assert.rejects(deleteSquad(db, foreign, source.id), /squadMissing/);
      await deleteSquad(db, owner, source.id);
      assert.equal(await tx.careerSeason.count({ where: { id: season.id } }), 1, "Moving preserves history after source deletion");
      await deleteSquad(db, owner, target.id);
      assert.equal(await tx.careerSeason.count({ where: { id: season.id } }), 0, "Deleting target cascades its own player history");
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await prisma.$disconnect(); await pool.end(); }
  console.log("Squad integration passed: ownership, retirement, matching slots, one move, preservation, stale requests, PvE invalidation, incomplete finalization and cascade deletion. All fixtures and DDL rolled back.");
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Integration failed"); process.exitCode = 1; });
