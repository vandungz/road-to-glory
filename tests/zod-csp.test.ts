import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve("tests/zod-csp.test.ts"));
const originalFunction = globalThis.Function;
let attempts = 0;
globalThis.Function = new Proxy(originalFunction, {
  apply() { attempts++; throw new EvalError("CSP forbids eval"); },
  construct() { attempts++; throw new EvalError("CSP forbids eval"); },
});
try {
  // This schema is imported by entry pages before the career contracts.
  load("../types/game");
  const { z } = load("../lib/validation/zod") as typeof import("../lib/validation/zod");
  assert.equal(z.config().jitless, true);
  const schema = z.object({ email: z.email(), count: z.number().int().positive() }).strict();
  assert.equal(schema.safeParse({ email: "fixture@example.invalid", count: 1 }).success, true);
  assert.equal(schema.safeParse({ email: "invalid", count: -1 }).success, false);
  assert.equal(schema.safeParse({ email: "fixture@example.invalid", count: 1, admin: true }).success, false);
  // Client-reachable contracts must construct safely before any React effects run.
  load("../features/career/contracts/checkpoint.contract");
  load("../features/career/contracts/career-command.contract");
  assert.equal(attempts, 0, "Schema creation and parsing must never probe Function under CSP");
  console.log("Zod CSP passed: no Function calls; validation and client contracts remain strict.");
} finally {
  globalThis.Function = originalFunction;
}
