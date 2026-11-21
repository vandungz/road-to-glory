# Career workspace revision

## Changed presentation

- Competition result dialogs are880px wide, with a result/statistics summary
  beside the league table or cup journey. Future media can use the summary
  column without narrowing the records. Existing results and continue actions
  are preserved; no placeholder media was added.
- The active career removes the five-stage strip and fills the viewport below
  its header. Short and long club histories use the same column height. Club
  rows scroll separately; peakOVR/honours have16px top padding.
- The dossier scrolls internally and its player sticker cannot shrink and hide
  the six attributes. A review-found1280×720 regression has a dedicated assertion.
- Season recap keeps the illustration contained and stationary; only its right
  information column scrolls. Header/footer controls stay visible.
- Transfer keeps its page frame, tabs, filters and decisions available. Offer
  and search results scroll internally. Flat, aligned club rows replace the
  large decorated cards; fee, wage, term and appearances can be compared. Search
  uses one input border, and short viewports retain useful list height.

Game services, wheel resolution, persistence contracts, route destinations and
mutation callbacks were not changed. Colours, fonts and supplied art are retained.

## Verification

- Earlier full regression:39 Chromium E2E cases passed, including the full guest
  career/reload/restart. Final authenticated follow-up:6/6 cases pass.
- 18 targeted cases passed during integration;4 final workspace cases pass after
  the last fixes. Supported sizes include1024×768,1280×720,1440×900,1920×1080.
- Tests cover one/20club histories, page/region scroll dimensions, full sticker
  attributes, wide league/cup dialogs, stationary recap art, negotiation callbacks,
  filter visibility, list space, offer-row height and the search input border.
- ESLint, TypeScript, production build and whitespace checks pass.
- Hallmark rendered sweep:0 FAIL,23 WARN,471 WAIVED. Gate71 is a recorded exception
  for compact game-panel headings paired with current-step metadata. Existing
  legacy warnings remain in the log; no zero-warning claim is made.
- Independent finish review found the short-height sticker regression. It was
  fixed, recaptured and scored resolved; no finding remains open from that review.

Evidence: `output/playwright/career-workspace-*.log`,16 screenshots named
`{career,result,recap,offers,search}-final-{1440,1024,1280}.png` and `cup-final-1440.png`.
The earlier suite used shared components on preview routes. That missed a CSS
delivery defect on protected routes; the authenticated follow-up below closes
that gap. Real transfer acceptance/purchase mutations remain outside this UI check.

## New files

```text
app/styles/features/career-workspace.css
features/wheel/components/TransferClubRows.tsx
app/dev/career-workspace/
├── page.tsx
└── CareerWorkspacePreview.tsx
tests/e2e/career-workspace.spec.ts
tests/e2e/authenticated-workspace.spec.ts
tests/middleware-csp.test.ts
docs/Career_Workspace_Revision.md
```

Existing components, the transfer preview and design rules were updated in place.
No dependencies need installing. Preview routes remain unavailable in production.

## Authenticated follow-up

The protected page loaded a different CSS chunk from the preview: the markup
contained the new classes, but its stylesheet lacked the workspace rules even
after an ordinary reload. `app/layout.tsx` now imports `career-workspace.css`
directly, after `globals.css`; its nested CSS import was removed.

An isolated QA account signed in through the actual login form. Its real career
ran through league and cup wheels, the season recap, stat development and entry
to the transfer route. Screenshots `auth-{career,league,cup,recap,search}-chromium.png`
record the actual protected UI. The recap image kept exactly the same bounds
while its information column scrolled186px. Transfer root/list dimensions were
900px/392px; the page did not scroll. Browser errors were checked throughout.

The opt-in authenticated regression checks Chromium and Firefox at1440×900,
1280×720 and1024×768, including direct navigation, reload, all six sticker
attributes, independent list scroll and fixed filters. It reads credentials from
the ignored file specified by `RTG_AUTH_FIXTURE_PATH`; it skips without that
explicit fixture. No credentials or session cookies belong in tracked files.

Firefox also exposed the dev CSP rejecting React RSC debug evaluation. Only the
development policy now permits eval. `tests/middleware-csp.test.ts` executes the
production middleware and verifies eval stays blocked, HTTPS redirect and
security headers. No game services or auth ownership checks changed.

Fresh independent visual review of the five authenticated captures: `ship`,
no open visual findings. Final logs use the prefix `actual-route-` in
`output/playwright/`. The QA career generated zero inbound offers, so populated
offer layout/negotiation remains covered by the existing shared-component test.

Final follow-up:6/6 E2E cases pass, with zero captured browser errors; ESLint,
TypeScript, production build and production CSP checks pass. The Hallmark sweep
reports0 FAIL,23 WARN,471 WAIVED; warnings are recorded, not presented as absent.

## New handoff player

After the final checks, `Touranne Test 03` was created in the empty LW slot8 of
The Touranne for `mynameisdungz`. It starts at35, retires at36 and resumes at the
league-standing wheel. The normal season-start command and owner-scoped progress
query verify its state. Existing test players were preserved. Earlier seasons
are skipped explicitly as test-fixture history, not claimed as simulated seasons.

Open: http://localhost:3000/classic/8aab84ff-b7ed-4f04-9f8b-f5440b3f512f/draft/8

Local fixture records: `output/playwright/touranne-test03-{before,player}.json`.
The browser verification used the separate QA account; the new user-owned
fixture was verified through the owner-scoped service, without taking over
the user's browser or changing account credentials.

## Previous test player

`Touranne Test 02` uses the vacant RW slot10 in The Touranne. The previous test
player is preserved. The fixture starts at35 and retires at36; earlier seasons
are explicitly skipped and recorded as fixture creation in the event log.
Identity, ownership and empty-slot assertions guard insertion; the regular
season-start service and owner-scoped progress query verify the resume state.
Local before-state/result records are in ignored `output/playwright/touranne-test02-*.json`.
