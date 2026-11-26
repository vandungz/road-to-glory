import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

// Check the failure budget before contacting the provider again.
// This is not evidence of real Supabase throttling or account compromise.
const load = createRequire(resolve("tests/security/login-failure-budget.test.ts"));
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
  let providerCalls = 0;
  let providerStatus: number | null = 400;
  const counts = new Map<string, number>();
  class DummyRateLimitError extends Error {
    readonly resetAt = Date.now() + 60_000;
  }
  const actionId = load.resolve("../../actions/auth.actions");
  const previousAction = load.cache[actionId];
  try {
    replace("next-intl/server", { getTranslations: async () => (key: string) => key });
    replace("next/headers", { headers: async () => new Headers({ "x-real-ip": "127.0.0.1" }) });
    replace("../../lib/supabase/server", { createClient: async () => ({ auth: {
      signInWithPassword: async () => {
        providerCalls++;
        return { data: { session: providerStatus === null ? { fixture: true } : null }, error: providerStatus === null ? null : { status: providerStatus } };
      },
    } }) });
    replace("../../lib/rate-limit", {
      AuthRateLimitError: DummyRateLimitError,
      checkAuthRateLimit: async (operation: string, identifier: string, options?: { consume: false }) => {
        const key = `${operation}:${identifier}`;
        if (options?.consume === false) {
          if ((counts.get(key) ?? 0) >= 5) throw new DummyRateLimitError("Dummy quota reached");
          return;
        }
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        if (count > (operation === "login-failure" ? 5 : 10)) {
          throw new DummyRateLimitError("Dummy quota reached");
        }
      },
    });
    delete load.cache[actionId];
    const { loginAction } = load("../../actions/auth.actions") as typeof import("../../actions/auth.actions");
    await loginAction({ email: "invalid-email", password: "dummy" });
    assert.equal(providerCalls, 0, "Invalid input stops before provider");
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await loginAction({ email: "fixture@example.invalid", password: "dummy-wrong-password" });
      assert.equal(result.success, false);
    }
    assert.equal(providerCalls, 5, "Sixth attempt must stop before the provider after five failures");
    counts.clear();
    providerStatus = null;
    assert.equal((await loginAction({ email: "fixture@example.invalid", password: "dummy-correct" })).success, true);
    assert.equal([...counts.keys()].filter((key) => key.startsWith("login-failure:")).length, 0, "Successful login must not consume the failure budget");
    providerStatus = 503;
    assert.equal((await loginAction({ email: "fixture@example.invalid", password: "dummy" })).success, false);
    assert.equal([...counts.keys()].filter((key) => key.startsWith("login-failure:")).length, 0, "Provider outage must not consume the failure budget");
    console.log("PASS: exhausted failure budget stops further credential checks.");
  } finally {
    if (previousAction) load.cache[actionId] = previousAction;
    else delete load.cache[actionId];
    for (const [id, previous] of saved) {
      if (previous) load.cache[id] = previous;
      else delete load.cache[id];
    }
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
