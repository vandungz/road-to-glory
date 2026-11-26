import { performance } from "node:perf_hooks";

// Read-only HTTP route sampler, not an authenticated gameplay capacity test.
// OS network/filesystem/resource confinement remains mandatory outside this CLI.
function integer(name, fallback, min, max) {
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(value)) throw new Error(`Invalid ${name}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`Out of range ${name}`);
  return number;
}

async function main() {
  if (process.env.AUDIT_ALLOW_LOCAL_LOAD !== "ISOLATED_LOOPBACK_ONLY") {
    throw new Error("Set AUDIT_ALLOW_LOCAL_LOAD only after approving an isolated local target and resource budget.");
  }
  const target = new URL(process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000");
  if (!['127.0.0.1', '[::1]'].includes(target.hostname) || target.protocol !== "http:"
      || target.username || target.password || target.pathname !== "/" || target.search || target.hash) {
    throw new Error("Only a numeric loopback HTTP origin is allowed; no remote targets, paths or credentials.");
  }
  const users = integer("AUDIT_USERS", 10, 1, 200);
  const seconds = integer("AUDIT_SECONDS", 30, 5, 600);
  const thinkMs = integer("AUDIT_THINK_MS", 5000, 3000, 60000);
  const timeoutMs = integer("AUDIT_TIMEOUT_MS", 5000, 100, 15000);
  const paths = ["/", "/quick", "/privacy", "/terms"];
  const start = performance.now();
  const deadline = start + seconds * 1000;
  const elapsed = [];
  const statusCounts = {};
  let errors = 0;
  let bytes = 0;
  let stopped = false;
  let stopReason = null;
  const stop = (reason) => { stopped = true; stopReason ??= reason; };
  const interrupt = () => stop("operator_interrupt");
  process.once("SIGINT", interrupt);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function virtualUser(index) {
    // Stagger starts to avoid turning the normal workload into a synchronized spike.
    await wait(Math.floor(index * Math.min(thinkMs, 1000) / users));
    let step = index;
    while (!stopped && performance.now() < deadline) {
      const began = performance.now();
      let failed = false;
      try {
        const response = await fetch(new URL(paths[step++ % paths.length], target), {
          redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
          headers: { "user-agent": "Football-Life-local-audit/1.0" },
        });
        statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
        if (response.status !== 200) failed = true;
        const reader = response.body?.getReader();
        let received = 0;
        while (reader) {
          const chunk = await reader.read();
          if (chunk.done) break;
          received += chunk.value.byteLength;
          if (received > 2 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("Response exceeded two MiB safety cap");
          }
        }
        bytes += received;
      } catch {
        failed = true;
      }
      if (failed) errors++;
      elapsed.push(performance.now() - began);
      if (elapsed.length >= 20 && errors / elapsed.length > 0.05) stop("error_rate_over_five_percent");
      if (!stopped) await wait(Math.max(0, Math.min(thinkMs, deadline - performance.now())));
    }
  }
  try { await Promise.all(Array.from({ length: users }, (_, index) => virtualUser(index))); }
  finally { process.removeListener("SIGINT", interrupt); }
  const durationSeconds = (performance.now() - start) / 1000;
  elapsed.sort((a, b) => a - b);
  const percentile = (fraction) => elapsed.length ? elapsed[Math.max(0, Math.ceil(elapsed.length * fraction) - 1)] : null;
  console.log(JSON.stringify({
    scope: "anonymous-loopback-route-sample-only", users, thinkMs, durationSeconds,
    requests: elapsed.length, requestsPerSecond: elapsed.length / durationSeconds,
    errors, errorRate: elapsed.length ? errors / elapsed.length : null, statusCounts, bytes,
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
    stopped, stopReason, authenticatedGameplayTested: false, providerCapacityTested: false,
  }, null, 2));
  if (errors || stopped || !elapsed.length) process.exitCode = 1;
}

void main().catch((error) => { console.error(error.message); process.exitCode = 1; });
