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
| `DATABASE_URL` | Server only | `postgresql://user:pass@host:5432/db` | ✅ Yes | Primary Prisma database connection string. Points to Supabase PostgreSQL. Never expose to the browser. |
| `DIRECT_URL` | Server only | `postgresql://user:pass@host:5432/db` | ✅ Yes | Direct (non-pooled) connection URL for Prisma migrations. Required when using Supabase connection pooler via `DATABASE_URL`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | `https://xyz.supabase.co` | ✅ Yes | Supabase project URL. Safe to expose publicly — prefixed with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | `eyJhbGciOiJIUzI1NiIs...` | ✅ Yes | Supabase anonymous (public) key for client-side auth and queries. Safe to expose — enforced by Supabase Row Level Security (RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `eyJhbGciOiJIUzI1NiIs...` | ✅ Yes | Supabase service role key for admin operations (bypasses RLS). Must never be exposed to the client. Used only in Server Actions and Route Handlers. |
| `SUPABASE_JWT_SECRET` | Server only | `your-jwt-secret` | ✅ Yes | JWT secret for verifying Supabase auth tokens server-side. Keep secret. |
| `NEXT_PUBLIC_APP_URL` | Client + Server | `http://localhost:3000` | ✅ Yes | Base URL of the app. Used for auth redirects, OG metadata, and canonical URLs. In production, set to the deployed Vercel URL. |
| `NEXTAUTH_SECRET` | Server only | `random-32-char-string` | ✅ Yes | Secret used to encrypt Next.js auth session tokens. Generate with `openssl rand -base64 32`. |
| `NODE_ENV` | Tooling / Runtime | `development` | No | Set automatically by Next.js scripts. Do not set manually. Controls build optimizations, logging behavior, and dev overlays. |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | Client | `true` | No | Enables in-app developer overlay (wheel weight inspector, career state logger) during development. Set to `false` or leave unset in production. Must never expose internal game weights to users in production. |
| `SEED_DATA_PATH` | Server / Scripts only | `./scripts/data/clubs.json` | No | Optional override for the path to football data seed files. Used by `scripts/seed.ts` only. Leave unset to use the default path. |
| `CI` | Tooling | `true` | No | Signals automated CI execution. Set to `true` in CI pipelines only. Affects Playwright, Vitest, and database migration scripts. |

---

## Scope Rules

- **`NEXT_PUBLIC_` prefix**: Variables with this prefix are bundled into the client-side JavaScript at build time. They are readable by anyone. **Never put secrets here.**
- **Server-only variables**: Variables without `NEXT_PUBLIC_` are only available in Server Components, Server Actions, Route Handlers, and `scripts/`. They are never sent to the browser.
- **Prisma**: `DATABASE_URL` and `DIRECT_URL` must only be used inside `lib/prisma.ts` and `scripts/`. Never import Prisma in Client Components.
- **Supabase client instances**: Use `lib/supabase/client.ts` (browser client, uses anon key) and `lib/supabase/server.ts` (server client, uses service role key) — never instantiate Supabase inline in components.
- **Game logic**: Wheel weights, probability modifiers, and career simulation parameters must never be sourced from environment variables. All game truth lives in domain services under `features/` and `lib/wheel-engine/`.

---

## .env.example Template

```env
# ─── Database (Prisma + Supabase PostgreSQL) ───────────────────────────────
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# ─── Supabase ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"

# ─── App ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32-output"

# ─── Development Only ───────────────────────────────────────────────────────
NEXT_PUBLIC_ENABLE_DEV_TOOLS="true"
SEED_DATA_PATH=""
```

---

## Current Code References

- `DATABASE_URL` and `DIRECT_URL` are read by `prisma/schema.prisma` to configure the datasource.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are read in `lib/supabase/client.ts` to create the browser-side Supabase client.
- `SUPABASE_SERVICE_ROLE_KEY` is read in `lib/supabase/server.ts` to create the server-side admin Supabase client.
- `NEXT_PUBLIC_APP_URL` is read in `app/layout.tsx` for metadata and in auth redirect callbacks.
- `NEXT_PUBLIC_ENABLE_DEV_TOOLS` is read in `components/shared/DevToolsOverlay.tsx` to gate the developer panel.
- `SEED_DATA_PATH` is read in `scripts/seed.ts` to locate football data JSON files for database seeding.
