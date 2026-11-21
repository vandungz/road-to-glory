# Contextual onboarding and feature help

## Scope and behavior

- Existing Football Life colours, typography, page layouts, tooltip and icon-button primitives are preserved. No game logic, odds, server action, database schema or career state is changed.
- Each feature registers the view actually rendered, rather than matching a URL or running a scripted gameplay sequence. First visits explain one part at a time after a short quiet interval. The player can skip, press Escape, use the page immediately, or read the complete page introduction/help in a modal through the header `?`.
- A gameplay action ends the open explanation without consuming that action. Automatic discovery does not move keyboard focus; the on-demand reading modal uses the shared Modal focus trap and returns focus when closed. Arrow-key interaction in the game's own tabs remains available.
- Busy/spinning states, another modal, hidden browser tabs, the desktop gate and navigation cancel or defer discovery. Every configured anchor must be available before a guide starts. Missing/removed elements never force a disconnected popover. Tours never click, submit, spin, change tabs, buy items or progress a season for the player.
- Header help is available across the signed-in lobby, Classic lobby/squad, player setup/draft, career, retirement, transfer/negotiation/shop, Quick setup/play/summary, PvE lobby/tournament, profile and settings. The compatible Ballon d’Or result route has on-demand help too. Privacy and Terms have on-demand orientation only. Landing and authentication flows have no tour or help control.
- Inline coach marks in transfer, wage negotiation and shop use the same copy as tours. The existing nationality/name-dice tooltip remains. Small help controls use hover and keyboard focus, with an accessible description; there are no flashing beacons or forced task checklists.

## Library decision

Checked official documentation and installed package metadata on 21/11/2026:

| Option | Assessment for this project |
| --- | --- |
| Driver.js 1.14.0 | Selected. MIT, no runtime package dependencies, explicit page-interactive mode, focus control, lifecycle hooks and DOM highlights. Fits existing client components without replacing game state ownership. |
| React Joyride 3.2.0 | Supports React 19 and custom React UI. Viable, but its installed-package metadata lists ten direct dependencies; the additional React control layer is unnecessary for these short informational tours. |
| Shepherd | Viable UI toolkit; its licensing requires a separate review for future use. No advantage here that justifies that additional decision. |
| Custom positioning/spotlight | Avoids a dependency, but requires owning clipping, nested scrolling, positioning, focus and lifecycle edge cases. Not the smallest complete implementation. |

