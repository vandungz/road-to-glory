import assert from "node:assert/strict";
import { settingsReturnPath } from "../features/settings/settings-return-path";

for (const value of [undefined, null, "https://example.com", "//example.com", "/\\example.com", "/quick\n", "/settings", "/not-a-game-route"]) {
  assert.equal(settingsReturnPath(value), "/");
}
assert.equal(settingsReturnPath("/quick/play"), "/quick/play");
assert.equal(settingsReturnPath("/classic"), "/classic");
assert.equal(settingsReturnPath("/pve?view=all"), "/pve?view=all");
console.log("Settings return navigation: valid routes preserved, external and malformed targets rejected.");
