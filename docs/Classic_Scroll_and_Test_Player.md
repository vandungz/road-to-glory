# Classic scroll and late-career fixture

## Classic

The page fits the desktop viewport. Header, active squad, archive heading,
artwork and footer stay stationary; only the other-squad rows scroll. The rows
form a labeled, keyboard-focusable region. Existing selection, ordering and links
are unchanged. Styles are scoped to the Classic shell.

New verification files:

```text
app/dev/classic-preview/page.tsx
tests/e2e/classic-scroll.spec.ts
docs/Classic_Scroll_and_Test_Player.md
```

No dependencies added. The preview is unavailable in production and uses isolated
six-squad data with the same shell and components as the real page.

Validation:21 targeted E2E tests pass, including desktop/mobile navigation,
media layouts and Classic scrolling at1024×768,1280×720,1440×900,1920×1080.
Keyboard End/focus reveals the final row without moving the page, active squad
or artwork. ESLint, TypeScript and production build pass.

Independent Hallmark finish review:ship. Raw rendered scanner reports gate73
against text outside the archive viewport. Reviewed as a false positive: its
Range/elementFromPoint check does not intersect scrolling ancestors. Real rows
are clipped by overflow:auto above the footer; screenshots and E2E bounds confirm
no painted overlap. The scanner and data were not changed to silence it.
Logs/screenshots: `output/playwright/classic-*`.

## Requested test player

Created `Touranne Test` in the requested account's `The Touranne` squad:
ST, slot9, England, Brighton & Hove Albion, OVR75, current age35, retire age36.
The authoritative season-start service initialized the age35 season at
`standing`; owner-scoped progress query verified its resumable state.

This is an explicit test fixture placed near retirement, not a simulation of
the preceding17 seasons. Fixture creation is recorded in the career event log.
The squad previously had no player records but was marked completed with a
cached rating. Creation asserted that it was still empty inside a transaction,
inserted one player, reopened that squad and cleared its stale cached rating.
No existing player or other squad was updated.

The before-state backup and resulting identifiers are kept locally under ignored
`output/playwright/touranne-before.json` and `touranne-test-player.json`.
No account login or password was created, and no schema/game-service code changed.
