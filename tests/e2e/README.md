# Browser regression

Landing entrance sequence: `pnpm exec playwright test tests/e2e/landing-entry.spec.ts`.
It holds the hero image to verify no mount or section reveal starts behind the
splash, then checks mount animation events occur after dismissal on both `/`
and `/en`, without replay on section navigation. System/account reduced motion
preserves the default splash hold and skips the entrance motion.

Loading verification: `pnpm exec playwright test tests/e2e/loading-layout.spec.ts`.
It compares Career and Quick placeholder bounds with real populated screens at
1024/1440/1920, verifies pending-image splash release, error recovery, reduced
motion, server-rendered splash coverage before hydration, the requested 800 ms
minimum entrance on ready pages, keyboard dismissal
and the recovery timeout. Development-only previews
are available at `/dev/loading-preview?view=splash`, `career`, `quick`, `records`,
`match` and `setup`; no fixture writes account or career data.

Landing SEO/loading coverage: `pnpm exec tsx tests/landing-seo.test.ts` and
`pnpm exec playwright test tests/e2e/landing-seo.spec.ts`.
Set `NEXT_PUBLIC_SITE_URL` to the canonical public HTTPS origin before starting
the test server. The suite checks server-rendered content without JavaScript,
hero image priority, native lazy images, CSP nonce, VI/EN metadata, crawler files
and noindex on login/game routes. Preview deployments publish noindex and omit
their URLs from the sitemap. Guest landing URLs are `/` (Vietnamese) and `/en`
(English), regardless of the language cookie. Both have self-canonical URLs and
reciprocal `vi`, `en`, `x-default` hreflang links. The sitemap includes only these
indexable landing pages; policy pages retain their existing noindex metadata.
Language links work without JavaScript and save the preference for game routes.
Authenticated `/` continues to show the lobby in the user's preferred language.

Install and run from the repository root:

```sh
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e
```

The configuration starts the development server on port 3000 when needed.
Use `PLAYWRIGHT_BASE_URL` to target an existing development server.
Run only one Next.js development server per checkout: different ports still
share `.next-dev`, which can leave routing or middleware stale. Reuse the
running server with `PLAYWRIGHT_BASE_URL=http://localhost:3000` instead of
starting a second server for browser tests.

Development fixture routes are deliberately unavailable in production, so this full suite
must target a development server. Reports, traces and screenshots go under
`output/playwright/` (ignored by Git).

Coverage includes desktop widths 1024/1280/1440/1920, the 1023px boundary,
mobile deep links, no-JavaScript entry, keyboard focus, modal restoration,
hidden portals, long player names, nation colours, card clipping, recoverable
shop errors, transfer callbacks, PvE empty/populated states and retirement.
Quick Mode includes a complete guest career, reload and restart. Its full-run
case supplies deterministic random draws inside the test browser only; production
weight calculations, resolvers and animation completion timing are unchanged.
`quick-count-ranges.spec.ts` checks Vietnam selection, inclusive count ranges,
the bounded `1000+` bucket, clean-sheet limits and exact-number persistence.
`audio.spec.ts` covers audio settings, lazy downloads, decoded SFX reuse, immutable
headers and progression when audio is unavailable. See `docs/game-audio.md` for
hosting, license provenance, budgets and device checks still needed for release.

Fixtures use synthetic IDs. Shop/transfer/retirement callbacks are local test
callbacks. Tests do not click the real squad completion or player management
mutations. They do not authenticate or write a persistent career to a database.
Authenticated persistence needs a separate isolated test account/database.

Browser console errors and uncaught exceptions fail each page-based test.
Overflow checks include control bounds because root overflow clipping alone
can conceal an off-screen action.

Auth layout regression also checks five desktop viewports down to1280×720:
login, registration, expired-link warning and password-reset entry must fit both
the document and the form panel, with no clipped controls or delayed submit.
Media rails must be transparent, and PvE records must clear the divider by24px.
Shop dialog tests check24px padding and a scrolling catalogue separated from its footer.
`pnpm check:auth-recovery` renders the request and new-password states without
sending emails or changing credentials; live recovery email delivery is not tested.

`classic-scroll.spec.ts` uses `/dev/classic-preview` with the production Classic
shell and isolated six-squad data. It checks the fixed viewport, archive-only
keyboard scrolling, the last row and stationary active card/art at four sizes.

`career-workspace.spec.ts` checks the real career stage with one/20club fixtures,
four-size viewport fill, independent club history, complete sticker attributes,
wider league/cup dialogs, stationary recap artwork and offer/search list regions.
The transfer preview now uses the same AppShell as the protected transfer route.
Fixture buttons only exercise local callbacks; no test account is mutated.

`pnpm check:onboarding` checks guide configuration, bilingual copy, production
anchor coverage and browser-storage fallback. `onboarding.spec.ts` exercises
first-run discovery, skip, on-demand reading modals, all guide contexts, free page interaction,
keyboard/focus, missing anchors, busy/dialog/navigation cancellation, reduced
motion, blocked storage and desktop bounds. `/dev/onboarding` is isolated and
is blocked by production dev-route middleware and its own not-found guard; it
never writes account or career data.

`trophy-cabinet.spec.ts` uses `/dev/trophy-cabinet` (development only) with
empty, two-honour and long-career fixtures. It checks loaded artwork, category
counts, keyboard tabs, close/focus restoration, English copy and independent
record scrolling with visible tabs/footer at 1024×600, 1280×800 and 1920×1080.
These fixtures never read or mutate player accounts.

`pnpm check:not-found` verifies route classification, canonical IDs/slots,
real page/handler coverage and middleware 404 responses without provider calls.
`not-found.spec.ts` checks preserved URLs, HTTP 404, noindex, localized titles,
language refresh/reload, protected-route login redirects, no-JavaScript recovery,
keyboard focus and five viewport sizes (375–1920px). It runs against development
or a production server; production loopback uses `RTG_PRODUCTION_CHECK=1` as
described below. Screenshots go to `output/playwright/not-found-*.png`.

`security-remediation.spec.ts` targets a **production build** separately from
the development fixture suite. Start that build on isolated loopback, then run:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
$env:RTG_PRODUCTION_CHECK = "1"
pnpm exec playwright test tests/e2e/security-remediation.spec.ts
```

The header flag models the trusted HTTPS reverse proxy for this local check;
do not point this fixture suite at production. Coverage includes nonce CSP,
blocked script/handler execution, iframe denial, alternate route suffixes,
static asset headers and a literal HTML-like player name through guest gameplay.
Use dummy Supabase settings, no database credentials, an empty allowlisted
environment and OS isolation with no external network. `pnpm
check:security-remediation` runs the policy, middleware, limiter and TLS checks;
its real TLS handshakes use only local dummy certificates.

`settings-redesign.spec.ts` covers Draft's live label and visible spin action at
1024×600, compact Career/Transfer headers, keyboard-accessible horizontal audio
controls, combined Profile/Audio/Language settings, and Floating Cities → Cipher
selection when Quick Mode leaves Draft. The account/settings, audio, header
language, onboarding and career workspace suites provide the related regressions.
These fixtures do not sign in or mutate real accounts.
