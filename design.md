# Design: Football Life / Road to Glory

The shared system for every screen. Preserve game behavior, routes, actions,
data, field names and component contracts when changing presentation.

## Direction
- Sports collectible album, contemporary controls. Use the same identity for the guest introduction and game screens.
- Keep warm paper, orange identity, Oswald display typography and existing layouts.
- Reference: bold sports colour blocks, rounded controls, collectible player cards.
- Signature: player identity cards with nationality colours and large real ratings.
- No stock athlete photos for fictional players; use actual name, flag and rating.

## Tokens
- Source: `app/styles/foundation/tokens.css`; nationality themes live in
  `app/styles/foundation/nation-themes.css`.
- `--football-paper`, `--football-surface`, `--football-sunken`: canvas hierarchy.
- `--football-ink`, `--football-ink-2`, `--football-ink-3`: readable text hierarchy.
- `--football-accent` remains orange. `--football-accent-ink` is the readable action fill.
- Positive, negative, warning and honour tokens retain their semantic meanings.
- `--nation-primary`, `--nation-secondary`, `--nation-paper`, `--nation-ink`:
  cosmetic identity only. Never alter weights, rarity, stats or results.
- Unknown nationality uses neutral brand tokens. Never guess a flag from a name.
- Use existing token aliases rather than literal colours or font families.

## Typography and rhythm
- Oswald for display and major numbers; Be Vietnam Pro for body, controls and labels.
- Body 16px; compact app metadata 12–14px; headings 24–56px.
- Labels are sentence case without tracking. Football abbreviations remain unchanged.
- Use tabular numerals for stats. Wrap long names; do not clip primary actions.
- Spacing: 4, 8, 12, 16, 24, 32, 48px. Centred desktop canvas capped at 1440px.
- Outer panels 20px radius, inner surfaces 12px, controls 999px. Data tables stay flat.

## Components and states
- Reuse Button, IconButton, Modal, Tabs, Field, Badge and AppShell.
- One orange filled primary style; secondary outlined; quiet controls transparent.
- Preserve disabled/loading behavior and error messages. Focus ring appears instantly.
- National colour is an identity treatment, never the sole indicator of a result.
- Motion communicates state; reduced-motion disables decoration and wheel rotation,
  preserving the existing spin callback timing and authoritative outcome.
- Keep content visible without animation initialization; no width/height transitions.

## Motion and loading
- Render the page, controls, focus rings and disclosures immediately. Use the
  shared motion tokens for control feedback and portrait opacity. Use page and
  dialog fades at 180–220 ms. Use a 180 ms reveal for a new wheel stage or
  a disclosure. Keep the wheel and player portrait mounted across these changes.
- Use `Button loading` for the action that started a request. Disable it
  immediately. Keep its label and footprint, with a delayed activity line.
- Use `LoadingState` for inline work and `RouteLoading` for initial navigation
  or restoration. Match its static placeholder to the destination: records, wheel
  workspace or match. Keep the status near the page heading. Never show fake scores
  or progress percentages. Reuse `ActivityLine` for the single indeterminate signal.
- Keep existing records visible while refreshing. Mark the region busy, disable
  stale result actions, and offer a retry when a request fails. Debounce typing
  only. A completed request can display its result immediately.
- System and account reduced motion share the same CSS policy. Game sequences
  use the existing motion preference hook. Keep wheel outcomes authoritative.

## Desktop policy
- Gameplay starts at 1024 CSS pixels. Narrower windows show a localized
  desktop-required screen on game, account, and auth routes, including direct links.
- The guest introduction at `/` scrolls from an illustrated hero through actual
  gameplay, career milestones, mode choices, updates and FAQs, then repeats the Quick Mode action.
  The header provides section links and the language switch. Footer links point to
  available sections, with plain text for upcoming community and policy pages.
  Each section reveals once when it enters the viewport and stays visible with
  reduced motion or scripting off. Below-the-fold art reserves its space and
  loads a responsive source near the viewport. The muted trailer loops in view without
  playback controls and shows its poster with reduced motion. Show the desktop
  requirement below 1024px and game links at playable widths.
- Signed-in players reach the existing lobby at `/`.
- The CSS gate retains mounted state when resizing, including an in-flight wheel.
- It is a presentation policy, not an authorization boundary. Auth remains unchanged.
- At 1024/1280/1440/1920, allow vertical scrolling instead of hiding controls.

## Verification
- Run typecheck, lint, production build and existing domain regression checks.
- `pnpm test:e2e` runs browser checks; isolated dev fixtures never write game data.
- Verify keyboard focus, modal close/restore, reduced motion, long names, all themes,
  narrow-screen gate, overflow and console errors. Keep screenshots under `output/playwright`.
- New designs must follow this file; amend the system deliberately instead of local overrides.


## Editorial media

- Use the same fictional player face throughout a career. Portraits use a 4:5 grayscale master tinted by the existing nationality tokens.
- Play the animated default pose on active cards. In Classic, show reactions only on Panini. Wait for the result dialog to close, show one reaction after the stat changes are committed, and play a confirmed transfer reaction on return to the career. Keep the idle video mounted beneath the reaction. Let the current reaction finish while the next wheel runs, then play any queued reaction. Frame the eyes and mouth, and announce the result to assistive technology without overlaying the face with a label.
- Show the matching default frame with reduced motion, unavailable playback, and archive cards. Load video only for a visible portrait in an active tab.
- Use `EditorialArt` for the supplied action imagery; assets live under
  `public/media/editorial`. Preserve original poses and restrained kit colours.
