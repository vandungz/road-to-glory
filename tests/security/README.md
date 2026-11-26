# Audit regression fixtures

Status: prepared and source-reviewed; **NOT RUN** in audit run-3. No claim of
passing tests, provider authorization, real PostgreSQL isolation or load capacity.

Run only after an OS-enforced audit sandbox is verified: no external network,
empty allowlisted environment, source/toolchain read-only, writes only to bounded
scratch, explicit CPU/memory/process/file/disk/wall limits. Hide `.env`, real
credentials, host home, sockets and shared services. Stubs are not confinement.

| Fixture | What it checks | What it cannot establish |
| --- | --- | --- |
| `auth-authorization.test.ts` | Actual guards with dummy identities: guest, foreign/missing game/player, owner success, provider error | Every action's authorization, real Supabase, RLS or database grants |
| `login-failure-budget.test.ts` | Actual login action ordering with quota/provider stubs; sixth failed attempt must not reach provider | Redis behavior, real provider throttling, account compromise |
| `load-local.test.mjs` | Rejects unsafe configuration before requests; a disposable loopback dummy peer checks that status/body failures count only once | Real application behavior or performance |

The login fixture expresses the desired five-failure contract. It is expected to
fail against the audited source because the failure check follows provider access.
That expectation is source analysis, **not an observed failed test**. A future fix
may need to update the stub interface to match its preflight API.

## Commands for the approved sandbox only

From the repository root, using already-present dependencies:

```text
pnpm exec tsx --tsconfig tests/tsconfig.json tests/security/auth-authorization.test.ts
pnpm exec tsx --tsconfig tests/tsconfig.json tests/security/login-failure-budget.test.ts
node --test tests/security/load-local.test.mjs
```

Also reuse existing `check:security-remediation`, `check:career-setup-security`,
`check:security-boundaries`, `check:checkpoint-contract` and transfer workflow
checks after reading their implementations. Do not infer execution safety from
the command name. Several scripts import `dotenv/config`.

## Database validation still required

- Run actual owner A/B and guest requests against a disposable local database/auth
  fixture; verify no foreign state is returned or changed, including retry paths.
- For shop, hold two real transactions after selecting revision `r`. Supply
  expected revisions `r` and `r+1` with distinct keys. Commit the first before
  allowing the second to reserve a revision. The second must reject the stale
  snapshot. Verify balance, ledger, inventory, event and command counts for
  single-item, all-items and mixed cases. Mocks do not prove PostgreSQL behavior.
- For renewal, reject one deterministic attempt, then submit lower/standard/higher
  variants. If the documented once-per-season rule is authoritative, ignored
  variants must replay/reject instead of producing new logical decisions.
- Test rollback after partial failures and transport loss after commit. Retry
  must return the committed result without crediting income or awards twice.
- Verify RLS/grants with real dummy roles on an isolated database. Runtime policy
  is intentionally not per-user; application ownership remains mandatory.

`scripts/career-persistence-integration-check.ts` explicitly selects
`CAREER_TEST_DATABASE_URL`, but still requires a disposable isolated database.
`scripts/awards-persistence-integration-check.ts` currently imports Prisma before
an explicit test-database gate. **Do not run it with ambient `.env`**. Its planned
rollback does not make access to a shared database safe.

No existing production configuration, schema, gameplay logic or dependency was
changed by these fixtures.
