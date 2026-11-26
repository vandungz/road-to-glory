import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve("tests/account-settings.test.ts"));
const originals = new Map<string, NodeModule | undefined>();
function stub(path: string, exports: object) {
  const id = load.resolve(path); originals.set(id, load.cache[id]);
  const replacement = new Module(id); replacement.exports = exports; replacement.loaded = true; load.cache[id] = replacement;
}
async function main() {
  let user: { id: string; email: string; identities: { provider: string }[] } | null = null;
  let wrongPassword = false; let rpcError: { message: string } | null = null; let quota = false; let revokeThrows = false;
  const calls: string[] = [];
  const client = { auth: {
    getUser: async () => ({ data: { user }, error: null }),
    signInWithPassword: async (input: { email: string }) => { calls.push(`verify:${input.email}`); return { data: { user: wrongPassword ? null : user }, error: wrongPassword ? {} : null }; },
    updateUser: async () => { calls.push("update"); return { error: null }; },
    signOut: async ({ scope }: { scope: string }) => { calls.push(`logout:${scope}`); if (revokeThrows) throw new Error("dummy network"); return { error: null }; },
  }, rpc: async (name: string, ...args: unknown[]) => { assert.equal(args.length, 0, "No caller-selected ID"); calls.push(name); return { error: rpcError }; } };
  try {
    stub("next-intl/server", { getTranslations: async () => (key: string) => key });
    stub("../lib/supabase/server", { createClient: async () => client });
    stub("../lib/rate-limit", { checkAuthRateLimit: async () => { if (quota) throw new Error("quota"); } });
    const actions = load("../actions/account.actions") as typeof import("../actions/account.actions");
    const change = { currentPassword: "old-dummy-password", password: "new-dummy-password" };
    assert.equal((await actions.changeAccountPasswordAction(change)).success, false);
    assert.equal((await actions.deleteOwnAccountAction({ confirmation: "DELETE", currentPassword: "x" })).success, false);
    assert.equal(calls.length, 0);
    user = { id: "dummy-owner", email: "owner@example.invalid", identities: [{ provider: "email" }] };
    assert.equal((await actions.deleteOwnAccountAction({ confirmation: "DELETE", currentPassword: "x", userId: "foreign" })).success, false);
    wrongPassword = true;
    assert.equal((await actions.changeAccountPasswordAction(change)).success, false);
    assert.equal((await actions.deleteOwnAccountAction({ confirmation: "DELETE", currentPassword: "x" })).success, false);
    assert(!calls.includes("update") && !calls.includes("delete_own_account"));
    wrongPassword = false; quota = true; calls.length = 0;
    assert.equal((await actions.changeAccountPasswordAction(change)).success, false); assert.equal(calls.length, 0);
    quota = false;
    assert.equal((await actions.changeAccountPasswordAction(change)).success, true);
    assert.deepEqual(calls, ["verify:owner@example.invalid", "update", "logout:others"]);
    revokeThrows = true;
    assert.deepEqual(await actions.changeAccountPasswordAction(change), { success: false, error: "passwordChangedSessionWarning" });
    revokeThrows = false;
    calls.length = 0; rpcError = { message: "reauth_required" };
    user.identities = [{ provider: "google" }];
    assert.deepEqual(await actions.deleteOwnAccountAction({ confirmation: "DELETE", currentPassword: "" }), { success: false, error: "reauthRequired" });
    assert.deepEqual(calls, ["delete_own_account"]);
    calls.length = 0; rpcError = null;
    revokeThrows = true;
    assert.equal((await actions.deleteOwnAccountAction({ confirmation: "DELETE", currentPassword: "" })).success, true);
    assert.deepEqual(calls, ["delete_own_account", "logout:local"]);
    console.log("Account actions passed: guest, input/foreign ID, reauthentication, rate limit, password update, session revocation and deletion failure/success.");
  } finally { for (const [id, original] of originals) { if (original) load.cache[id] = original; else delete load.cache[id]; } }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
