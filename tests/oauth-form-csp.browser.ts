import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { contentSecurityPolicy } from "../lib/security/headers";

// All network requests are intercepted: no server, account or live OAuth provider.
async function main() {
  // CDP intercepts every redirect hop; Playwright route.fulfill only handles the first.
  const engine = chromium;
    const browser = await engine.launch({ headless: true, args: ["--host-resolver-rules=MAP * ~NOTFOUND"] });
    try {
      for (const production of [false, true]) {
        for (const scenario of [
          { entry: "/", kind: "allowed" }, { entry: "/login", kind: "allowed" }, { entry: "/settings", kind: "allowed" },
          { entry: "/", kind: "legacy" }, { entry: "/settings", kind: "untrusted" },
        ]) {
          const { entry, kind } = scenario;
          const context = await browser.newContext({ serviceWorkers: "block" });
          const page = await context.newPage();
          const errors: string[] = [];
          const destinations: string[] = [];
          const client = await context.newCDPSession(page);
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
          client.on("Fetch.requestPaused", (event) => { void (async () => {
            const url = new URL(event.request.url);
            destinations.push(url.origin + url.pathname);
            const fulfill = (status: number, headers: Record<string, string>, body = "") => client.send("Fetch.fulfillRequest", {
              requestId: event.requestId, responseCode: status,
              responseHeaders: Object.entries(headers).map(([name, value]) => ({ name, value })),
              body: Buffer.from(body).toString("base64"),
            });
            if (url.origin === "https://game.invalid" && url.pathname === entry && event.request.method === "GET") {
              const policy = contentSecurityPolicy("fixture-nonce", production);
              return fulfill(200, { "content-type": "text/html", "Content-Security-Policy": kind === "legacy" ? policy.replace(/form-action[^;]*/, "form-action 'self'") : policy },
                '<!doctype html><title>Fixture</title><form action="/auth/google" method="post"><input name="next" value="/classic" type="hidden"><button>Google</button></form>');
            }
            if (url.href === "https://game.invalid/auth/google") {
              assert.equal(event.request.method, "POST");
              return fulfill(303, { location: "https://fixture.supabase.co/auth/v1/authorize" });
            }
            if (url.href === "https://fixture.supabase.co/auth/v1/authorize") {
              return fulfill(302, { location: kind === "untrusted" ? "https://attacker.invalid/fixture" : "https://accounts.google.com/fixture" });
            }
            if (url.href === "https://accounts.google.com/fixture") {
              return fulfill(200, { "content-type": "text/html" }, "<!doctype html><title>Mock Google account chooser</title>Mock Google account chooser");
            }
            return fulfill(200, { "content-type": "text/plain" }, "");
          })().catch((error) => { errors.push(String(error)); }); });
          await client.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
          await page.goto(`https://game.invalid${entry}`);
          if (entry !== "/login") await page.evaluate(() => history.pushState({}, "", "/login?next=/classic"));
          if (kind !== "allowed") {
            await Promise.all([
              page.waitForEvent("console", { predicate: (message) => message.type() === "error" && message.text().includes("form-action"), timeout: 5000 }),
              page.getByRole("button", { name: "Google", exact: true }).click(),
            ]);
            assert.equal(new URL(page.url()).origin, "https://game.invalid");
            assert.ok(!destinations.includes("https://accounts.google.com/fixture"));
            assert.ok(!destinations.includes("https://attacker.invalid/fixture"));
            assert.deepEqual(errors.filter((error) => !error.includes("form-action")), []);
            await context.close();
            continue;
          }
          await Promise.all([
            page.waitForURL("https://accounts.google.com/fixture"),
            page.getByRole("button", { name: "Google", exact: true }).click(),
          ]);
          assert.ok(destinations.includes("https://fixture.supabase.co/auth/v1/authorize"));
          assert.deepEqual(errors, [], `${engine.name()} ${production ? "prod" : "dev"} ${entry}`);
          await context.close();
        }
      }
      console.log(`${engine.name()}: 10 cases passed: old CSP reproduces the block; OAuth works after client navigation; unrelated destinations stay blocked (dev + production).`);
    } finally { await browser.close(); }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