- Treat real athletes as editorial decoration, never generated-player identity.
- Keep original 800×1000 masters; display alpha-trimmed WebP derivatives with their actual intrinsic dimensions. Contain rather than crop feet, hands or ball.
- Strip background clutter, crests, sponsors, logos and lettering in source edits.
- No ornamental media inside error toasts, purchase/confirmation dialogs or stats.
- Keep primary actions visible; verify actual image dimensions and desktop bounds.
- Do not label a still-image camera transform as natural AI video motion.

- Home, Quick and auth can use image-led entry compositions. Classic, PvE and
  retirement are record screens: compact text/action headers, then data with a
  bounded image rail. Never make records wait below a decorative hero.
- Never put a multi-player scene into a short full-width strip or a tiny corner.
- Keep header copy together; align the art beside it, with controlled gaps.
- Visual verification must inspect rendered subjects, not only image element bounds.

- For management/archive screens, keep records directly below the header and art
  beside them. Use a proportional list/art split (about62/38), not a fixed240px
  scene column. Retirement retains a flexible archive and its separate player card.
- Multi-player scenes need at least320px painted width at1024 and440px at1440;
  the recap scene needs at least390px. Measure contain-fit paint after padding,
  rather than counting the image element's empty letterbox as useful picture.
- Single figures use distinct scale rules: home400px slot, Quick500px, Classic480px,
  retirement500px. Auth uses a focused two-player action derivative sized to the
  remaining viewport height, never a fixed height that pushes the form offscreen.
  Keep whole bodies and do not trade legible records for a decorative image size.
- Verify populated fixtures (six squads, seven club stints), empty and one-session
  states. Preview wrappers must fill the same canvas as production, not shrink-wrap.

## Compact entry and media surfaces
- Login, registration and recovery fit one desktop viewport at 1024×768,
  1280×720, 1280×800, 1440×900 and 1920×1080. Verify both page and form scroll
  dimensions, plus control bounds; hiding overflow is not proof of a fit.
- Auth introduction: one heading and one factual sentence. No invented career
  examples, decorative statistics, ticker or replay control beside the form.
- Editorial rails are transparent. Preserve the artwork's size and alpha edges;
  do not put a beige or brown card behind a cutout.
- Leave 24px between a section divider and the records/media below it.
- Explain decisions, eligibility and outcomes in concise Vietnamese. Remove
  redundant headings, promotional filler and implementation details from play UI.
- Classic lobby fits the desktop viewport. Keep the header, active squad,
  archive heading and artwork stationary; only archive rows scroll. The archive
  must accept keyboard focus and reveal the final row without scrolling the page.
- Active career uses the viewport below its header, without the five-stage bar.
  All three columns fill the workspace even with one club. Club history and the
  dossier scroll internally; stickers must not shrink and clip attribute values.
- Season recap keeps its whole illustration stationary and scrolls only the
  information column. Competition dialogs use a wider summary/details split.
- Transfer uses aligned club rows with comparable fee, wage, term and appearances.
  Keep tabs, search and footer action available while only result lists scroll.
  At short desktop heights, omit the nonessential copyright footer to keep useful
  list space; do not hide contract facts or decisions.
- Import the career workspace stylesheet directly from the root layout. Verify
  authenticated routes by direct navigation and ordinary reload, including
  computed styles and scroll bounds; preview routes alone cannot prove delivery.

## Search and filters
- Use `components/ui/FilterSelect.tsx` for single-choice dropdowns in filters and
  form fields. Long option lists
  enable `searchable`; keep menus at most360px tall with internal scrolling.
- Menu labels stay short; put explanations in each option's `description`.
  Selection uses the existing option value and controlled `onChange` callback.
- Use `SearchField` for text search. One wrapper owns the border/focus ring;
  do not add a second border, outline or shadow to its inner input.
- Filters work with Arrow keys, Home/End, Enter and Escape, return focus to
  their trigger after selection, and close when their source list scrolls.
- Keep one divider between the overview and tabs. Rows divide siblings;
  the final row has no bottom border beside the footer's own divider.
- Transfer players are always available for offers. Do not restore a willingness
  checkbox. Historical request fields remain accepted but normalize to true.

## Contract decisions
- Step5 is a next-season decision. Keep one contract CTA in the center column;
  the contract dossier stays read-only. Season results belong to the existing
  recap/profile views, not the transfer-entry panel.
- A server-issued renewal is accepted at its quoted terms without another roll
  or wage-selection screen. Preserve ownership, stage, revision and replay checks.
- Transfer negotiation uses the shared TransferNegotiationPanel. Use flat wage
  rows with complete quotes/chances, a plain mood track and one submit action.
- Keep the signing scene large in the right column, contained and transparent.
  It is decorative and never represents the created player's personal portrait.
  Short viewports scroll left-hand information while preserving the submit action.

## Language and account controls

- Offer Tiếng Việt and English in Settings. Keep the preference per browser and update the document language.
- Add user-facing copy to both message catalogs. Use one message for a sentence with variables, counts or names. Keep OVR, position codes, Classic, Quick Mode, League Phase, Ballon d’Or and official competition names.
- Use gameplay identifiers and numeric values for decisions. Format them when displaying the result. Preserve historical data when an older format cannot be read.
- Put Profile, Settings and Sign out in the homepage header. Gameplay headers show game context and navigation.
