# Environment Variables

This project uses environment variables only for runtime wiring, service credentials, and local development behavior. Game logic, wheel weights, and career state must never be controlled through environment flags — those belong in domain services.

## Usage

Copy the example file when setting up locally:

```sh
cp .env.example .env.local
```

Do not commit `.env` or `.env.local` files. Commit `.env.example` only, with placeholder values and no real secrets.

Next.js loads environment variables in this order (later overrides earlier):
1. `.env`
2. `.env.local`
3. `.env.development` / `.env.production`
4. `.env.development.local` / `.env.production.local`

---

## Variables

| Key | Scope | Example | Required | Description |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Server only | `postgresql://football_life_runtime.PROJECT_REF:pass@pooler:5432/db` | ✅ Yes | Prisma runtime connection string. With Supabase shared pooler, a custom role username includes the project ref; copy the exact string from Connect. A custom non-owner role is recommended hardening, but the variable itself is required regardless of which approved DB role is currently used. Never expose to the browser. |
| `DIRECT_URL` | Migration runner only | `postgresql://postgres:pass@migration-host:5432/db` | ✅ for Prisma database commands | Supabase migration/admin connection copied from Connect. It may be a direct host or shared session pooler on Free; keep it in CI or a controlled migration runner, never in normal request runtime. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | `https://xyz.supabase.co` | ✅ Yes | Supabase project URL. Safe to expose publicly — prefixed with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | `eyJhbGciOiJIUzI1NiIs...` | ✅ Yes | Supabase anonymous (public) key for client-side auth and queries. Safe to expose — enforced by Supabase Row Level Security (RLS). |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | `http://localhost:3000` | ✅ Yes in production | Canonical app origin used for auth redirects. Use HTTPS in production. |
| `UPSTASH_REDIS_REST_URL` | Server only | `https://example.upstash.io` | ✅ Yes in production | Distributed rate-limit backend. |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | `replace-with-token` | ✅ Yes in production | Secret token for the distributed rate-limit backend. |
| `PG_POOL_MAX` | Server only | `3` | No | Per-instance PostgreSQL pool cap. Code bounds this to 1–10; tune only against measured database capacity. |
| `PGSSL_CA` | Server only | Supabase production CA certificate | No | Optional CA certificate. Use with `sslmode=verify-full` to verify the Supabase server certificate. |
| `PG_SSL_REJECT_UNAUTHORIZED` | Server only | `true` | No | Explicitly enables certificate verification. Requires a trusted CA; prefer `PGSSL_CA` with `sslmode=verify-full`. |
| `LEGACY_CAREER_WRITES` | Server only | `false` | No | Production safety switch. Legacy client-authoritative writes remain disabled unless an explicit migration window enables them. |
| `NODE_ENV` | Tooling / Runtime | `development` | No | Set automatically by Next.js scripts. Do not set manually. Controls build optimizations, logging behavior, and dev overlays. |
| `SEED_DATA_PATH` | Server / Scripts only | `./scripts/data/clubs.json` | No | Optional override for the path to football data seed files. Used by `scripts/seed.ts` only. Leave unset to use the default path. |
| `CI` | Tooling | `true` | No | Signals automated CI execution. Set to `true` in CI pipelines only. Affects Playwright, Vitest, and database migration scripts. |

---

## Scope Rules

- **`NEXT_PUBLIC_` prefix**: Variables with this prefix are bundled into the client-side JavaScript at build time. They are readable by anyone. **Never put secrets here.**
- **Server-only variables**: Variables without `NEXT_PUBLIC_` are only available in Server Components, Server Actions, Route Handlers, and `scripts/`. They are never sent to the browser.
- **Prisma**: `DATABASE_URL` is used by the runtime pool. `DIRECT_URL` is a migration-only Supabase admin connection and is required for Prisma database commands; `prisma.config.ts` refuses to fall back to the runtime role for those commands. Neither may be imported into Client Components.
- **Supabase client instances**: Use `lib/supabase/client.ts` (browser client, uses anon key) and `lib/supabase/server.ts` (server client, uses anon key plus server cookies) — never instantiate Supabase inline in components.
- **Session expiry**: SSR auth cookies are hardened and expire after 7 days unless Supabase supplies a shorter `maxAge`. Production must also configure a finite Supabase JWT/refresh-token lifetime; cookie expiry alone is not an absolute revocation mechanism.
- **Game logic**: Wheel weights, probability modifiers, and career simulation parameters must never be sourced from environment variables. All game truth lives in domain services under `features/` and `lib/wheel-engine/`.

---

## .env.example Template

```env
# ─── Database (Prisma + Supabase PostgreSQL) ───────────────────────────────
DATABASE_URL="postgresql://football_life_runtime.[PROJECT_REF]:[PASSWORD]@[POOLER_HOST]:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://[SUPABASE_ADMIN_USER]:[PASSWORD]@[MIGRATION_HOST]:5432/postgres?sslmode=require"

# ─── Supabase ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="replace-with-supabase-anon-key"

# ─── App ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ─── Rate limiting ──────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL="https://[UPSTASH-DB].upstash.io"
UPSTASH_REDIS_REST_TOKEN="replace-with-upstash-token"
PG_POOL_MAX="3"
LEGACY_CAREER_WRITES="false"

# Optional PostgreSQL TLS verification. Leave empty with sslmode=require,
# or provide the Supabase CA and use sslmode=verify-full.
PGSSL_CA=""
PG_SSL_REJECT_UNAUTHORIZED=""

# ─── Development / scripts only ────────────────────────────────────────────
SEED_DATA_PATH=""
```

---

## Current Code References

- `DATABASE_URL` is read by `lib/prisma.ts` for runtime queries; `DIRECT_URL` is read by `prisma.config.ts` only for Prisma CLI database commands.
- `DIRECT_URL` uses the Supabase migration/admin connection copied from Connect. On Free, that may be the shared session pooler when the direct host is not reachable from the runner. The repository does not transfer table ownership to an application-created migration role.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are read in `lib/supabase/client.ts` to create the browser-side Supabase client.
- `lib/supabase/server.ts` uses the public Supabase URL and anon key only; no service-role key is required by the current source.
- `NEXT_PUBLIC_SITE_URL` is read by server-side auth actions for canonical email redirects.
- `LEGACY_CAREER_WRITES` is read by legacy mutation actions and must stay disabled in production after V2 rollout.
- `SEED_DATA_PATH` is read in `scripts/seed.ts` to locate football data JSON files for database seeding.
