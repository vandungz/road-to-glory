# Classic: confirmations, player setup and Ballon d’Or

Updated: 19/11/2026. Implementation is local; deployment is not part of this task.

## Shared controls

- Source scan of app/components/features found two native `window.confirm` calls: replacing/removing a squad player and finalizing a squad. Both now use `components/ui/ConfirmDialog.tsx`, built on the shared Modal and Button. PvE replay uses the same confirmation component.
- Confirmations retain the specific destructive-action copy. Cancel/Escape/backdrop do not send mutations. Pending actions disable confirmation/cancel/close; failures remain in the dialog for retry. The player archive swaps to the confirmation instead of mounting two focus traps together.
- The slot position is a readonly shared Input. Profile submission and the draft screen use the selected slot position. Career setup also checks the formation/slot on the server before issuing a setup token; the signed token continues to own the saved position.
- The Shuffle button inside the name field reuses the existing nationality name pools. Choose a nationality first. Name generation runs synchronously in the browser and makes no server request.

## Ballon d’Or

- Nomination and final ranking use the same modal component. The final result contains existing trophy art, a separately scrollable ten-place ranking and a stationary continue button. There is no result-page redirect or intermediate navigation loading dialog in the new flow. Closing continues from the already committed development step.
- The previous result route remains available for compatibility and displays saved player names rather than shirt-number placeholders.
- UI placement and persistence share `placeBallonDorPlayer`: the server-resolved career-player rank is inserted into the saved rival order. The wheel remains authoritative. This change does not change the player's nomination/rank probability formula.
- Ballon d’Or now has a separate worldwide candidate source. Production reads tier-one clubs and their league prestige from the DB in both the authoritative season-stats service and the legacy simulation action. League honours continue to use only the current league's candidates.
- Rival candidates use the existing synthetic-player simulator per league. Relative selection weight is `clubPrestige² × leaguePrestige² × (seasonScore / 100)³`; the final weighted draw normalizes these weights to probabilities. Season score uses rating, goals, assists, team success and OVR. This is a game model, not a claim about real football probabilities.
- Draw ten rivals without repeating generated identities/names, with up to four per league and two per club; the final wheel places the career player alongside nine rivals. Saved model version is `awards-v6`. No additional visible weighting badges or explanations are added to gameplay.
- Already simulated seasons retain their saved candidate snapshots; no automatic migration or reroll of historical awards occurs. The worldwide roster applies when season statistics are newly simulated.

## Verification

- TypeScript, ESLint and production build passed.
- Existing Ballon d’Or logic, awards simulation, awards persistence, checkpoint and season-record hydration checks passed. Persistence integration used a rolled-back transaction.
- `check:global-ballon`: 30 reproducible roster draws covered 24 leagues, with mean selected league prestige 4.30. Checked tier-one membership, unique identities/names, league/club limits, prestige and season-score influence, separation from local honours, every final rank from 1–10 and idempotent placement.
- Browser checks used dev-only fixtures: readonly CM and submitted CM, nationality-based name generation with zero POSTs, replacement cancel, deletion Escape, keyboard focus trapping, zero browser-native dialogs, ten result entries, and continue without route navigation. Modal/footer bounds verified at 1024×700, 1280×800, 1440×900 and 1920×1080.
- Hallmark render sweep: zero FAIL and zero open REFLEX after fixing the name input. Shared control states and intentionally scrolling ranking rows have documented waivers. The remaining phone warning follows the existing desktop-only game policy. Independent finish review found the unstyled name input; shared Input styling fixed it.
- Dev fixture route returns not-found in production. No manual production session has been completed for this change.

## Follow-up: retired players in incomplete squads

- The squad board already queries only retired careers, and the management action already enforces `isRetired: true` with game ownership. Removed the extra UI restriction on `GameSession.status === completed`; retired players can be replaced/deleted before 11/11. Active careers remain outside this management flow.
- Browser regression: a 6/11 in-progress squad exposes both actions for an archived player; replacement confirmation and Escape cancellation work without sending a mutation.
- Created the explicitly requested `Bomba Ballon Test` in an empty CM slot (zero-based slot 5) of the specified account's `bomba` squad. Two pre-existing retired players remain unchanged. The fixture stops before `ballon_dor_nomination`, with 90/10 nomination weights and the newly generated worldwide award snapshot. Conditional ranking weights are `[21,14,10,8,7,6,7,8,9,10]`.
- `scripts/prepare-ballon-manual-case.ts` requires explicit account/squad arguments; default mode only inspects. `--apply` creates a new player only in an empty CM slot, rechecks ownership/session state inside a transaction, and refuses to overwrite existing careers. Repeating it reports the existing fixture without resetting progress. The fixture-specific 90% override lives in stored test data, not the production weight formula. No migration, public fixture endpoint or shared-account changes were introduced.
- Read-back confirmed the stored nomination weight in both runtime and season result. The fixture was left unspun at creation; subsequent user screenshots show the completed Ballon d’Or result. The script does not rewind that progress. 90% nomination is not a guaranteed nomination or a 90% chance of first place.

