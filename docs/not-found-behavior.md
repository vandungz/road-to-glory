# 404 recovery

The shared `app/not-found.tsx` screen follows the existing paper/Oswald system,
reuses the heritage artwork and provides Home, language and policy links.
It works at mobile widths and with JavaScript disabled. It has no timers,
automatic redirects or game-state mutations.

## Routing

- `lib/app-routes.ts` classifies real public/protected routes. Unknown URLs and
  malformed game IDs/slots are rewritten internally to `/404` with HTTP 404.
  The address bar stays unchanged. These requests skip Supabase and Prisma.
- `/404` renders the screen directly rather than throwing `notFound()` inside
  a streaming boundary. This keeps the initial HTML usable without JavaScript.
- Middleware supplies an internal metadata marker and strips caller-supplied
  copies. The root metadata supplies the localized title and `noindex`.
  CSP, nonce forwarding, frame denial and no-store headers remain enabled.
- Eight game pages validate PostgreSQL UUID syntax before provider/database
  work. Canonical slots stay restricted to 0–10. Server ownership/resource
  checks remain in place; missing or inaccessible records still use `notFound()`.
- Existing valid protected routes still redirect anonymous visitors to login.
  Production dev routes keep their existing redirect; private resources are
  never queried from middleware merely to decide the error status.

Next cannot change headers after a loading response has streamed. Consequently,
a valid-looking authenticated URL whose record is later found to be missing
can still use Next's streamed 200 + `noindex` fallback. This change guarantees
an early HTTP 404 for unknown/malformed paths; it does not remove gameplay
loading boundaries or add duplicate database preflight queries.
See [Next's streaming status semantics](https://nextjs.org/docs/app/api-reference/file-conventions/loading#status-codes).

## Configuration and checks

When adding a page or handler, update `lib/app-routes.ts`; the filesystem
inventory test fails if a real application route is omitted. Keep business
authorization in server pages/actions, not in this inventory.
Copy lives in `i18n/messages/{vi,en}.json` under `notFound`.

```powershell
pnpm check:not-found
pnpm check:security-remediation
pnpm build
```

`tests/e2e/not-found.spec.ts` covers HTTP status, preserved URL, title/noindex,
locale refresh/reload, Home navigation, protected-route redirects, focus,
reduced motion, five widths and no-JavaScript recovery. Run it against a local
server with dummy provider settings. Production loopback requires
`RTG_PRODUCTION_CHECK=1` and `PLAYWRIGHT_BASE_URL`, as documented in the E2E README.

Hallmark source/render checks and an independent finish review were performed.
Its capture tool refuses HTTP 404, so a disposable loopback bridge changed
only the capture response status to 200. Product HTTP behavior was tested
separately against the real server. No bridge or special preview route is
shipped. Screenshots live in ignored `.hallmark/shots` and `output/playwright`.

Final verification on 22/11/2026: production build (including TypeScript/lint),
route/middleware checks, all four security regression programs and **13/13
production browser cases** passed (8 recovery cases + 5 security cases).
The production run used a secret-free, offline OS sandbox and dummy provider
settings. Its loopback hostname was aligned with Next's `localhost`
normalization so rewrites resolve internally, as they do on the public origin.
No live user record, OAuth flow or deployment was changed/tested for this task.

Added files:

```text
app/404/page.tsx
app/styles/features/not-found.css
lib/app-routes.ts
tests/not-found.test.ts
tests/e2e/not-found.spec.ts
docs/not-found-behavior.md
```

The existing not-found screen, root layout, middleware, eight game pages,
desktop gate, catalogs, shared route parameters and test documentation were
updated. No installation step or new dependency is needed for this task.
