import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve("tests/account-oauth-return.test.ts"));
const originals = new Map<string, NodeModule | undefined>();
function stub(path: string, exports: object) {
  const id = load.resolve(path); originals.set(id, load.cache[id]);
  const replacement = new Module(id); replacement.exports = exports; replacement.loaded = true; load.cache[id] = replacement;
}
async function main() {
  const before = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  let returnValue = ""; let callback = ""; let providerCalls = 0; let linkCalls = 0; let signedIn = true; let linkError = false;
  try {
    stub("next/headers", { cookies: async () => ({ get: () => ({ value: returnValue }), set: (_: string, value: string, options: { httpOnly: boolean; path: string }) => {
      assert.equal(options.httpOnly, true); assert.equal(options.path, "/auth/callback"); returnValue = value;
    } }) });
    stub("../lib/rate-limit", { checkAuthRateLimit: async () => {} });
    stub("../lib/supabase/server", { createClient: async () => ({ auth: {
      getUser: async () => ({ data: { user: signedIn ? { id: "dummy-owner" } : null }, error: null }),
      linkIdentity: async ({ options }: { options: { redirectTo: string } }) => { linkCalls++; callback = options.redirectTo; return { data: { url: linkError ? null : "https://accounts.google.com/link" }, error: linkError ? {} : null }; },
      signInWithOAuth: async ({ options }: { options: { redirectTo: string } }) => { providerCalls++; callback = options.redirectTo; return { data: { url: "https://accounts.google.com/authorize" }, error: null }; },
      exchangeCodeForSession: async () => ({ data: { session: { dummy: true } }, error: null }),
    } }) });
    const google = load("../app/(auth)/auth/google/route") as typeof import("../app/(auth)/auth/google/route");
    const route = load("../app/(auth)/auth/callback/route") as typeof import("../app/(auth)/auth/callback/route");
    const post = (origin: string, next: string, intent = "") => google.POST(new Request("http://localhost:3000/auth/google", { method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ next, intent }) }));
    assert.equal((await post("https://foreign.invalid", "/settings?tab=security")).status, 403); assert.equal(providerCalls, 0);
    assert.equal((await post("http://localhost:3000", "/settings?tab=security")).status, 303);
    assert.equal(callback, "http://localhost:3000/auth/callback?next=/profile"); assert.equal(returnValue, "security");
    const response = await route.GET(new Request("http://localhost:3000/auth/callback?code=dummy&next=/profile"));
    assert.equal(response.headers.get("location"), "http://localhost:3000/settings?tab=security");
    assert.match(response.headers.get("set-cookie") ?? "", /rtg-account-return=;.*Max-Age=0/i);
    await post("http://localhost:3000", "https://foreign.invalid");
    assert.equal(returnValue, ""); assert.equal(callback, "http://localhost:3000/auth/callback");
    const signInsBeforeLink = providerCalls;
    const linked = await post("http://localhost:3000", "/profile", "link");
    assert.equal(linked.headers.get("location"), "https://accounts.google.com/link");
    assert.equal(linkCalls, 1); assert.equal(providerCalls, signInsBeforeLink, "Connecting must not sign into another account");
    assert.equal(callback, "http://localhost:3000/auth/callback?next=/profile");
    linkError = true;
    assert.equal((await post("http://localhost:3000", "/profile", "link")).headers.get("location"), "http://localhost:3000/settings?tab=profile&error=google_link");
    signedIn = false;
    assert.equal((await post("http://localhost:3000", "/profile", "link")).headers.get("location"), "http://localhost:3000/login?next=/profile");
    assert.equal(linkCalls, 2);
    console.log("Account OAuth return passed: origin rejection, allowlisted callback reuse, local Security return, cookie clearing and external-target rejection.");
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = before;
    for (const [id, original] of originals) { if (original) load.cache[id] = original; else delete load.cache[id]; }
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
