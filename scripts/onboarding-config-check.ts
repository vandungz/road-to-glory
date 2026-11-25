import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { guides, guideStorageKey, isAutomaticGuide } from "../features/onboarding/guides";
import { hasSeenGuide, markGuideSeen } from "../features/onboarding/guide-storage";
import vi from "../i18n/messages/vi.json";
import en from "../i18n/messages/en.json";

const stepKeys = new Set(Object.keys(vi.onboarding.steps));
assert.deepEqual(Object.keys(vi.onboarding.steps).sort(), Object.keys(en.onboarding.steps).sort());
for (const messages of [vi.onboarding.steps, en.onboarding.steps]) {
  for (const [target, copy] of Object.entries(messages)) {
    assert(copy.title.trim().length > 0 && copy.title.length <= 64, target);
    assert(copy.description.trim().length > 0 && copy.description.length <= 300, target);
  }
}
const targets = new Set<string>();
for (const [id, guide] of Object.entries(guides)) {
  assert(guide.version >= 1 && guide.targets.length > 0, id);
  for (const target of guide.targets) {
    assert(!targets.has(target), `Duplicate target: ${target}`);
    assert(stepKeys.has(target), `Missing translation: ${target}`);
    targets.add(target);
  }
}
assert.equal(targets.size, stepKeys.size, "Unused guide copy");
assert.equal(isAutomaticGuide("policy"), false);
assert.equal(isAutomaticGuide("career"), true);
assert.equal(guideStorageKey("career"), `football-life:guide:career:v${guides.career.version}`);
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
assert.equal(hasSeenGuide("career", storage), false);
markGuideSeen("career", storage);
assert.equal(hasSeenGuide("career", storage), true);
assert.equal(values.get(guideStorageKey("career")), "seen");
assert.equal(hasSeenGuide("transfer", storage), false, "Each feature has its own discovery state");
const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
assert.equal(hasSeenGuide("shop", blocked), false);
markGuideSeen("shop", blocked);
assert.equal(hasSeenGuide("shop", blocked), true, "Blocked storage falls back to this tab");
console.log(`Onboarding configuration passed: ${Object.keys(guides).length} guides, ${targets.size} translated anchors; storage isolation and fallback passed.`);

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "dev" || entry.name === "generated" || entry.name === "onboarding") return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path) : /\.tsx$/.test(path) ? [readFileSync(path, "utf8")] : [];
  });
}
const production = [...sources("features"), ...sources("components"), ...sources("app")].join("\n");
const anchors = new Set(Array.from(production.matchAll(/data-guide=(?:"([^"]+)"|\{[^}]*?"([^"]+)")/g), (match) => match[1] ?? match[2]));
for (const target of targets) assert(anchors.has(target), `No production anchor: ${target}`);
for (const id of Object.keys(guides)) assert(production.includes(`id="${id}"`) || production.includes(`guide="${id}"`) || production.includes(`"${id}" : undefined`), `Guide not registered: ${id}`);
console.log("Production anchor and registration coverage passed.");
