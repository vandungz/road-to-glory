# Security remediation — 22/11/2026

## Scope and release status

Focused remediation of the previous source-review leads: dependency advisory,
HTML route/header coverage, rate-limit timeout handling and database TLS.
CSP additionally restricts executable scripts. This is not a claim that the
entire application has no vulnerabilities, or that a deployed exploit was reproduced.

**Production runtime acceptance still requires deployment verification.**
No commit, push, deployment, account mutation or database schema change was made
by this verification. The source changes still need the owner's release workflow.

## Changes

- Next.js 15.5.29, React/React DOM 19.1.10 and matching Next ESLint config;
  lockfile updated. The vendor's Server Actions DoS advisory affects the old
  Next version; no availability attack was executed.
- Production uses Next 15's default Webpack builder. Turbopack output emitted
  a parser-inserted loading-boundary AppShell chunk without a nonce. The
  missing nonce also occurs inside Next's precompiled production renderer;
  this release uses the verified Webpack path instead of maintaining patches
  to minified vendor runtimes. CSP and loading UX remain unchanged. Development
  still uses Turbopack; retain the production regression on future upgrades.
- Production documents receive a fresh nonce, forwarded to Next's renderer,
  with `strict-dynamic` and no script `unsafe-inline`/`unsafe-eval`.
  Documents render per request and are not shared-cacheable. Inline styles
  remain allowed for existing Motion and layout attributes.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` cover documents and
  static responses. HTML paths ending in image suffixes no longer skip
  middleware. Five slot pages accept only canonical integers 0–10.
- Gameplay writes reject rate-limit timeouts, including the SDK's
  `success: true, reason: timeout` response. Provider errors fail closed.
- PostgreSQL runtime verifies certificate chains and hostnames. URL options
  cannot override TLS or load certificate files. Plaintext is restricted to
  explicitly configured loopback development/test databases.
- The public Supabase Root 2021 CA is bundled only for hosts ending in
  `.pooler.supabase.com`. `PGSSL_CA` overrides it for certificate rotation or
  other configurations; unrelated hosts use Node's normal roots. No password,
  private key or project-specific credential is bundled.

## Verification environment

Target-controlled execution uses Ubuntu WSL with Bubblewrap: no external
network, fresh loopback namespace, empty allowlisted environment with dummy
values, read-only tools/dependencies/source input and disposable writable
scratch. No production credentials enter the test process.
Resource limits include 4 GiB memory, zero swap, two CPU cores, 512 tasks,
bounded files/scratch and wall time. Google Fonts are replaced by a local
font fixture for offline build validation only; product assets are unchanged.

Passed: `pnpm check:security-remediation` (four test programs),
`tsc --noEmit`, ESLint and the actual `prisma generate && next build` production
sequence with lint/type checks enabled. Dependency installation passed with a
frozen lockfile, cached packages and lifecycle scripts disabled in isolation.
Turbopack compiled but failed browser nonce compatibility, prompting the
production builder change.
The TLS tests include real local handshakes: trusted CA accepted, unrelated CA
and wrong hostname rejected. Limiter tests exercise the actual create-session
action with fake persistence and verify zero writes when protection fails.
All five `tests/e2e/security-remediation.spec.ts` browser cases passed against
the final Webpack production server: fresh document nonces and hydration,
parser-inserted script/handler rejection, protected suffix/static headers,
actual iframe denial and literal player-name HTML through reload, wheel spin
and language change. An initial CDP-injected script fixture was replaced:
CDP is a trusted initiator under `strict-dynamic` and does not model attacker
markup. No policy exception was added to make the tests pass.

All 31 Webpack client-reference manifests were inspected as text: none contains
`entryJSFiles`. Next's affected helper therefore emits no script tags for
Webpack boundaries across these routes; this is not just one sampled chunk
being deduplicated. No vendor dependency patch remains in the project.
Build emits a nonfatal Supabase SDK `process.version` Edge compatibility
warning; deployed authenticated/OAuth flows still need acceptance testing.

An earlier isolated regression pass also passed 21 existing pure domain/auth
check commands, covering setup/security boundaries, auth recovery, transfer,
shop, checkpoint/season, competition journeys, awards, honours and summaries.
DB-backed integration tests and real account/email/OAuth flows were not run.

## Supabase observations (read-only)

Project `road-to-glory` (`cknowgqfwbppxgexwfgh`) is active and healthy.
Health advisor returned no notices. Metadata checks on 16 relevant tables
showed RLS enabled, owner `postgres`, and no SELECT/INSERT for `anon` or
SELECT/UPDATE for `authenticated`. This does not replace server-side ownership
checks or prove every database object was audited.

`football_life_runtime` exists without superuser, create-role, create-database
or bypass-RLS privileges. The deployed connection's use of that role has not
been verified; role existence alone does not prove runtime least privilege.

Security advisor notices:

- `_prisma_migrations` has RLS without policies and no public grants. It is an
  internal table; adding a public policy to clear this notice is inappropriate.
- Leaked-password protection is disabled. Supabase documents this feature as
  Pro-plan and above; no paid feature or plan upgrade was enabled.

## TLS verification and outstanding infrastructure gates

The configured local Supabase pooler failed a credential-free TLS handshake
with `SELF_SIGNED_CERT_IN_CHAIN` using Node's default roots. The CA URL was then
verified from the official Studio source's `ssl:certificate_url` configuration,
and the public production certificate downloaded over verified HTTPS. A fresh
probe to the same configured pooler with that CA **passed certificate/hostname
verification using TLS 1.3**. No database login or SQL was sent in either probe.

Bundled certificate SHA-256 fingerprint:
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
It expires 26/04/2031. Tests check the fingerprint, CA flag, expiry, scoped host
matching and explicit override. Recheck the official source on rotation.

For the current pooler, the source now supplies that trusted public CA without
a new environment variable. An existing explicit `PGSSL_CA` still takes
precedence and must be valid. The deployed URL/override configuration cannot
be inferred from the local probe. Check an authenticated, read-only application
page after deployment and verify the runtime role and provider logs.

Owner steps if a deployment uses a different CA or needs a rotation:

1. Open the project's Database settings in the Supabase Dashboard and use
   **Download certificate** under SSL Configuration. This is a public CA
   certificate, not the database password or a private key.
2. In Vercel → the Road to Glory project → Settings → Environment Variables,
   create/update `PGSSL_CA` with the complete PEM text, including its
   `BEGIN CERTIFICATE`/`END CERTIFICATE` lines and actual line breaks, for
   Production and any Preview environment using this database.
3. Remove an explicit `PG_SSL_REJECT_UNAUTHORIZED=false` value if present;
   keep `true` or leave that compatibility variable unset. Never disable
   verification to work around a certificate error.
4. Make the certificate available for a credential-free verified handshake
   before committing/pushing to a branch that deploys automatically. Saving
   environment variables does not update an already-running deployment.

Supabase plugin access works. Plugin discovery reports Vercel installed and
enabled, but Vercel tools are not exposed to this session and `vercel whoami`
reports logged out. Consequently no Vercel environment update, deployment
inspection or production runtime verification is claimed.

## Primary references

- [Next.js advisory GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)
- [Next.js 15 nonce CSP](https://nextjs.org/docs/15/app/guides/content-security-policy)
- [Upstash timeout semantics](https://upstash.com/docs/redis/sdks/ratelimit-ts/features)
- [Supabase verified TLS and dashboard CA](https://supabase.com/docs/guides/platform/ssl-enforcement)
- [Official Studio CA download configuration](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json)
- [Supabase password protection availability](https://supabase.com/docs/guides/auth/password-security)

## Added files and local setup

```text
lib/
  database-connection.ts
  route-params.ts
  security/
    headers.ts
    supabase-ca.ts
tests/
  database-tls.test.ts
  security-policy.test.ts
  security-runtime.test.ts
  fixtures/dummy-tls.json
  e2e/security-remediation.spec.ts
docs/security-remediation-2026-11-22.md
```

Existing middleware, configuration, root layout, five slot pages, dependencies,
middleware tests and operational docs were updated. No new dependency was added.
After checkout, synchronize the pinned dependency upgrades with
`pnpm install --frozen-lockfile`; `pnpm build` now selects production Webpack.
