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
    assert.ok(policy.includes("script-src 'self' 'unsafe-inline'"));
    assert.ok(!policy.includes("'unsafe-eval'"), "Development eval allowance must never reach production.");
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("Location"), "https://localhost/login");
    assert.ok(response.headers.get("Strict-Transport-Security"));
    console.log("Production CSP and HTTPS boundary checks passed.");
  } finally {
    if (previous === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = previous;
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
