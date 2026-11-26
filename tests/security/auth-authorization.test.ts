import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

// Run only inside the audit sandbox. All identity/database calls are replaced.
const load = createRequire(resolve("tests/security/auth-authorization.test.ts"));
const saved = new Map<string, NodeModule | undefined>();
function replace(name: string, exports: object) {
  const id = load.resolve(name);
  saved.set(id, load.cache[id]);
  const stub = new Module(id);
  stub.exports = exports;
  stub.loaded = true;
  load.cache[id] = stub;
}

async function main() {
  let identity: { id: string } | null = null;
  let authError: Error | null = null;
  let gameOwner: string | null = "owner-b";
  let playerOwner: string | null = "owner-b";
  let reads = 0;
  const guardId = load.resolve("../../lib/auth/guards");
  const previousGuard = load.cache[guardId];
  try {
    replace("../../lib/supabase/server", { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: identity }, error: authError }) },
    }) });
    replace("../../lib/prisma", { prisma: {
      gameSession: { findUnique: async () => { reads++; return gameOwner === null ? null : { userId: gameOwner }; } },
      careerPlayer: { findUnique: async () => { reads++; return playerOwner === null ? null : { gameSession: { userId: playerOwner } }; } },
    } });
    delete load.cache[guardId];
    const guards = load("../../lib/auth/guards") as typeof import("../../lib/auth/guards");
    await assert.rejects(guards.requireGameOwnership("game-b"), /Unauthorized/);
    await assert.rejects(guards.requirePlayerOwnership("player-b"), /Unauthorized/);
    assert.equal(reads, 0, "Guest must stop before a database lookup");
    identity = { id: "owner-a" };
    await assert.rejects(guards.requireGameOwnership("game-b"), /Forbidden/);
    await assert.rejects(guards.requirePlayerOwnership("player-b"), /Forbidden/);
    gameOwner = null;
    playerOwner = null;
    await assert.rejects(guards.requireGameOwnership("missing-game"), /Forbidden/);
    await assert.rejects(guards.requirePlayerOwnership("missing-player"), /Forbidden/);
    gameOwner = "owner-a";
    playerOwner = "owner-a";
    assert.deepEqual(await guards.requireGameOwnership("game-a"), { id: "owner-a" });
    assert.deepEqual(await guards.requirePlayerOwnership("player-a"), { id: "owner-a" });
    authError = new Error("Dummy provider error");
    await assert.rejects(guards.requireAuthenticatedUser(), /Unauthorized/);
    console.log("PASS: actual auth guards reject guests, foreign owners, missing records and provider errors.");
  } finally {
    if (previousGuard) load.cache[guardId] = previousGuard;
    else delete load.cache[guardId];
    for (const [id, previous] of saved) {
      if (previous) load.cache[id] = previous;
      else delete load.cache[id];
    }
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
