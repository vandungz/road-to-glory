# Contract experience revision

## Approved direction and implementation

The user approved one contract CTA in the center column and a read-only contract
tab at right. Step5 now shows “Quyết định mùa tới”, one sentence and “Xem lựa chọn
hợp đồng”. The transfer phase no longer renders the season-results table.
The end-of-season recap and the final-career flow remain available.

## Source inventory of dropdowns

The audit searched actual JSX/native select tags, combobox/listbox/menu roles,
dropdown names and wrapper imports in app/components/features, excluding generated
code. No native selects or alternative dropdown implementations remain in
production source; only FilterSelect declares the combobox/listbox roles.

| Location | Controls | Behavior preserved |
|---|---|---|
| QuickModeSetupScreen | Nationality and position | Existing pool/position values and identity callbacks |
| SeasonProfile | Season | Existing age values, results and modal callbacks |
| PersistentTransferSection | League and prestige | Server search, counts, pagination, reset |
| TransferClubRows | Fee choice | Existing fee option values and quote callbacks |

Country and long season lists use search. Form-specific label styles no longer
turn the shared popup search row into a grid. Names, data pools and game weights
are retained.

## Renewal acceptance

A published server renewal is an offer to accept with fixed terms. Its button
calls the completion path directly with the standard option. It never opens the
wage negotiation UI or performs an additional random acceptance check.

The server still checks owner, season, stage, revision, current club, issued
offer and idempotency. Requests cannot invent a renewal or increase its terms.
Existing accepted renewal quotes can be resumed without a negotiation screen.
A proactive request with no published offer retains its separate existing
eligibility/chance logic. Legacy completion follows the same fixed-acceptance
policy; no legacy-write flag was enabled.

The integration check creates and deletes its own isolated fixture. It makes
crypto.randomInt throw if invoked during completion, verifies acceptance with
the exact server wage/years, checks absent offers/ownership/changed terms, and
replays the command without duplicate revision or wallet credit. It also covers
historical failed wage attempts attached to an otherwise published renewal.

## Negotiation presentation

TransferPageClient and the modal presentation now share TransferNegotiationPanel.
The left column contains concise contract facts, the existing mood/chance values,
radio rows and one submit action. It has no left accent stripe or brown mood
background. The signing scene occupies the right column at a useful scale.
Only the left information area scrolls when needed; the submit button and artwork
stay visible. Existing probabilities and fee/wage services are reused.

The common panel passes the base offer and selected wage option to completion.
This avoids applying the wage multiplier both in the old page click handler and
again inside its legacy completion function.

## New media

- Tool: built-in ImageGen, one asset.
- Final: public/media/editorial/contract-signing.webp
- Dimensions:1254×1254, WebP with alpha; source alpha range0–255.
- Encoded size:600192 bytes.
- Static decorative illustration, not a fictional player's assigned portrait.
- No logo, sponsor, club crest, readable text or elaborate backdrop.
- The original generated PNG remains under the Codex generated-images directory.

Prompt used verbatim:

> Create ONE production website illustration asset, not a UI mockup. Concept: a football player signing a club contract. Match a vintage sports album editorial cutout: finely engraved black pen contours and delicate cross-hatching over realistic hand-painted muted color, tactile print/ink grain, anatomically natural adults, crisp detailed fabric. Three-quarter side view: young adult male footballer in a plain deep navy training top with a small burnt-orange trim leans forward at a simple desk, signing a plain cream sheet with a pen; a club representative in a dark neutral suit sits beside him, calmly indicating the signing spot. Hands and signing gesture must be clearly readable. Include only two people, the necessary desk, paper, pen and simple chairs, with a small plain unbranded football near the desk foot. Composition as one cohesive silhouette, almost square portrait-friendly, tightly framed with complete heads/hands and no clipped body parts, image subjects fill most of canvas, adequate transparent margin. Natural expressive pose, NOT a frontal headshot or camera-facing portrait. Colors primarily navy, cream, black, a restrained rust-orange accent. Background must be genuinely transparent alpha: no stadium, room, wall, rectangle, beige backdrop, fake checkerboard, glow, gradient or elaborate scenery. No logos, club crests, sponsors, flags, brand marks, signatures, typography or readable text anywhere. No 3D, cartoon, flat vector, glossy digital-painting effects. Keep physical objects and anatomy believable; no duplicated fingers. The visual will be used LARGE in a right-hand desktop web column on warm off-white paper.

## Verification and limits

Final full suite:48/48 E2E passed, including the complete guest career,
reload/restart and the authenticated Chromium/Firefox layout matrix.
Production build, TypeScript, ESLint and the renewal/transfer domain checks pass.

Final results are recorded in output/playwright/contract-full-e2e-final.log,
contract-build-final.log, contract-types-final.log, contract-lint-final.log,
contract-renewal-integration.log and the authority/workflow/result logs.
Hallmark sweep:0 FAIL,24 WARN,470 WAIVED. The additional measure warning for
the36ch one-sentence contract hint is accepted as compact UI guidance; the
other warnings are inherited and recorded.
Fresh finish review found one Quick Mode search-layout inheritance issue; the
shared component was fixed and recaptured, scored resolved.

The initial full run passed47 cases and failed the Firefox login setup because
of a dev RSC “Error in input stream” during hard navigation after authentication.
This is retained in contract-full-e2e-initial.log. Layout tests now support
storageStatePath in their explicit private QA fixture, reusing the real session
previously produced by the normal login UI. The authenticated route guards,
direct navigation/reload and all runtime-error assertions remain active.
That setup change isolates the layout tests; it does not claim to fix the
separate Firefox development-login stream issue.

Browser work used isolated headless contexts, never the user's game monitor.
Validation is local; nothing was deployed. Renewal integration uses disposable
test data. No existing user credentials or player records were modified.

## New files

```text
D:/road-to-glory/
├── features/wheel/components/TransferNegotiationPanel.tsx
├── app/styles/features/contract-negotiation.css
├── public/media/editorial/contract-signing.webp
├── scripts/renewal-acceptance-check.ts
├── tests/e2e/contract-experience.spec.ts
└── docs/Contract_Experience_Revision.md
```

Existing callers, dropdown implementations, tests, media dimensions and the root
CSS imports were updated in place. No dependency installation is needed.
Re-run the server check with pnpm check:renewal-acceptance.
