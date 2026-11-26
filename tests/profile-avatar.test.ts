import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import { statSync } from "node:fs";
import { accountAvatar, googleAvatarUrl, profileAvatarChoice, profileAvatarSource } from "../features/settings/profile-avatar";

assert.equal(googleAvatarUrl("https://lh3.googleusercontent.com/picture"), "https://lh3.googleusercontent.com/picture");
for (const value of ["http://lh3.googleusercontent.com/a", "https://googleusercontent.com.evil.invalid/a", "https://user:pass@lh3.googleusercontent.com/a", "https://127.0.0.1/a", "data:image/png;a", "https://lh3.googleusercontent.com:444/a"]) assert.equal(googleAvatarUrl(value), null);
assert.equal(profileAvatarChoice("../../private", false), "default");
assert.equal(profileAvatarChoice(null, true), "google");
assert.deepEqual(accountAvatar({ user_metadata: { profile_avatar: "playmaker" } }), { choice: "playmaker", google: null });
assert.deepEqual(accountAvatar({ user_metadata: {}, identities: [{ provider: "google", identity_data: { picture: "https://lh3.googleusercontent.com/a" } }] }), { choice: "google", google: "https://lh3.googleusercontent.com/a" });
assert.deepEqual(accountAvatar({ user_metadata: {}, identities: [{ provider: "google", identity_data: { picture: "https://foreign.invalid/a" } }] }), { choice: "default", google: null });
for (const choice of ["striker", "playmaker", "winger"] as const) assert(statSync(`public${profileAvatarSource(choice, null)}`).size < 20_000);
const load = createRequire(resolve("tests/profile-avatar.test.ts"));
const originals = new Map<string, NodeModule | undefined>();
function stub(path: string, exports: object) {
  const id = load.resolve(path); originals.set(id, load.cache[id]); const replacement = new Module(id);
  replacement.exports = exports; replacement.loaded = true; load.cache[id] = replacement;
}
async function main() {
  let user: { id: string; identities: { provider: string; identity_data: { picture: string } }[] } | null = null;
  let quota = false; let updated: unknown;
  try {
    stub("next/cache", { revalidatePath: () => {} });
    stub("next-intl/server", { getTranslations: async () => (key: string) => key });
    stub("../lib/rate-limit", { checkAuthRateLimit: async () => { if (quota) throw new Error("quota"); } });
    stub("../lib/supabase/server", { createClient: async () => ({ auth: {
      getUser: async () => ({ data: { user }, error: null }),
      updateUser: async (input: unknown) => { updated = input; return { error: null }; },
    } }) });
    const { updateProfileAvatarAction: save } = load("../actions/profile.actions") as typeof import("../actions/profile.actions");
    assert.equal((await save("striker")).success, false);
    user = { id: "dummy-owner", identities: [] };
    for (const input of ["https://foreign.invalid/a.png", "../../file", { choice: "striker", userId: "other" }, "google"]) assert.equal((await save(input)).success, false);
    assert.equal(updated, undefined);
    quota = true; assert.equal((await save("striker")).success, false); assert.equal(updated, undefined);
    quota = false; assert.equal((await save("striker")).success, true); assert.deepEqual(updated, { data: { profile_avatar: "striker" } });
    user.identities = [{ provider: "google", identity_data: { picture: "https://lh3.googleusercontent.com/picture" } }];
    assert.equal((await save("google")).success, true); assert.deepEqual(updated, { data: { profile_avatar: "google" } });
    console.log("Profile avatars passed: URL allowlist, fallbacks, asset budgets, guest/foreign input, quota and authenticated metadata updates.");
  } finally { for (const [id, original] of originals) { if (original) load.cache[id] = original; else delete load.cache[id]; } }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
