import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve("tests/squad-actions.test.ts"));
const originals = new Map<string, NodeModule | undefined>();
function stub(path: string, exports: object) {
  const id = load.resolve(path); originals.set(id, load.cache[id]); const replacement = new Module(id);
  replacement.exports = exports; replacement.loaded = true; load.cache[id] = replacement;
}
async function main() {
  const gameId = "11111111-1111-4111-8111-111111111111", playerId = "22222222-2222-4222-8222-222222222222", targetId = "33333333-3333-4333-8333-333333333333";
  let signedIn = false, allowed = true, quota = false; const calls: { owner: string; operation: string }[] = [];
  try {
    stub("next/cache", { revalidatePath: () => {} });
    stub("next-intl/server", { getTranslations: async () => (key: string) => key });
    stub("../lib/prisma", { prisma: {
      gameSession: { findFirst: async () => ({ playerMoveUsed: false }), findMany: async (query: { where: { userId: string }; select: { players: { select: Record<string, boolean> } } }) => {
        assert.equal(query.where.userId, "verified-owner");
        for (const privateField of ["hiddenStats", "statsTimeline", "seasonHistory"]) assert.equal(query.select.players.select[privateField], undefined);
        return [{ id: targetId, name: "Own squad", formation: "4-3-3", players: [{ id: "44444444-4444-4444-8444-444444444444", slotIndex: 5, name: "Player B", position: "CM", nationality: "France", peakOvr: 88, portraitId: "p02", updatedAt: new Date("2026-11-26T00:00:00.000Z") }] }];
      } }, careerPlayer: { findFirst: async () => ({ position: "CM" }) },
    } });
    const authenticated = async () => { if (!signedIn) throw new Error("Unauthorized"); return { id: "verified-owner" }; };
    stub("../lib/auth/guards", { requireAuthenticatedUser: authenticated, requireGameOwnership: async () => { const user = await authenticated(); if (!allowed) throw new Error("Forbidden"); return user; } });
    stub("../lib/rate-limit", { checkRateLimit: async () => { if (quota) throw new Error("Quota"); } });
    const service = (operation: string) => async (_db: unknown, owner: string) => { calls.push({ owner, operation }); return operation === "remove" ? 5 : { targetId }; };
    stub("../features/squad/services/squad-management.service", { SquadManagementError: class extends Error {}, deleteSquad: service("delete"), moveSquadPlayer: service("move"), removeSquadPlayer: service("remove") });
    const actions = load("../actions/squad.actions") as typeof import("../actions/squad.actions");
    const deletion = { gameId, confirmation: "DELETE" };
    const move = { gameId, playerId, targetId, slotIndex: 5 };
    assert.equal((await actions.deleteSquadAction(deletion)).success, false);
    assert.equal((await actions.moveSquadPlayerAction(move)).success, false);
    signedIn = true;
    for (const input of [{ gameId }, { ...deletion, confirmation: "delete" }, { ...deletion, userId: "foreign" }, { ...deletion, gameId: "invalid" }]) assert.equal((await actions.deleteSquadAction(input)).success, false);
    for (const input of [{ ...move, slotIndex: -1 }, { ...move, slotIndex: 11 }, { ...move, slotIndex: 1.5 }, { ...move, userId: "foreign" }, { ...move, replacement: { id: targetId, updatedAt: "bad", confirmation: "DELETE" } }, { ...move, replacement: { id: targetId, updatedAt: "2026-11-26T00:00:00.000Z", confirmation: "yes" } }]) assert.equal((await actions.moveSquadPlayerAction(input)).success, false);
    allowed = false; assert.equal((await actions.manageSquadPlayerAction({ gameId, playerId, mode: "replace" })).success, false);
    allowed = true; quota = true;
    assert.equal((await actions.deleteSquadAction(deletion)).success, false);
    assert.equal((await actions.moveSquadPlayerAction(move)).success, false);
    assert.deepEqual(calls, []);
    quota = false;
    const listing = await actions.getPlayerMoveDestinationsAction({ gameId, playerId });
    assert.equal(listing.success, true);
    if (listing.success) {
      assert.equal(listing.destinations[0].slots.length, 2);
      assert.equal(listing.destinations[0].slots[0].occupant?.peakOvr, 88);
      assert.equal(listing.destinations[0].slots[0].occupant?.updatedAt, "2026-11-26T00:00:00.000Z");
      assert.equal(listing.destinations[0].slots[1].occupant, undefined);
    }
    assert.equal((await actions.moveSquadPlayerAction(move)).success, true);
    assert.equal((await actions.deleteSquadAction(deletion)).success, true);
    assert.equal((await actions.manageSquadPlayerAction({ gameId, playerId, mode: "replace" })).success, true);
    assert.deepEqual(calls, ["move", "delete", "remove"].map((operation) => ({ owner: "verified-owner", operation })));
    console.log("Squad actions passed: authentication, strict input, explicit confirmation, ownership guard, rate limit and server-derived owner.");
  } finally { for (const [id, original] of originals) { if (original) load.cache[id] = original; else delete load.cache[id]; } }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
