import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { databaseConnectionConfig } from "../lib/database-connection";
import { deleteSquad, moveSquadPlayer } from "../features/squad/services/squad-management.service";

const owner = randomUUID();
const adminPool = new pg.Pool({ ...databaseConnectionConfig(process.env.DIRECT_URL!), max: 1 });
const runtimePool = new pg.Pool({ ...databaseConnectionConfig(process.env.DATABASE_URL!), max: 3 });
const admin = new PrismaClient({ adapter: new PrismaPg(adminPool) });
const runtime = new PrismaClient({ adapter: new PrismaPg(runtimePool) });
async function main() {
  try {
    // Synthetic, non-login owner; committed only so separate connections can test real row locks.
    await admin.$executeRaw`INSERT INTO auth.users (id, aud, role) VALUES (${owner}::uuid, 'authenticated', 'authenticated')`;
    const squads = await Promise.all(Array.from({ length: 10 }, (_, index) => admin.gameSession.create({ data: { userId: owner, name: `Concurrency fixture ${index}` } })));
    const createPlayer = (gameSessionId: string, slotIndex: number) => admin.careerPlayer.create({ data: { gameSessionId, slotIndex, name: "Concurrency fixture", nationality: "Vietnam", position: "CM", height: 180, preferredFoot: "Right", debutAge: 18, retireAge: 35, careerLengthYears: 18, debutOvr: 70, peakOvr: 85, cardRarity: "gold", statsTimeline: [], clubStints: [], events: [], hiddenStats: {}, isRetired: true } });
    const [a, b] = await Promise.all([createPlayer(squads[0].id, 5), createPlayer(squads[0].id, 7)]);
    const once = await Promise.allSettled([a, b].map((player, index) => moveSquadPlayer(runtime, owner, { gameId: squads[0].id, playerId: player.id, targetId: squads[index + 1].id, slotIndex: 5 })));
    assert.equal(once.filter((result) => result.status === "fulfilled").length, 1);
    assert(once.some((result) => result.status === "rejected" && result.reason.message === "moveUsed"));
    const [c, d] = await Promise.all([createPlayer(squads[3].id, 5), createPlayer(squads[4].id, 5)]);
    const slot = await Promise.allSettled([c, d].map((player, index) => moveSquadPlayer(runtime, owner, { gameId: squads[index + 3].id, playerId: player.id, targetId: squads[5].id, slotIndex: 5 })));
    assert.equal(slot.filter((result) => result.status === "fulfilled").length, 1);
    assert(slot.some((result) => result.status === "rejected" && result.reason.message === "replacementRequired"));
    const loser = slot[0].status === "rejected" ? squads[3] : squads[4];
    assert.equal((await admin.gameSession.findUniqueOrThrow({ where: { id: loser.id } })).playerMoveUsed, false, "Rejected transfer must not consume its turn");
    const e = await createPlayer(squads[6].id, 5);
    const removal = await Promise.allSettled([
      moveSquadPlayer(runtime, owner, { gameId: squads[6].id, playerId: e.id, targetId: squads[2].id, slotIndex: 7 }),
      deleteSquad(runtime, owner, squads[6].id),
    ]);
    assert.equal(removal[1].status, "fulfilled");
    const survivingPlayer = await admin.careerPlayer.findUnique({ where: { id: e.id } });
    assert.equal(!!survivingPlayer, removal[0].status === "fulfilled", "Delete either cascades before move or preserves the moved player");
    const [f, g, victim] = await Promise.all([createPlayer(squads[7].id, 5), createPlayer(squads[8].id, 5), createPlayer(squads[9].id, 5)]);
    const replacement = { id: victim.id, updatedAt: victim.updatedAt.toISOString(), confirmation: "DELETE" as const };
    const overwrite = await Promise.allSettled([f, g].map((player, index) => moveSquadPlayer(runtime, owner, { gameId: squads[index + 7].id, playerId: player.id, targetId: squads[9].id, slotIndex: 5, replacement })));
    assert.equal(overwrite.filter((result) => result.status === "fulfilled").length, 1);
    assert(overwrite.some((result) => result.status === "rejected" && result.reason.message === "destinationChanged"));
    assert.equal(await admin.careerPlayer.count({ where: { id: victim.id } }), 0);
    assert.equal(await admin.careerPlayer.count({ where: { id: { in: [f.id, g.id] } } }), 2, "A stale confirmation never deletes the new occupant");
    console.log("Concurrency passed: exactly one outbound move, one occupied-slot winner, rejected move rollback, and delete/move race. Synthetic fixtures cleaned up.");
  } finally {
    await admin.gameSession.deleteMany({ where: { userId: owner } });
    await admin.$executeRaw`DELETE FROM auth.users WHERE id = ${owner}::uuid`;
    assert.equal(await admin.gameSession.count({ where: { userId: owner } }), 0);
    await Promise.all([admin.$disconnect(), runtime.$disconnect()]);
    await Promise.all([adminPool.end(), runtimePool.end()]);
  }
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Concurrency test failed"); process.exitCode = 1; });
