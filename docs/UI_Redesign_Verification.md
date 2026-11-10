# UI redesign verification

## Scope and source

The existing Graphify graph was queried and source files verified before changes.
The locked design system is `design.md`. Ponytail guided reuse of the existing
AppShell, UI primitives and feature components. Hallmark guided the sports album
identity; Playwright is integrated in the repository.

Warm paper and orange branding remain, with Oswald display and Be Vietnam Pro
body typography, rounded controls and nation-themed player cards. Routes and
authoritative game services, actions, persistence schema and probability logic
have no changes. Wheel rendering honours reduced motion while preserving the
existing completion callback. Modal changes fix mounting-time focus and prevent
hidden portals trapping focus behind the desktop notice.

Below 1024 CSS pixels every route displays the desktop notice. CSS retains the
mounted session during resize; this is a viewport policy, not an auth boundary.

## Evidence

- Full browser run: 25 passed, including a complete guest Quick Mode career.
- Subsequent surface run: 22 passed, including the added retirement callback
  case and the final card/sidebar clipping regressions (26 distinct cases total).
- TypeScript, ESLint and production build passed.
- 19 existing domain checks passed: 18 package check scripts plus PvE engine.
- Hallmark rendered checks: home had zero FAIL/REFLEX; quick/login/draft/transfer
  findings were fixed and login/draft recaptured with zero FAIL/REFLEX.
- Independent finish review found rating-label overlap, squeezed squad action,
  low-contrast nationality text and a shrinking profile card. All four were
  fixed. Card geometry and profile content bounds are browser assertions.

Raw logs and screenshots are in `output/playwright/`. The generated outputs are
ignored; tests and configuration are versionable.

## Hallmark qualifications

The final login/draft sweep retains 23 nonblocking warnings. Static legacy rules
are still scanned even when the identity layer overrides them (button colours,
modal radius/border, ticker animation and state stripes). Disabled-state contrast
warnings concern unavailable controls. Semantic award/player highlights remain.
Numeric display and general container-style suggestions are finish observations.
Phone-content warnings are intentional under the explicit desktop-only policy.
The 470 waived spacing findings preserve existing functional layouts at the
user's request; new identity layers use the documented 4px scale. These are not
reported as a warning-free design audit.

## Limits

No authenticated production career mutation was exercised. The two database
integration scripts were not run without a confirmed isolated test database.
The browser suite currently uses Chromium; Firefox/WebKit and real hardware
were not tested. Passing the recorded checks does not prove absence of every bug.
No deployment was performed.

## Main new files

```text
design.md
playwright.config.ts
components/shared/{DesktopNotice,NationFlag}.tsx
app/styles/foundation/{identity-system,legacy-palette,nation-themes}.css
app/styles/features/identity-{entry,game,career,quick}.css
app/styles/layout/desktop-policy.css
app/dev/design-preview/{page,DesignPreview,fixtures}.tsx
tests/e2e/{helpers,desktop-and-navigation.spec,design-preview.spec,quick-career.spec}.ts
tests/e2e/README.md
```

The fixture module is `fixtures.ts`; all other preview modules are TSX.
Existing feature components and styles were updated in place.
