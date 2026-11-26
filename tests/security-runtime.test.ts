import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve("tests/security-runtime.test.ts"));
const cached = new Map<string, NodeModule | undefined>();
function replace(name: string, exports: object) {
  const id = load.resolve(name);
  cached.set(id, load.cache[id]);
  const stub = new Module(id);
  stub.exports = exports;
  stub.loaded = true;
  load.cache[id] = stub;
}

async function main() {
  const names = ["NODE_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
  const environment = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(names.map((key) => [key, environment[key]]));
  let response = { success: true, reason: undefined as string | undefined };
  let calls = 0;
  let writes = 0;
  let providerFailure = false;
  let remaining = 1;
  class DummyRatelimit {
    static slidingWindow() { return {}; }
    async limit() { calls++; if (providerFailure) throw new Error("Dummy limiter unavailable"); return response; }
    async getRemaining() { if (providerFailure) throw new Error("Dummy limiter unavailable"); return { remaining, reset: Date.now() + 60_000 }; }
  }
  try {
    environment.NODE_ENV = "production";
    environment.UPSTASH_REDIS_REST_URL = "https://dummy.invalid";
    environment.UPSTASH_REDIS_REST_TOKEN = "dummy-token";
    replace("@upstash/redis", { Redis: class DummyRedis {} });
    replace("@upstash/ratelimit", { Ratelimit: DummyRatelimit });
    replace("next-intl/server", { getTranslations: async () => (key: string) => key });
    replace("next/navigation", { redirect: () => { throw new Error("DUMMY_REDIRECT"); } });
    replace("../lib/auth/guards", { requireAuthenticatedUser: async () => ({ id: "dummy-owner" }) });
    replace("../lib/prisma", { prisma: { gameSession: { create: async () => { writes++; return { id: "dummy-session" }; } } } });
    const { checkRateLimit, checkAuthRateLimit } = load("../lib/rate-limit") as typeof import("../lib/rate-limit");
    const { createGameSession } = load("../features/game/actions/createGameSession") as typeof import("../features/game/actions/createGameSession");
    const beforeRead = calls;
    await checkAuthRateLimit("login-failure", "dummy", { consume: false });
    assert.equal(calls, beforeRead, "Checking a failure budget must not consume a successful login");
    remaining = 0;
    await assert.rejects(checkAuthRateLimit("login-failure", "dummy", { consume: false }), /Too many authentication/);
    providerFailure = true;
    await assert.rejects(checkAuthRateLimit("login-failure", "dummy", { consume: false }), /Dummy limiter unavailable/);
    providerFailure = false;
    const input = new FormData();
    input.set("name", "Quota fixture");
    input.set("formation", "4-3-3");
    response = { success: true, reason: "timeout" };
    await assert.rejects(createGameSession(input), /protection is unavailable/);
    assert.equal(writes, 0, "A timeout must never reach the persistent mutation");
    await assert.rejects(checkAuthRateLimit("signup", "dummy"), /protection is unavailable/);
    response = { success: false, reason: undefined };
    await assert.rejects(createGameSession(input), /Too many requests/);
    assert.equal(writes, 0);
    providerFailure = true;
    await assert.rejects(createGameSession(input), /Dummy limiter unavailable/);
    assert.equal(writes, 0, "Provider failure must not permit a mutation");
    providerFailure = false;
    response = { success: true, reason: undefined };
    await assert.rejects(createGameSession(input), /DUMMY_REDIRECT/);
    assert.equal(writes, 1, "An allowed request reaches exactly one dummy insert");
    const before = calls;
    const invalid = new FormData();
    invalid.set("name", ""); invalid.set("formation", "invalid");
    await createGameSession(invalid);
    assert.equal(calls, before, "Invalid requests stop before provider access");
    assert.equal(writes, 1);
    delete environment.UPSTASH_REDIS_REST_URL;
    delete environment.UPSTASH_REDIS_REST_TOKEN;
    const limiterId = load.resolve("../lib/rate-limit");
    delete load.cache[limiterId];
    const missing = load("../lib/rate-limit") as typeof import("../lib/rate-limit");
    await assert.rejects(missing.checkRateLimit("dummy"), /protection is unavailable/);
    await assert.rejects(missing.checkAuthRateLimit("login", "dummy"), /protection is unavailable/);
    await assert.rejects(missing.checkAuthRateLimit("login-failure", "dummy", { consume: false }), /protection is unavailable/);
    environment.NODE_ENV = "development";
    await missing.checkRateLimit("dummy");
    console.log("Security runtime: actual squad action blocks timeout/denial/provider failure/missing configuration without database writes.");
    // Exercise the imported production helper independently as well.
    environment.NODE_ENV = "production";
    await checkRateLimit("dummy");
  } finally {
    for (const key of names) {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    }
    for (const [id, module] of cached) {
      if (module) load.cache[id] = module;
      else delete load.cache[id];
    }
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