Sources: [Driver configuration](https://driverjs.com/docs/configuration),
[Driver installation](https://driverjs.com/docs/installation),
[Joyride props](https://react-joyride.com/docs/props),
[Joyride package](https://github.com/gilbarbara/react-joyride/blob/main/package.json),
[Shepherd installation/licensing](https://docs.shepherdjs.dev/guides/install/).

Driver JavaScript is dynamically imported when help starts. Measured installed artifacts: 46,994 bytes of JS (15,133 gzip); base CSS 7,539 bytes (1,917 gzip). These are library-file sizes, not whole-page transfer sizes. Base CSS and the small branded stylesheet join existing app styles. No hosted onboarding service or per-user API calls are added.

## Configuration and maintenance

```text
features/onboarding/
  guides.ts            # guide IDs, versions, ordered stable anchors
  guide-storage.ts     # seen-on-this-browser flags; in-tab fallback
  GuideProvider.tsx    # one lifecycle controller and PageGuide registration
  HelpButton.tsx       # header button opening the reading modal
  PageHelpModal.tsx    # complete introduction/help from the same guide copy
  CoachMark.tsx        # inline tooltip using tour copy
i18n/messages/{vi,en}.json: onboarding
app/styles/features/onboarding.css
scripts/onboarding-config-check.ts
tests/e2e/onboarding.spec.ts
```

To change a screen:

1. Keep/add `data-guide="feature-control"` on the real UI element; use descriptive IDs, not CSS classes or positional selectors.
2. Update that guide's ordered `targets` in `guides.ts` and both `onboarding.steps` dictionaries. A `CoachMark` can reuse any typed target.
3. Register `<PageGuide id="..." paused={isBusy} />` inside the rendered feature, or use the shared AppShell `guide` prop for static pages. Do not register a loading skeleton or multiple simultaneous features.
4. Bump only that guide's `version` when existing players should see materially new guidance. Ordinary layout moves need no version bump if anchors remain meaningful. Use `auto: false` for reference-only pages.
5. Run the configuration check before browser tests; then verify every step at supported desktop sizes and the existing affected feature tests. A missing translated step/anchor fails the configuration check.

## Storage and limitations

- Key format: `football-life:guide:<id>:v<version>`, value `seen`. It records that an explanation appeared, including when skipped; it does not claim tutorial completion or gameplay progress.
- Flags are local to this browser, shared by accounts using it, and not synced between devices. They contain no email, account identifier or career data. Clearing browser storage makes automatic discovery eligible again.
- If storage is blocked, a memory fallback suppresses repeats in the current tab. Reloading without usable storage can show guidance again. On-demand help always remains available.
- Test fixtures are development-only and isolated. No existing account/player is reset for this work. Deployment and manual testing on the live authenticated service are separate from local verification.

## Verification record

- Configuration/storage gate passed before the first browser integration. The initial browser gate found a focus-return issue; it was fixed and passed before rollout to the other features.
- Inventory: 19 guide contexts, 45 bilingual anchors. The compatible award page is reference-only. Each context has a browser walkthrough test.
- The visual review caught primary-action coverage at 1024px. Compact tooltip sizing now clears the spin button, and the browser test asserts non-overlap. Removed a redundant coach mark beside career tabs to preserve their width.
- Capture timing is explicit: verify opacity 1 and completed entrance animation before inspecting a tour surface. Settled screenshots use unique filenames to avoid concurrent test overwrites. Independent Hallmark finish review: ship; rendered panel is opaque and spin remains reachable.
- Existing modal geometry tests now wait for the shared entrance animation before comparing stationary regions. Their exact geometry assertions remain intact.
- Full Quick career regression caught an overly broad spotlight covering the spin action. Quick guidance now anchors to the stationary disc container via a forwarded `data-guide` attribute, without changing wheel timing, resolver or rendered geometry. The guide checks non-overlap at every Quick step; a full career with normal animation passed, including summary reload and replay (2.8 minutes).
- Final checks: `pnpm check:onboarding`, TypeScript, lint and whitespace checks passed. All 20 onboarding tests and four transfer-filter tests passed together; all six career-workspace tests passed in the focused rerun. The remaining selected account/settings, Classic scroll, navigation and Quick regressions passed in the broad run; its six initial findings were fixed or isolated to captures/dev refresh and rechecked in focused runs. No assertions were weakened and no live game data was mutated.
- Hallmark render sweep: zero FAIL/WARN, with one documented waiver for pre-existing career heading spacing. Unique settled captures passed independent review.
- Production build passed. A production-server browser smoke test verified first-run help, unrestricted typing, skip/replay, focus return and saved dismissal on `/quick`. `/quick`, `/privacy` and `/terms` returned 200; `/dev/onboarding` was blocked by the existing production middleware (307 to home, no fixture rendered). The page also has its own production not-found guard. No production deployment is performed by this task.

## Follow-up: on-demand help is a reading modal

- The header Help button opens one shared, scrollable introduction/help modal for the current page. It does not restart Driver.js or require highlight targets to be visible. There are no next/back tour controls in the modal.
- Content uses all configured guide descriptions in their existing order, in the selected language. Closing uses the shared close button, Escape, backdrop or the footer action; navigation/context changes discard the modal's local open state.
- Opening Help stops any active/pending automatic tour and marks the page's explanation seen, preventing an automatic spotlight immediately after closing. First-visit spotlight tours and inline coach marks otherwise keep their behavior.
- The automatic tour controller no longer exposes a manual replay path. On-demand help also works if the tour chunk is unavailable.
- Follow-up verification: 21 onboarding E2E tests, configuration checks, TypeScript, ESLint and production build passed. Shared help modal was visually inspected after its entrance settled; one dialog, five career sections and zero active spotlights. Render sweep: zero FAIL/WARN, two documented waivers for shared control states and existing heading spacing. Not deployed.

## In-game header language control

- Shared AppShell and WheelGameHeader now include the same Globe plus target-language code presentation as the landing page. HeaderLanguageButton reuses browser-locale persistence and refreshes server translations without reloading the document.
- Current form state, selected career tab and Quick session are preserved. Busy wheel/feature states and an in-flight language refresh disable the control.
- header-language.spec.ts passed three browser checks: unsaved Quick/Classic details, actual Quick spin progression and locale persistence, selected career tab, shared header coverage and desktop bounds. No new dependency or deployment configuration is required.

## Header visual consistency

- Header utilities now use a flat 40px control rhythm with 18px icons. Language and Help form one group; homepage account actions sit beyond a restrained divider. The homepage Help action has a short visible label, while game headers retain compact icons.
- Language no longer borrows the landing page's outlined pill class. Hover, focus, pressed and disabled states use existing tokens; game and account functionality are preserved.
- Four header/language E2E checks passed, including control height/centre alignment and the language/Help actions. The final spacing refinement passed a focused geometry rerun. Independent component finish review: ship at 1024/1280/1920px.
- Header polish checks: TypeScript, ESLint, production build and whitespace checks passed. Hallmark render sweep: zero FAIL/REFLEX/WARN. No deployment performed.
