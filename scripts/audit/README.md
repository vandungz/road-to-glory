# Controlled local route sampler

`load-local.mjs` is a dependency-free, anonymous HTTP route sampler. It is
prepared and **NOT RUN**. It does not implement authenticated career/transfer/
shop/PvE journeys and cannot establish 200-user production capacity.

It accepts only numeric-loopback HTTP origins, follows no redirects, sends no
credentials, caps users at 200, duration at 600 seconds, response size at two MiB
and requires at least three seconds think time. It stops after at least 20
completed requests if the aggregate failure rate exceeds five percent. HTTP
status failure and response-body failure count as one failed request.

The limits and opt-in are safeguards, not an OS sandbox. Before execution:

1. Start a disposable production build in a verified no-external-network sandbox.
   Do not reuse an existing unknown localhost service. Hide `.env` and all real
   credentials; Supabase/Redis must be local disposable fixtures or explicit stubs.
   A direct HTTP production build can redirect to HTTPS: its isolated fixture
   must supply the expected trusted forwarded protocol through a local proxy.
   The sampler does not follow redirects or prove real ingress/TLS behavior.
2. Approve the load, duration, CPU/memory/process/disk budgets and stop conditions.
   Bound the generator as well as the server. Dependencies must already be present.
3. Use an empty allowlisted environment. Set `AUDIT_ALLOW_LOCAL_LOAD` to
   `ISOLATED_LOOPBACK_ONLY`, `AUDIT_BASE_URL` to the fixture origin, and choose
   `AUDIT_USERS`, `AUDIT_SECONDS`, `AUDIT_THINK_MS`, `AUDIT_TIMEOUT_MS` within caps.
4. Invoke `node scripts/audit/load-local.mjs` inside that sandbox. Capture stdout
   only to approved scratch, then use trusted bounded no-follow artifact promotion.

## Interpretation

The JSON output reports completed requests, throughput, status counts, aggregate
latency p50/p95/p99, bytes and error rate. Latencies include failures and combine
four routes; they are a smoke baseline, not per-command SLO evidence. VU sessions
wait after each response, so 200 users is not 200 requests/second. Slow responses
reduce achieved request rate; report achieved throughput alongside latency.

Suggested separate approved samples: 1, 10, 25, 50, 100, 150 and 200 users. Never
advance automatically after a failed sample. The script is capped at ten minutes
per invocation; it is not a complete 30-minute steady-state/soak orchestrator.

## Remaining authenticated capacity work

Use distinct dummy users/careers and the actual UI/Server Action transport, with
valid current revisions and idempotency keys; do not replay captured stale action
requests or bypass identity/rate limits. Include background action calls in the
30-actions/minute/user budget. Suggested mix: 120 career, 40 transfer/shop,
20 history/squad and 20 PvE. Measure each command and semantic outcome, not only
HTTP status. Add database pool/lock/query and runtime resource observations.

Actual Supabase/Vercel Free limits, regions and budgets are unknown. Owner evidence
and an explicitly approved dedicated environment are prerequisites to cloud tests.
Do not direct this sampler at production or infer cloud capacity from a local run.
