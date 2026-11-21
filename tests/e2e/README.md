# Browser regression

Install and run from the repository root:

```sh
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e
```

The configuration starts the development server on port 3000 when needed.
Use `PLAYWRIGHT_BASE_URL` to target an existing development server. Development
fixture routes are deliberately unavailable in production, so this full suite
must target a development server. Reports, traces and screenshots go under
`output/playwright/` (ignored by Git).

Coverage includes desktop widths 1024/1280/1440/1920, the 1023px boundary,
mobile deep links, no-JavaScript entry, keyboard focus, modal restoration,
hidden portals, long player names, nation colours, card clipping, recoverable
shop errors, transfer callbacks, PvE empty/populated states and retirement.
Quick Mode includes a complete guest career, reload and restart. Its full-run
case supplies deterministic random draws inside the test browser only; production
weight calculations, resolvers and animation completion timing are unchanged.

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
