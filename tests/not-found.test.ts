import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { appRouteAccess } from "../lib/app-routes";
import { isGameId } from "../lib/route-params";

const id = "00000000-0000-4000-8000-000000000001";
assert.equal(isGameId(id), true);
assert.equal(isGameId(id.toUpperCase()), true);
for (const value of ["", "not-a-game", "undefined", `${id}.png`, `${id} `, "../classic", "<script>"]) assert.equal(isGameId(value), false);
for (const path of ["/", "/quick", "/quick/play", "/login", "/privacy", "/terms", "/settings", "/profile", "/auth/google", "/auth/callback", "/auth/reset-password"]) {
  assert.equal(appRouteAccess(path), "public", path);
}
for (const path of ["/classic", "/pve", `/${id}`, `/classic/${id}`, `/pve/${id}`, `/${id}/draft/10`, `/classic/${id}/draft/0`, `/classic/${id}/draft/3/ballon-dor`, `/classic/${id}/transfer/0`, `/classic/${id}/shop/9`]) {
  assert.equal(appRouteAccess(path), "protected", path);
}
for (const path of ["/404", "/not-a-real-page", "/missing/deep/link", "/classic/invalid", `/classic/${id}/unknown`, `/classic/${id}/draft/0.png`, `/classic/${id}/draft/11`, `/classic/${id}/draft/01`, `/classic/${id}/draft/-1`, `/pve/${id}/extra`, `/${id}/shop/0`, "/auth/missing", "/quick/unknown"]) {
  assert.equal(appRouteAccess(path), "missing", path);
}

// Keep the middleware inventory in sync when any real application page is added.
function checkPages(directory: string, segments: string[] = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) checkPages(join(directory, entry.name), [...segments, entry.name]);
    else if (["page.tsx", "route.ts"].includes(entry.name) && !segments.includes("dev") && !segments.includes("404")) {
      const url = "/" + segments.filter((part) => !part.startsWith("("))
        .map((part) => part === "[gameId]" ? id : part === "[slotIndex]" ? "0" : part).join("/");
      assert.notEqual(appRouteAccess(url), "missing", `New page needs a route access rule: ${url}`);
    }
  }
}
checkPages("app");
console.log("404 routing: real pages covered; malformed IDs, slots and unknown paths rejected before auth/database.");