## Follow-up: candidate labels and modal transitions

- Supersedes the earlier rival-name presentation: other Ballon d’Or candidates now display position plus the existing role/shirt number (for example `CM Số 8`); only the career player keeps their name. The modal and compatible result route use the same convention. Saved candidates, prestige sampling and probabilities are unchanged.
- The archive and replace/delete confirmation now share a single mounted Modal. Switching views replaces only the panel; its backdrop remains mounted. Scroll locking and final focus restoration are separated from view-specific focus trapping, so changing the panel does not unlock the body or restore focus behind it.
- All shared Modal entrances now use opacity plus a restrained vertical/scale transition over 220ms; first-open scrim fades over 180ms. Switching archive/confirmation does not restart the scrim. System/account reduced-motion policies still disable these animations. No width/height interpolation or backdrop-filter animation is added.
- Position is disabled and removed from Tab order. Random name uses Dices in a 32px button inset inside the field. The shared Tooltip displays the choose-nationality explanation on hover or keyboard focus when generation is disabled; enabled generation retains its action label and stays synchronous.
- Browser assertions verified stable overlay identity in both directions, one backdrop, continuous body scroll lock, keyboard focus trapping/final restoration, reduced-motion duration `0s`, disabled position refusing focus, tooltip access, the dice button staying within field borders, and anonymized rival labels with the career player's name retained. TypeScript and lint passed; award persistence/global-candidate regression checks passed.

## Follow-up: compact Top 10 and prestige calibration (awards-v7)

- Supersedes the earlier label/layout: rivals display `ST #9`; the career player displays their name and club without position. Compact two-column rows keep all ten places visible at tested desktop heights of 800px and above. Shorter viewports scroll only the ranking; the continue action remains visible. Trophy and result use the existing visual system.
- Corrected the season input to pass actual league prestige independently from club prestige. Both authoritative season statistics and the legacy simulation action now read league prestige from the database. Player nomination/rank wheel formulas are otherwise unchanged.
- Every eligible tier-one club now receives the same set of twelve synthetic positions before worldwide sampling. Previously, fixed per-league candidate counts correlated club order with positions and omitted strong attacking candidates from some leading clubs. Identity uses candidate keys; fake-name collisions no longer exclude unrelated candidates from other leagues.
- Worldwide rival selection weight is now `clubPrestige^5 × leaguePrestige^4 × clamp((seasonScore / 100)^2, 0.5, 2)`. Prestige is bounded to 1–5. Sampling remains random without replacement, with at most four rivals per league and two per club.
- Final Ballon d’Or ordering also accounts for context: the existing performance score is multiplied by `0.55 + 0.45 × ((0.35 × clubPrestige + 0.65 × leaguePrestige) - 1) / 4`. This factor ranges from 0.55 to 1 and is applied to the career player and rivals; the resolved wheel rank still determines the career player's final placement. This is game balancing, not an estimate of actual award probabilities.
- Reproducible checks over 100 roster draws (1,000 rivals): mean league/club prestige 4.81/4.40; 861 candidates had both prestige values at least 4; 19 had both at most 3. In 30 complete award simulations, 29 leading rivals belonged to the strong group and none to the weak group. Checks also cover eligibility, position coverage, unique identities, caps, local-honour separation and all ten player placements.
- TypeScript, lint, production build, awards/Ballon d’Or, persistence and checkpoint checks passed. Browser checks covered winner/runner-up states at 1024×700, 1280×800, 1440×900 and 1920×1080. Hallmark render sweep: zero FAIL/REFLEX/WARN; independent finish review: ship.
- The saved model is `awards-v7`. Existing season snapshots and the user's progressed Bomba fixture are not reset or rerolled. Newly simulated seasons use the revised model. Production deployment/manual verification remains outside this local change.

## Manual UI fixture refreshed: 20/11/2026

- Created `Bomba Ballon UI Test` in the empty CM slot 6 of the same `bomba` squad. The progressed original test player and the other careers remain intact.
- The script's explicit `--ui-case` option uses a distinct fixture name and 100% nomination only for that stored test case, so the next two spins reach the Top 10 modal. Ranking weights remain `[21,14,10,8,7,6,7,8,9,10]`; first place is not guaranteed.
- Created a fresh `awards-v7` worldwide snapshot using the revised prestige model. Read-back verified the stored nomination weight and runtime rank weights. TypeScript and whitespace checks passed. The fixture is left at `ballon_dor_nomination` for the user to spin.
- Open `/classic/8615a82e-7db2-4f86-94ea-64bc9014f3c4/draft/6`. Viewing the revised design on a deployed URL still requires deploying the local UI changes.
