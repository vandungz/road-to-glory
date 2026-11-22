import assert from "node:assert/strict";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { parseSquadSlot } from "../lib/route-params";
import { contentSecurityPolicy } from "../lib/security/headers";
import { config } from "../middleware";
import nextConfig from "../next.config";

for (let slot = 0; slot <= 10; slot++) assert.equal(parseSquadSlot(String(slot)), slot);
for (const value of ["", "01", "+1", " 1", "1 ", "1e0", "1.0", "0x1", "-1", "11", "0.png", "0.svg", "10abc", "1%2epng", "Infinity"]) {
  assert.equal(parseSquadSlot(value), null, `Reject noncanonical slot ${value}`);
}
for (const url of ["/classic/id/draft/0.png", "/id/draft/0.svg", "/classic/id/transfer/0.jpg", "/auth/callback.png", "/dev/fixture.webp", "/privacy", "/quick/play"]) {
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true, `Protect document path ${url}`);
}
for (const url of ["/_next/static/chunk.js", "/_next/image?url=photo.png", "/media/editorial/trophy-collection.webp", "/media/landing/career-gameplay-v2.mp4", "/favicon.ico"]) {
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, `Leave real static asset ${url} cacheable`);
}
const production = contentSecurityPolicy("testnonce", true, false);
assert.match(production, /script-src 'self' 'nonce-testnonce' 'strict-dynamic'/);
assert.doesNotMatch(production.split(";").find((part) => part.trim().startsWith("script-src"))!, /unsafe-inline|unsafe-eval/);
assert.match(production, /frame-ancestors 'none'/);
assert.match(contentSecurityPolicy("testnonce", true, true), /form-action 'self' https:\/\/\*\.supabase\.co https:\/\/accounts\.google\.com/);
assert.match(contentSecurityPolicy("testnonce", false, false), /unsafe-eval/);
async function checkGlobalHeaders() {
  const rules = await nextConfig.headers!();
  assert.ok(rules.some((rule) => rule.source === "/:path*" && rule.headers.some((header) => header.key === "X-Frame-Options" && header.value === "DENY")));
  assert.ok(rules.some((rule) => rule.headers.some((header) => header.key === "Content-Security-Policy" && header.value.includes("frame-ancestors 'none'"))));
  console.log("Security policy: canonical slots, alternate route spellings, CSP and global frame protection passed.");
}
checkGlobalHeaders().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
