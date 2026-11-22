import assert from "node:assert/strict";
import { NextRequest } from "next/server";

async function main() {
  const environment = process.env as Record<string, string | undefined>;
  const previous = environment.NODE_ENV;
  environment.NODE_ENV = "production";
  try {
    const { middleware } = await import("../middleware");
    const response = await middleware(new NextRequest("http://localhost/login"));
    const policy = response.headers.get("Content-Security-Policy")!;
    assert.match(policy, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    assert.ok(!policy.split(";").find((part) => part.trim().startsWith("script-src"))!.includes("'unsafe-inline'"));
    assert.ok(!policy.includes("'unsafe-eval'"), "Development eval allowance must never reach production.");
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("Location"), "https://localhost/login");
    assert.ok(response.headers.get("Strict-Transport-Security"));
    const first = await middleware(new NextRequest("https://example.invalid/privacy", { headers: {
      "x-forwarded-proto": "https", "x-nonce": "attacker", "Content-Security-Policy": "script-src *", "x-football-not-found": "1",
    } }));
    const second = await middleware(new NextRequest("https://example.invalid/terms", { headers: { "x-forwarded-proto": "https" } }));
    const nonce = first.headers.get("x-middleware-request-x-nonce");
    assert.match(nonce!, /^[A-Za-z0-9+/]{22}==$/);
    assert.notEqual(nonce, "attacker");
    assert.equal(first.headers.get("x-middleware-request-x-football-not-found"), null);
    assert.notEqual(nonce, second.headers.get("x-middleware-request-x-nonce"));
    assert.equal(first.headers.get("x-middleware-request-content-security-policy"), first.headers.get("Content-Security-Policy"));
    assert.equal(first.headers.get("X-Frame-Options"), "DENY");
    assert.equal(first.headers.get("Cache-Control"), "private, no-store");
    for (const path of ["/missing", "/classic/invalid", "/classic/00000000-0000-4000-8000-000000000001/draft/0.png", "/auth/typo", "/404"]) {
      const missing = await middleware(new NextRequest(`https://example.invalid${path}`, { headers: { "x-forwarded-proto": "https" } }));
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get("x-middleware-request-x-football-not-found"), "1");
      assert.equal(missing.headers.get("x-middleware-rewrite"), "https://example.invalid/404");
      assert.equal(missing.headers.get("X-Frame-Options"), "DENY");
      assert.ok(missing.headers.get("x-middleware-request-content-security-policy"));
      assert.equal(missing.headers.get("Location"), null, "Missing pages must not redirect to login");
    }
    console.log("Production CSP and HTTPS boundary checks passed.");
  } finally {
    if (previous === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = previous;
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
