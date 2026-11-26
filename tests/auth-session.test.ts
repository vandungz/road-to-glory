import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import { sessionRequest } from "../features/auth/session-request";
import { appRouteAccess } from "../lib/app-routes";

const load = createRequire(resolve("tests/auth-session.test.ts"));
const actionId = load.resolve("../actions/auth.actions");
const originalAction = load.cache[actionId];
const originalFetch = globalThis.fetch;

async function main() {
  const calls: { operation: string; input: unknown }[] = [];
  let failure = false;
  let limited = false;
  const actions = new Module(actionId);
  actions.exports = Object.fromEntries(Object.entries({ loginAction: "login", signUpAction: "signup", verifySignupCodeAction: "verify", resendSignupAction: "resend", logoutAction: "logout" }).map(([name, operation]) => [name, async (input: unknown) => {
    calls.push({ operation, input });
    if (limited) return { success: false, error: "Try later", code: "rate_limited", retryAfterSeconds: 17 };
    return failure ? { success: false, error: "Invalid credentials" } : { success: true };
  }]));
  actions.loaded = true;
  load.cache[actionId] = actions;
  try {
    const { POST } = load("../app/(auth)/auth/session/route") as typeof import("../app/(auth)/auth/session/route");
    const post = (body: string, overrides: Record<string, string> = {}) => POST(new Request("https://game.invalid/auth/session", {
      method: "POST", headers: { origin: "https://game.invalid", "content-type": "application/json", ...overrides }, body,
    }));
    assert.equal(appRouteAccess("/auth/session"), "public");
    for (const origin of ["https://foreign.invalid", "null", ""]) {
      assert.equal((await post('{"operation":"logout"}', { origin })).status, 403);
    }
    assert.equal((await post('{}', { "content-type": "text/plain" })).status, 415);
    assert.equal((await post('x'.repeat(4097))).status, 413);
    assert.equal((await post('{}', { "content-length": "4097" })).status, 413);
    for (const body of ['{', '{}', '{"operation":"constructor"}', '{"operation":"logout","extra":true}']) {
      assert.equal((await post(body)).status, 400);
    }
    assert.equal(calls.length, 0, "Rejected requests never reach auth operations");
    for (const operation of ["login", "signup", "verify", "resend", "logout"]) {
      const input = { email: "fixture@example.invalid", password: "dummy" };
      const response = await post(JSON.stringify({ operation, input }));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      assert.match(response.headers.get("content-type")!, /application\/json/);
      assert.deepEqual(await response.json(), { success: true });
      assert.deepEqual(calls.at(-1), { operation, input });
    }
    failure = true;
    assert.deepEqual(await (await post('{"operation":"login"}')).json(), { success: false, error: "Invalid credentials" });
    limited = true;
    const quota = await post('{"operation":"login"}');
    assert.equal(quota.status, 429); assert.equal(quota.headers.get("retry-after"), "17");

    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/auth/session");
      assert.equal(options?.redirect, "error");
      assert.equal(options?.credentials, "same-origin");
      assert.equal(options?.cache, "no-store");
      assert.deepEqual(JSON.parse(String(options?.body)), { operation: "logout" });
      return Response.json({ success: true });
    };
    assert.deepEqual(await sessionRequest("logout"), { success: true });
    globalThis.fetch = async () => Response.json({ success: false, error: "Try later", code: "rate_limited", retryAfterSeconds: 17 }, { status: 429 });
    assert.equal((await sessionRequest("login")).success, false);
    globalThis.fetch = async () => new Response("<html>redirected</html>", { status: 403 });
    await assert.rejects(() => sessionRequest("logout"), /Session request failed/);
    globalThis.fetch = async () => Response.json({ success: "yes" });
    await assert.rejects(() => sessionRequest("logout"), /Invalid session response/);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    await assert.rejects(() => sessionRequest("logout"), /offline/);
    console.log("Auth session passed: CSRF, bounded input, JSON transport, all operations, quota/error and network recovery.");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalAction) load.cache[actionId] = originalAction; else delete load.cache[actionId];
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
