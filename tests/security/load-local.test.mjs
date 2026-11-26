import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";

// Execute only in the same OS audit sandbox as the other tests.
// Rejected configurations must exit before any request or provider access.
const runner = resolve("scripts/audit/load-local.mjs");
const cases = [
  { name: "missing explicit opt-in", environment: {}, message: /Set AUDIT_ALLOW_LOCAL_LOAD/ },
  { name: "remote target", environment: { AUDIT_BASE_URL: "https://example.invalid" }, message: /Only a numeric loopback/ },
  { name: "credentials", environment: { AUDIT_BASE_URL: "http://user:dummy@127.0.0.1:3000" }, message: /Only a numeric loopback/ },
  { name: "localhost DNS", environment: { AUDIT_BASE_URL: "http://localhost:3000" }, message: /Only a numeric loopback/ },
  { name: "too many users", environment: { AUDIT_USERS: "201" }, message: /Out of range AUDIT_USERS/ },
  { name: "excess duration", environment: { AUDIT_SECONDS: "601" }, message: /Out of range AUDIT_SECONDS/ },
  { name: "unpaced load", environment: { AUDIT_THINK_MS: "0" }, message: /Out of range AUDIT_THINK_MS/ },
];

for (const fixture of cases) {
  test(`load sampler rejects ${fixture.name}`, () => {
    const result = spawnSync(process.execPath, [runner], {
      env: {
        ...(fixture.name === "missing explicit opt-in" ? {} : { AUDIT_ALLOW_LOCAL_LOAD: "ISOLATED_LOOPBACK_ONLY" }),
        ...fixture.environment,
      },
      timeout: 5000,
      maxBuffer: 64 * 1024,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, fixture.message);
    assert.equal(result.stdout, "", "Rejected input must not produce a load report");
  });
}

test("a status failure plus oversized body counts as one failed request", { timeout: 12000 }, async () => {
  // Disposable dummy peer only; no application, credentials or provider calls.
  const server = createServer((_request, response) => {
    response.writeHead(503);
    response.end(Buffer.alloc(2 * 1024 * 1024 + 1));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const output = await new Promise((resolve, reject) => {
      execFile(process.execPath, [runner], {
        env: {
          AUDIT_ALLOW_LOCAL_LOAD: "ISOLATED_LOOPBACK_ONLY",
          AUDIT_BASE_URL: `http://127.0.0.1:${address.port}`,
          AUDIT_USERS: "1", AUDIT_SECONDS: "5", AUDIT_THINK_MS: "3000", AUDIT_TIMEOUT_MS: "1000",
        },
        timeout: 8000, maxBuffer: 64 * 1024, encoding: "utf8", windowsHide: true,
      }, (error, stdout, stderr) => {
        if (!error || error.code !== 1) return reject(error ?? new Error("Failed fixture must exit nonzero"));
        if (stderr) return reject(new Error(stderr));
        resolve(stdout);
      });
    });
    const report = JSON.parse(output);
    assert.ok(report.requests > 0);
    assert.equal(report.errors, report.requests);
    assert.equal(report.errorRate, 1);
    assert.equal(report.authenticatedGameplayTested, false);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
